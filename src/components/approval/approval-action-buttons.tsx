"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { processDocApproval, withdrawDocApproval } from "@/actions/doc-approval-actions";

interface Props {
  approvalId: string;
  moduleKey: string;
  status: string;
  currentUserId: string;
  isSubmitter: boolean;
  steps: { approverId: string; status: string }[];
}

export function ApprovalActionButtons({ approvalId, moduleKey, status, currentUserId, isSubmitter, steps }: Props) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const canApprove = steps.some((s) => s.approverId === currentUserId && s.status === "PENDING");
  const canWithdraw = isSubmitter && ["REQUESTED", "IN_PROGRESS"].includes(status);

  if (!canApprove && !canWithdraw) return null;

  const handleProcess = async (action: "APPROVED" | "REJECTED") => {
    if (action === "REJECTED" && !comment.trim()) {
      toast.error("반려 시 의견을 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      await processDocApproval(approvalId, action, comment || undefined);
      toast.success(action === "APPROVED" ? "승인되었습니다." : "반려되었습니다.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("결재를 회수하시겠습니까?")) return;
    setLoading(true);
    try {
      await withdrawDocApproval(approvalId);
      toast.success("결재가 회수되었습니다.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "회수에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {canApprove && (
            <>
              <Input placeholder="의견을 입력하세요 (반려 시 필수)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => handleProcess("APPROVED")} disabled={loading} className="flex-1">승인</Button>
                <Button variant="destructive" onClick={() => handleProcess("REJECTED")} disabled={loading} className="flex-1">반려</Button>
              </div>
            </>
          )}
          {canWithdraw && (
            <Button variant="outline" onClick={handleWithdraw} disabled={loading} className="w-full">결재 회수</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
