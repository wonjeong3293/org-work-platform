"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { PolicyPreviewButton } from "./policy-preview";

function ClientOnlyText({ value, fallback = "-" }: { value: string; fallback?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? value : fallback}</>;
}

interface PolicyDocument {
  id: string;
  extension: string;
  version: number;
  originalName: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: { name: string; position: string | null };
}

interface ActiveVersionCardProps {
  title: string;
  document: PolicyDocument | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function extensionVariant(ext: string) {
  if (ext === "pdf") return "outline" as const;
  if (ext === "pptx" || ext === "ppt") return "secondary" as const;
  return "default" as const;
}

export function PolicyActiveCard({
  title,
  document: doc,
}: ActiveVersionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {doc ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Badge variant={extensionVariant(doc.extension)}>
                {doc.extension}
              </Badge>
              <span
                className="flex-1 truncate text-sm font-medium"
                title={doc.originalName}
              >
                {doc.originalName}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                {doc.uploadedBy.name}
                {doc.uploadedBy.position && ` (${doc.uploadedBy.position})`}
              </span>
              <span><ClientOnlyText value={formatDate(doc.createdAt)} /></span>
              <span><ClientOnlyText value={formatFileSize(doc.fileSize)} /></span>
            </div>
            <div className="flex gap-2 pt-1">
              {doc.extension === "pdf" && (
                <PolicyPreviewButton
                  id={doc.id}
                  extension={doc.extension}
                  originalName={doc.originalName}
                />
              )}
              <a href={`/api/safety/policy/download/${doc.id}`}>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-primary hover:underline">
                  <Download className="mr-1 h-4 w-4" />
                  다운로드
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              현재 설정된 적용본이 없습니다.
            </p>
            <p className="text-xs text-muted-foreground">
              아래 이력 테이블에서 문서를 업로드한 뒤 최신본을 설정해주세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
