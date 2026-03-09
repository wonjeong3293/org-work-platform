"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { setCurrentDocument } from "@/actions/policy-actions";

interface PolicySetCurrentButtonProps {
  documentId: string;
  isCurrent: boolean;
  isArchived: boolean;
}

export function PolicySetCurrentButton({
  documentId,
  isCurrent,
  isArchived,
}: PolicySetCurrentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (isCurrent) {
    return (
      <Badge variant="default" className="gap-1">
        <Check className="h-3 w-3" />
        현재 적용본
      </Badge>
    );
  }

  const handleSetCurrent = async () => {
    setLoading(true);
    try {
      await setCurrentDocument(documentId);
      toast.success("최신본으로 설정되었습니다.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "설정에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSetCurrent}
      disabled={loading || isArchived}
      title={isArchived ? "보관된 문서는 최신본으로 설정할 수 없습니다" : "최신본으로 설정"}
    >
      {loading ? "설정 중..." : "최신본 설정"}
    </Button>
  );
}
