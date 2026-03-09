"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDocument2 } from "@/actions/document-actions";

export function DocumentDeleteDialog({
  documentId,
  originalName,
}: {
  documentId: string;
  originalName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== originalName) return;
    setLoading(true);
    try {
      await deleteDocument2(documentId, confirmName);
      toast.success("문서가 삭제되었습니다.");
      setOpen(false);
      setConfirmName("");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "삭제에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
        title="영구 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setConfirmName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문서 영구 삭제</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 파일명을 정확히 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="break-all rounded bg-muted p-3 font-mono text-sm">
              {originalName}
            </div>
            <div className="space-y-2">
              <Label>파일명 입력</Label>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="파일명을 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmName !== originalName || loading}
            >
              {loading ? "삭제 중..." : "영구 삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
