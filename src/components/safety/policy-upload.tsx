"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface PolicyUploadProps {
  accept?: string;
  label?: string;
  variant?: "outline" | "default" | "ghost";
  size?: "default" | "sm" | "icon";
  disabled?: boolean;
  siteCode?: string;
  year?: number;
  category?: string;
}

const DEFAULT_ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx";

export function PolicyUpload({
  accept = DEFAULT_ACCEPT,
  label = "파일 업로드",
  variant = "outline",
  size = "default",
  disabled = false,
  siteCode = "ALL",
  year,
  category = "POLICY",
}: PolicyUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteCode", siteCode);
      formData.append("category", category);
      if (year) formData.append("year", String(year));

      const res = await fetch("/api/safety/policy/upload", {
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
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
      <Button
        variant={variant}
        size={size}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
      >
        <Upload
          className={`h-4 w-4 ${uploading ? "animate-pulse" : ""} ${label ? "mr-2" : ""}`}
        />
        {label}
      </Button>
    </>
  );
}
