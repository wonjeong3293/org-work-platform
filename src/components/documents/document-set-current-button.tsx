"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { setDocumentCurrent } from "@/actions/document-actions";

export function DocumentSetCurrentButton({
  documentId,
  isCurrent,
  isArchived,
}: {
  documentId: string;
  isCurrent: boolean;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (isCurrent) {
    return (
      <Badge variant="default" className="text-xs">
        최신본
      </Badge>
    );
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      await setDocumentCurrent(documentId);
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
      variant="ghost"
      size="sm"
      className="h-7 text-xs"
      onClick={handleClick}
      disabled={loading || isArchived}
    >
      <Check className="mr-1 h-3.5 w-3.5" /> 설정
    </Button>
  );
}
