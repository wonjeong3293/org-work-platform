"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Eye, Download, FileWarning } from "lucide-react";

interface PolicyPreviewProps {
  id: string;
  extension: string;
  originalName: string;
}

export function PolicyPreviewButton({
  id,
  extension,
  originalName,
}: PolicyPreviewProps) {
  const [open, setOpen] = useState(false);
  const isPdf = extension === "pdf";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-primary hover:underline"
        onClick={() => setOpen(true)}
      >
        <Eye className="mr-1 h-4 w-4" />
        미리보기
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={isPdf ? "w-full sm:max-w-2xl" : "sm:max-w-md"}
        >
          <SheetHeader>
            <SheetTitle className="truncate">{originalName}</SheetTitle>
            <SheetDescription>
              {isPdf
                ? "PDF 문서 미리보기"
                : `${extension.toUpperCase()} 파일`}
            </SheetDescription>
          </SheetHeader>

          {isPdf ? (
            <iframe
              src={`/api/safety/policy/preview/${id}`}
              className="h-full w-full flex-1 rounded border"
              title={originalName}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <FileWarning className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {extension.toUpperCase()} 파일은 브라우저에서 미리보기를
                  지원하지 않습니다.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  파일을 다운로드하여 해당 프로그램에서 열어주세요.
                </p>
              </div>
              <a href={`/api/safety/policy/download/${id}`}>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  다운로드
                </Button>
              </a>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
