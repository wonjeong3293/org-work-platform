"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface Props {
  moduleKey: string;
  siteCode?: string;
  year?: number;
  disabled?: boolean;
}

export function DocumentUpload({
  moduleKey,
  siteCode = "ALL",
  year,
  disabled = false,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("moduleKey", moduleKey);
      formData.append("siteCode", siteCode);
      if (year) formData.append("year", String(year));

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "업로드에 실패했습니다.");
      }
      toast.success("파일이 업로드되었습니다.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "업로드에 실패했습니다."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
      >
        <Upload
          className={`mr-2 h-4 w-4 ${uploading ? "animate-pulse" : ""}`}
        />
        파일 업로드
      </Button>
    </>
  );
}
