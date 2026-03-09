"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  archiveDocument2,
  restoreDocument2,
} from "@/actions/document-actions";

export function DocumentArchiveButton({
  documentId,
  isArchived,
  originalName,
}: {
  documentId: string;
  isArchived: boolean;
  originalName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isArchived) {
        await restoreDocument2(documentId);
        toast.success("문서가 복원되었습니다.");
      } else {
        await archiveDocument2(documentId);
        toast.success("문서가 보관되었습니다.");
      }
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "처리에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs"
      onClick={handleAction}
      disabled={loading}
    >
      {isArchived ? (
        <>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> 복원
        </>
      ) : (
        <>
          <Archive className="mr-1 h-3.5 w-3.5" /> 보관
        </>
      )}
    </Button>
  );
}
