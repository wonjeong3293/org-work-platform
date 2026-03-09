"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileSpreadsheet, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { bulkCreateEquipment } from "@/actions/equipment-actions";

interface ParsedRow {
  name: string;
  location: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  installDate: string;
  status: string;
  siteCode: string;
  ratedOutput: string;
  ratedVoltage: string;
  ratedCurrent: string;
  note: string;
  error?: string;
}

const COLUMN_HEADERS = [
  "설비명", "위치", "모델명", "제조사", "시리얼번호",
  "설치일", "상태", "사업장코드", "정격출력", "정격전압", "정격전류", "비고",
];

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE", "DISPOSED"];

export function EquipmentExcelImportDialog() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);

  const reset = () => {
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) {
      toast.error("엑셀 파일(.xlsx)만 업로드할 수 있습니다.");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

        // Skip header row
        const dataRows = raw.slice(1).filter((r) => r.length > 0 && r[0]);
        const parsed: ParsedRow[] = dataRows.map((r) => {
          const name = String(r[0] || "").trim();
          const location = String(r[1] || "").trim();
          const status = String(r[6] || "").trim().toUpperCase();
          const errors: string[] = [];
          if (!name) errors.push("설비명 필수");
          if (!location) errors.push("위치 필수");
          if (status && !VALID_STATUSES.includes(status)) errors.push("상태값 오류");

          return {
            name,
            location,
            model: String(r[2] || "").trim(),
            manufacturer: String(r[3] || "").trim(),
            serialNumber: String(r[4] || "").trim(),
            installDate: String(r[5] || "").trim(),
            status: VALID_STATUSES.includes(status) ? status : "ACTIVE",
            siteCode: String(r[7] || "").trim() || "ALL",
            ratedOutput: String(r[8] || "").trim(),
            ratedVoltage: String(r[9] || "").trim(),
            ratedCurrent: String(r[10] || "").trim(),
            note: String(r[11] || "").trim(),
            error: errors.length > 0 ? errors.join(", ") : undefined,
          };
        });

        setRows(parsed);
        toast.success(`${parsed.length}건의 데이터를 읽었습니다.`);
      } catch {
        toast.error("엑셀 파일 분석에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const hasErrors = rows.some((r) => r.error);
  const validRows = rows.filter((r) => !r.error);

  async function handleImport() {
    if (validRows.length === 0) {
      toast.error("등록할 수 있는 데이터가 없습니다.");
      return;
    }
    setSaving(true);
    try {
      await bulkCreateEquipment(validRows);
      toast.success(`${validRows.length}건의 설비가 등록되었습니다.`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        엑셀 일괄 등록
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>설비 엑셀 일괄 등록</DialogTitle>
          </DialogHeader>

          {rows.length === 0 ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">엑셀 파일을 업로드하세요</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    .xlsx 파일의 데이터를 읽어 설비를 일괄 등록합니다.
                  </p>
                </div>
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="max-w-xs"
                  disabled={loading}
                />
                {loading && <p className="text-sm text-muted-foreground animate-pulse">분석 중...</p>}
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">엑셀 컬럼 순서</p>
                <p>{COLUMN_HEADERS.map((h, i) => `${i + 1}. ${h}${i < 2 ? "(*)" : ""}`).join("  |  ")}</p>
                <p className="mt-2 text-xs">* 필수 항목 | 상태: ACTIVE/INACTIVE/MAINTENANCE/DISPOSED</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline">전체 {rows.length}건</Badge>
                <Badge variant="default">정상 {validRows.length}건</Badge>
                {hasErrors && (
                  <Badge variant="destructive">오류 {rows.length - validRows.length}건</Badge>
                )}
              </div>

              <div className="overflow-x-auto rounded border max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">#</th>
                      {COLUMN_HEADERS.map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-2 py-1.5 text-left font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={`border-t ${r.error ? "bg-red-50" : ""}`}>
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1">{r.location}</td>
                        <td className="px-2 py-1">{r.model}</td>
                        <td className="px-2 py-1">{r.manufacturer}</td>
                        <td className="px-2 py-1">{r.serialNumber}</td>
                        <td className="px-2 py-1">{r.installDate}</td>
                        <td className="px-2 py-1">{r.status}</td>
                        <td className="px-2 py-1">{r.siteCode}</td>
                        <td className="px-2 py-1">{r.ratedOutput}</td>
                        <td className="px-2 py-1">{r.ratedVoltage}</td>
                        <td className="px-2 py-1">{r.ratedCurrent}</td>
                        <td className="px-2 py-1">{r.note}</td>
                        <td className="px-2 py-1">
                          {r.error ? (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-3 w-3" />
                              {r.error}
                            </span>
                          ) : (
                            <span className="text-green-600">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasErrors && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-amber-800">오류가 있는 행은 등록에서 제외됩니다.</p>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { reset(); }}>
                  다시 업로드
                </Button>
                <Button onClick={handleImport} disabled={saving || validRows.length === 0}>
                  {saving ? "등록 중..." : `${validRows.length}건 등록`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
