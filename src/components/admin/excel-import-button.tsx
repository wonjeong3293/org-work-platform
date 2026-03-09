"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { createFormTemplate } from "@/actions/form-template-actions";
import { parseExcelToFormDraft, type ExcelDraft } from "@/lib/excel-parser";
import type { TableTemplateSchema, HeaderField, TableColumn } from "@/lib/table-schema";

interface MenuOption {
  id: string;
  title: string;
  moduleKey: string | null;
  domain: string;
}

const HEADER_TYPES = [
  { value: "text", label: "텍스트" },
  { value: "date", label: "날짜" },
  { value: "number", label: "숫자" },
  { value: "select", label: "선택" },
  { value: "readonly", label: "읽기전용" },
];

const COL_TYPES = [
  { value: "text", label: "텍스트" },
  { value: "number", label: "숫자" },
  { value: "select", label: "선택" },
  { value: "readonly", label: "읽기전용" },
];

export function ExcelImportButton({ menuOptions }: { menuOptions: MenuOption[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "edit">("upload");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ExcelDraft | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [menuNodeId, setMenuNodeId] = useState("");
  const [allowedSites, setAllowedSites] = useState("ALL");
  const [schema, setSchema] = useState<TableTemplateSchema | null>(null);

  const reset = () => {
    setStep("upload");
    setDraft(null);
    setSchema(null);
    setName("");
    setDescription("");
    setMenuNodeId("");
    setAllowedSites("ALL");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.xlsx?$/i)) {
      toast.error("엑셀 파일(.xlsx)만 업로드할 수 있습니다.");
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelToFormDraft(buffer, file.name);
      setDraft(result);
      setName(result.title);
      setDescription(result.description);
      setSchema(result.tableSchema);
      setStep("edit");
      toast.success(`엑셀 분석 완료: 컬럼 ${result.tableSchema.columns.length}개, 행 ${result.tableSchema.defaultRows.length}개 추출`);
    } catch (err) {
      toast.error("엑셀 파일 분석에 실패했습니다: " + (err instanceof Error ? err.message : "알 수 없는 오류"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("양식명을 입력하세요."); return; }
    if (!schema) return;

    setSaving(true);
    try {
      await createFormTemplate({
        name,
        description: description || undefined,
        formType: "TABLE",
        tableSchema: JSON.stringify(schema),
        formSchema: "[]",
        menuNodeId: menuNodeId || undefined,
        allowedSites: allowedSites || "ALL",
        sortOrder: 0,
      });
      toast.success("양식이 저장되었습니다.");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // Schema update helpers
  const updateSchema = (patch: Partial<TableTemplateSchema>) => {
    if (!schema) return;
    setSchema({ ...schema, ...patch });
  };

  const updateHeaderField = (idx: number, patch: Partial<HeaderField>) => {
    if (!schema) return;
    const arr = [...schema.headerFields];
    arr[idx] = { ...arr[idx], ...patch };
    updateSchema({ headerFields: arr });
  };
  const removeHeaderField = (idx: number) => {
    if (!schema) return;
    updateSchema({ headerFields: schema.headerFields.filter((_, i) => i !== idx) });
  };
  const addHeaderField = () => {
    if (!schema) return;
    updateSchema({
      headerFields: [...schema.headerFields, { id: `hf_${Date.now()}`, label: "", type: "text", half: true }],
    });
  };

  const updateColumn = (idx: number, patch: Partial<TableColumn>) => {
    if (!schema) return;
    const arr = [...schema.columns];
    arr[idx] = { ...arr[idx], ...patch };
    updateSchema({ columns: arr });
  };
  const removeColumn = (idx: number) => {
    if (!schema) return;
    const colId = schema.columns[idx]?.id;
    const newCols = schema.columns.filter((_, i) => i !== idx);
    const newRows = schema.defaultRows.map((r) => {
      const nr = { ...r };
      if (colId) delete nr[colId];
      return nr;
    });
    updateSchema({ columns: newCols, defaultRows: newRows });
  };
  const addColumn = () => {
    if (!schema) return;
    updateSchema({
      columns: [...schema.columns, { id: `col_${Date.now()}`, label: "", type: "text" }],
    });
  };
  const moveColumn = (idx: number, dir: -1 | 1) => {
    if (!schema) return;
    const to = idx + dir;
    if (to < 0 || to >= schema.columns.length) return;
    const arr = [...schema.columns];
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    updateSchema({ columns: arr });
  };

  const updateDefaultRow = (ri: number, colId: string, value: string) => {
    if (!schema) return;
    const rows = [...schema.defaultRows];
    rows[ri] = { ...rows[ri], [colId]: value };
    updateSchema({ defaultRows: rows });
  };
  const removeDefaultRow = (ri: number) => {
    if (!schema) return;
    updateSchema({ defaultRows: schema.defaultRows.filter((_, i) => i !== ri) });
  };
  const addDefaultRow = () => {
    if (!schema) return;
    const row: Record<string, string> = {};
    schema.columns.forEach((c) => { row[c.id] = c.defaultValue || ""; });
    updateSchema({ defaultRows: [...schema.defaultRows, row] });
  };

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        엑셀에서 불러오기
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === "upload" ? "엑셀에서 양식 불러오기" : "양식 초안 편집"}
            </DialogTitle>
          </DialogHeader>

          {/* ===== 업로드 단계 ===== */}
          {step === "upload" && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">엑셀 파일을 업로드하세요</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    .xlsx 파일을 분석하여 양식 초안을 자동 생성합니다
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="max-w-xs"
                    disabled={loading}
                  />
                </div>
                {loading && (
                  <p className="text-sm text-muted-foreground animate-pulse">분석 중...</p>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">지원 범위</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>조도측정 일지, 점검표, 체크리스트 등 정형 문서</li>
                  <li>문서 제목, 상단 정보 필드, 테이블 컬럼, 기본 행 데이터 자동 추출</li>
                  <li>복잡한 병합 셀/서식/수식은 초안에 포함되지 않습니다</li>
                  <li>초안 생성 후 관리자가 수정할 수 있습니다</li>
                </ul>
              </div>
            </div>
          )}

          {/* ===== 편집 단계 ===== */}
          {step === "edit" && schema && draft && (
            <div className="space-y-6">
              {/* 분석 결과 요약 */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">엑셀 분석 완료</p>
                      <ul className="mt-1 space-y-0.5 text-blue-800">
                        <li>상단 필드: {schema.headerFields.length}개</li>
                        <li>테이블 컬럼: {schema.columns.length}개</li>
                        <li>기본 행: {schema.defaultRows.length}개</li>
                        {draft.mergeInfo.length > 0 && <li>병합 셀: {draft.mergeInfo.length}개 (참고)</li>}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 분석 노트 (접이식) */}
              {draft.analysisNotes.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    분석 상세 로그 ({draft.analysisNotes.length}건)
                  </summary>
                  <div className="mt-2 rounded border bg-muted/30 p-3 space-y-1 max-h-40 overflow-y-auto">
                    {draft.analysisNotes.map((note, i) => (
                      <p key={i} className="text-muted-foreground">{note}</p>
                    ))}
                  </div>
                </details>
              )}

              {/* 기본 정보 */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>양식명</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>설명</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>연결 메뉴</Label>
                    <select value={menuNodeId} onChange={(e) => setMenuNodeId(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
                      <option value="">없음</option>
                      {menuOptions.map((m) => (<option key={m.id} value={m.id}>{m.title} ({m.domain})</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>사업장</Label>
                    <Input value={allowedSites} onChange={(e) => setAllowedSites(e.target.value)} placeholder="ALL" />
                  </div>
                  <div className="space-y-2">
                    <Label>PDF 방향</Label>
                    <select
                      value={schema.orientation || "landscape"}
                      onChange={(e) => updateSchema({ orientation: e.target.value as "portrait" | "landscape" })}
                      className="w-full rounded border px-3 py-2 text-sm"
                    >
                      <option value="portrait">A4 세로</option>
                      <option value="landscape">A4 가로</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 상단 필드 편집 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">상단 필드</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addHeaderField}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> 헤더 필드
                  </Button>
                </div>
                {schema.headerFields.length === 0 && (
                  <p className="py-2 text-center text-sm text-muted-foreground">상단 필드가 없습니다.</p>
                )}
                {schema.headerFields.map((hf, idx) => (
                  <div key={hf.id} className="flex items-center gap-2 rounded border p-2">
                    <Input value={hf.label} onChange={(e) => updateHeaderField(idx, { label: e.target.value })} placeholder="필드명" className="flex-1" />
                    <select value={hf.type} onChange={(e) => updateHeaderField(idx, { type: e.target.value as HeaderField["type"] })} className="rounded border px-2 py-1 text-sm w-24">
                      {HEADER_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                    </select>
                    <Input value={hf.defaultValue || ""} onChange={(e) => updateHeaderField(idx, { defaultValue: e.target.value })} placeholder="기본값" className="w-28 text-xs" />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input type="checkbox" checked={hf.half || false} onChange={(e) => updateHeaderField(idx, { half: e.target.checked })} className="rounded" />
                      반폭
                    </label>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeHeaderField(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* 테이블 컬럼 편집 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">테이블 컬럼</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addColumn}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> 컬럼 추가
                  </Button>
                </div>
                {schema.columns.map((col, idx) => (
                  <div key={col.id} className="flex items-center gap-2 rounded border p-2">
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveColumn(idx, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === 0}><ArrowUp className="h-3 w-3" /></button>
                      <button type="button" onClick={() => moveColumn(idx, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === schema.columns.length - 1}><ArrowDown className="h-3 w-3" /></button>
                    </div>
                    <Input value={col.label} onChange={(e) => updateColumn(idx, { label: e.target.value })} placeholder="컬럼명" className="flex-1" />
                    <select value={col.type} onChange={(e) => updateColumn(idx, { type: e.target.value as TableColumn["type"] })} className="rounded border px-2 py-1 text-sm w-24">
                      {COL_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                    </select>
                    {col.type === "select" && (
                      <Input value={(col.options || []).join(",")} onChange={(e) => updateColumn(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="옵션(콤마)" className="w-36 text-xs" />
                    )}
                    <Input value={col.defaultValue || ""} onChange={(e) => updateColumn(idx, { defaultValue: e.target.value })} placeholder="기본값" className="w-24 text-xs" />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeColumn(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* 기본 행 미리보기 / 편집 */}
              {schema.columns.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">기본 행 데이터 ({schema.defaultRows.length}행)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addDefaultRow}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> 행 추가
                    </Button>
                  </div>
                  {schema.defaultRows.length > 0 && (
                    <div className="overflow-x-auto rounded border max-h-60 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/80">
                          <tr>
                            {schema.columns.map((c) => (
                              <th key={c.id} className="border-r px-2 py-1.5 text-left font-medium last:border-r-0 whitespace-nowrap">{c.label}</th>
                            ))}
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {schema.defaultRows.map((row, ri) => (
                            <tr key={ri} className="border-t hover:bg-muted/30">
                              {schema.columns.map((c) => (
                                <td key={c.id} className="border-r px-1 py-0.5 last:border-r-0">
                                  <input
                                    value={row[c.id] || ""}
                                    onChange={(e) => updateDefaultRow(ri, c.id, e.target.value)}
                                    className="w-full border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary rounded"
                                  />
                                </td>
                              ))}
                              <td className="px-1">
                                <button type="button" onClick={() => removeDefaultRow(ri)} className="text-red-400 hover:text-red-600">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 수동 보정 안내 */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-amber-800">
                  <p className="font-medium">관리자 보정이 필요할 수 있습니다</p>
                  <ul className="mt-1 text-xs space-y-0.5">
                    <li>- 컬럼 타입(텍스트/숫자/선택)이 정확한지 확인해주세요</li>
                    <li>- 선택형 컬럼의 옵션값이 올바른지 확인해주세요</li>
                    <li>- 불필요한 헤더 필드나 기본 행은 삭제할 수 있습니다</li>
                    <li>- 병합 셀 영역의 데이터는 정확하지 않을 수 있습니다</li>
                  </ul>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setStep("upload"); }}>
                  다시 업로드
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "저장 중..." : "양식 저장"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
