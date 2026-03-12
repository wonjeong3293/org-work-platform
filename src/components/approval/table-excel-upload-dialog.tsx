"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { TableTemplateSchema, TableRowData } from "@/lib/table-schema";
import { parseTableExcel, type ParseResult } from "./table-excel-handler";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: TableTemplateSchema;
  onImport: (rows: TableRowData[], mode: "replace" | "append") => void;
}

type Step = "upload" | "preview";

export function TableExcelUploadDialog({
  open,
  onOpenChange,
  schema,
  onImport,
}: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const parsed = await parseTableExcel(file, schema);
      setResult(parsed);
      setStep("preview");
    } catch {
      // reset
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = (mode: "replace" | "append") => {
    if (!result || result.rows.length === 0) return;
    onImport(result.rows, mode);
    handleClose();
  };

  const handleClose = () => {
    setStep("upload");
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            엑셀 데이터 업로드
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
                  disabled={isParsing}
                />
                <Button variant="outline" asChild disabled={isParsing}>
                  <span>{isParsing ? "분석 중..." : "파일 선택"}</span>
                </Button>
              </label>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">엑셀 열 매핑</p>
                  <p>
                    첫 번째 행이 헤더로 인식됩니다. 아래 컬럼명과 일치하면 자동
                    매핑됩니다.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {schema.columns
                      .filter((c) => c.type !== "readonly")
                      .map((col) => (
                        <span
                          key={col.id}
                          className="inline-block rounded bg-background px-1.5 py-0.5 border text-[11px]"
                        >
                          {col.label}
                          {col.required && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && result && (
          <div className="space-y-4">
            {/* 요약 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  파싱 완료: <strong>{result.rows.length}</strong>행
                </span>
              </div>

              {result.warnings.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-amber-700">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <ul className="space-y-0.5 text-xs">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="text-sm">
                    <span className="text-red-600">
                      오류 {result.errors.length}건 (해당 행 제외)
                    </span>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground max-h-24 overflow-y-auto">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>
                          행 {err.row}, {err.column}: {err.message}
                        </li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>...외 {result.errors.length - 10}건</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* 미리보기 테이블 */}
            {result.rows.length > 0 && (
              <div className="max-h-52 overflow-auto rounded border text-xs">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-[11px] font-medium">#</th>
                      {schema.columns.map((col) => (
                        <th
                          key={col.id}
                          className="px-2 py-1.5 text-left text-[11px] font-medium whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 30).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1 text-muted-foreground">
                          {i + 1}
                        </td>
                        {schema.columns.map((col) => (
                          <td key={col.id} className="px-2 py-1 whitespace-nowrap">
                            {row[col.id] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {result.rows.length > 30 && (
                      <tr className="border-t">
                        <td
                          colSpan={schema.columns.length + 1}
                          className="px-2 py-2 text-center text-muted-foreground"
                        >
                          ...외 {result.rows.length - 30}행
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 액션 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              {result.rows.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleImport("append")}
                  >
                    기존 데이터에 추가 ({result.rows.length}행)
                  </Button>
                  <Button onClick={() => handleImport("replace")}>
                    기존 데이터 교체 ({result.rows.length}행)
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
