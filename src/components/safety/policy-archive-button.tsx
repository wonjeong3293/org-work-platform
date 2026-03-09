"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { archiveDocument, restoreDocument } from "@/actions/policy-actions";

interface PolicyArchiveButtonProps {
  documentId: string;
  isArchived: boolean;
  originalName: string;
}

export function PolicyArchiveButton({
  documentId,
  isArchived,
  originalName,
}: PolicyArchiveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isArchived) {
        await restoreDocument(documentId);
        toast.success("문서가 복원되었습니다.");
      } else {
        await archiveDocument(documentId);
        toast.success(`"${originalName}" 문서가 보관되었습니다.`);
      }
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "작업에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleAction}
      disabled={loading}
      title={isArchived ? "복원" : "보관"}
    >
      {isArchived ? (
        <ArchiveRestore className="h-4 w-4" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
    </Button>
  );
}
