"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from "lucide-react";
import {
  validateBulkData,
  bulkCreateItems,
} from "@/actions/safety-inspection-actions";
import type { BulkCreateInput, BulkValidationResult } from "@/actions/safety-inspection-actions";
import { parseExcelFile } from "./excel-handler";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSite: string;
  currentYear: number;
}

type Step = "upload" | "validation" | "complete";

export function ExcelUploadDialog({
  open,
  onOpenChange,
  currentSite,
  currentYear,
}: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [parsedData, setParsedData] = useState<BulkCreateInput[]>([]);
  const [validationResult, setValidationResult] = useState<BulkValidationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [createdCount, setCreatedCount] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcelFile(file, currentSite, currentYear);
      if (data.length === 0) {
        toast.error("데이터가 없습니다.");
        return;
      }
      setParsedData(data);

      // 서버 검증
      startTransition(async () => {
        const result = await validateBulkData(data);
        setValidationResult(result);
        setStep("validation");
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "파일 파싱에 실패했습니다.");
    }
  };

  const handleConfirm = () => {
    if (!validationResult || validationResult.valid.length === 0) return;

    startTransition(async () => {
      try {
        const count = await bulkCreateItems(validationResult.valid);
        setCreatedCount(count);
        setStep("complete");
        toast.success(`${count}건이 등록되었습니다.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "등록에 실패했습니다.");
      }
    });
  };

  const handleClose = () => {
    setStep("upload");
    setParsedData([]);
    setValidationResult(null);
    setCreatedCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            엑셀 업로드
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                엑셀 파일(.xlsx, .xls)을 선택해주세요
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={isPending}
                />
                <Button variant="outline" asChild disabled={isPending}>
                  <span>{isPending ? "분석 중..." : "파일 선택"}</span>
                </Button>
              </label>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>필수 열: 공장(설치장소), 장비종류, 관리번호</p>
              <p>선택 열: 형식(규격), 용량, 전 검사일, 기간만료, 검사증 번호, 비고</p>
            </div>
          </div>
        )}

        {step === "validation" && validationResult && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  등록 가능: <strong>{validationResult.valid.length}</strong>건
                </span>
              </div>
              {validationResult.errors.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-sm">
                    <span>오류: {validationResult.errors.length}건</span>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {validationResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>행 {err.row}: {err.message}</li>
                      ))}
                      {validationResult.errors.length > 5 && (
                        <li>...외 {validationResult.errors.length - 5}건</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
              {validationResult.duplicates.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <div className="text-sm">
                    <span>중복 관리번호 (건너뜀): {validationResult.duplicates.length}건</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {validationResult.duplicates.slice(0, 5).join(", ")}
                      {validationResult.duplicates.length > 5 && " ..."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {validationResult.valid.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded border text-xs">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">관리번호</th>
                      <th className="px-2 py-1 text-left">장비종류</th>
                      <th className="px-2 py-1 text-left">설치장소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.valid.slice(0, 20).map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{item.code}</td>
                        <td className="px-2 py-1">{item.equipmentTypeName}</td>
                        <td className="px-2 py-1">{item.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending || validationResult.valid.length === 0}
              >
                {isPending ? "등록 중..." : `${validationResult.valid.length}건 등록`}
              </Button>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <div>
              <p className="text-lg font-semibold">{createdCount}건 등록 완료</p>
              <p className="text-sm text-muted-foreground">
                데이터가 성공적으로 등록되었습니다.
              </p>
            </div>
            <Button onClick={handleClose}>확인</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
