"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown } from "lucide-react";
import { createFormTemplate, updateFormTemplate, deleteFormTemplate } from "@/actions/form-template-actions";
import type { TableTemplateSchema, HeaderField, TableColumn } from "@/lib/table-schema";
import { EMPTY_TABLE_SCHEMA } from "@/lib/table-schema";

interface MenuOption {
  id: string;
  title: string;
  moduleKey: string | null;
  domain: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

const FORM_TYPES = [
  { value: "FILE", label: "파일 업로드 결재 (FILE_APPROVAL)" },
  { value: "FORM", label: "일반 웹 양식 결재 (BASIC_FORM_APPROVAL)" },
  { value: "TABLE", label: "정형 테이블 문서 결재 (STRUCTURED_TABLE_APPROVAL)" },
  { value: "SUMMARY", label: "요약 문서" },
];

const FIELD_TYPES = [
  { value: "text", label: "텍스트" },
  { value: "number", label: "숫자" },
  { value: "date", label: "날짜" },
  { value: "checkbox", label: "체크박스" },
  { value: "select", label: "드롭다운" },
  { value: "file", label: "파일첨부" },
  { value: "photo", label: "사진첨부" },
  { value: "table", label: "테이블" },
];

// ---- Field Builder ----

function FieldBuilder({ fields, onChange }: { fields: FormField[]; onChange: (f: FormField[]) => void }) {
  const addField = () => {
    onChange([...fields, { id: `field_${Date.now()}`, type: "text", label: "" }]);
  };
  const update = (idx: number, patch: Partial<FormField>) => {
    const arr = [...fields];
    arr[idx] = { ...arr[idx], ...patch };
    onChange(arr);
  };
  const remove = (idx: number) => onChange(fields.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= fields.length) return;
    const arr = [...fields];
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">양식 필드</Label>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="mr-1 h-3.5 w-3.5" /> 필드 추가
        </Button>
      </div>
      {fields.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">필드를 추가하세요.</p>
      )}
      {fields.map((field, idx) => (
        <div key={field.id} className="flex items-start gap-2 rounded border p-3">
          <div className="flex flex-col gap-0.5 pt-1">
            <button type="button" onClick={() => move(idx, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === 0}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => move(idx, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === fields.length - 1}><ArrowDown className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Input value={field.label} onChange={(e) => update(idx, { label: e.target.value })} placeholder="필드명" />
              <select value={field.type} onChange={(e) => update(idx, { type: e.target.value })} className="rounded border px-2 py-1 text-sm">
                {FIELD_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={field.required || false} onChange={(e) => update(idx, { required: e.target.checked })} className="rounded" />
                필수
              </label>
            </div>
            <Input value={field.placeholder || ""} onChange={(e) => update(idx, { placeholder: e.target.value })} placeholder="Placeholder (선택)" className="text-xs" />
            {field.type === "select" && (
              <Input
                value={(field.options || []).join(",")}
                onChange={(e) => update(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="옵션 (콤마 구분: 옵션1,옵션2,옵션3)"
                className="text-xs"
              />
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(idx)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---- Create Button ----

export function FormTemplateCreateButton({ menuOptions }: { menuOptions: MenuOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formType, setFormType] = useState("FORM");
  const [tableSchema, setTableSchema] = useState<TableTemplateSchema>(EMPTY_TABLE_SCHEMA);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createFormTemplate({
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || undefined,
        formType: fd.get("formType") as string,
        menuNodeId: (fd.get("menuNodeId") as string) || undefined,
        allowedSites: (fd.get("allowedSites") as string) || "ALL",
        formSchema: JSON.stringify(fields),
        tableSchema: formType === "TABLE" ? JSON.stringify(tableSchema) : undefined,
        sortOrder: Number(fd.get("sortOrder")) || 0,
      });
      toast.success("양식이 추가되었습니다.");
      setOpen(false);
      setFields([]);
      setTableSchema(EMPTY_TABLE_SCHEMA);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFields([]); setTableSchema(EMPTY_TABLE_SCHEMA); } }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> 양식 추가</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>양식 추가</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormTemplateFields menuOptions={menuOptions} onFormTypeChange={setFormType} />
          {formType === "TABLE" ? (
            <TableSchemaBuilder schema={tableSchema} onChange={setTableSchema} />
          ) : (
            <FieldBuilder fields={fields} onChange={setFields} />
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "추가 중..." : "추가"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Edit Button ----

export function FormTemplateEditButton({ template, menuOptions }: {
  template: { id: string; name: string; description: string | null; formType: string; formSchema: string; tableSchema: string; menuNodeId: string | null; allowedSites: string; isActive: boolean; sortOrder: number };
  menuOptions: MenuOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState(template.formType);

  let initFields: FormField[] = [];
  try { initFields = JSON.parse(template.formSchema); } catch {}
  const [fields, setFields] = useState<FormField[]>(initFields);

  let initTableSchema: TableTemplateSchema = EMPTY_TABLE_SCHEMA;
  try { if (template.tableSchema && template.tableSchema !== "{}") initTableSchema = JSON.parse(template.tableSchema); } catch {}
  const [tableSchema, setTableSchema] = useState<TableTemplateSchema>(initTableSchema);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const ft = fd.get("formType") as string;
    try {
      await updateFormTemplate(template.id, {
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || null,
        formType: ft,
        formSchema: JSON.stringify(fields),
        tableSchema: ft === "TABLE" ? JSON.stringify(tableSchema) : undefined,
        menuNodeId: (fd.get("menuNodeId") as string) || null,
        allowedSites: (fd.get("allowedSites") as string) || "ALL",
        isActive: fd.get("isActive") === "true",
        sortOrder: Number(fd.get("sortOrder")) || 0,
      });
      toast.success("양식이 수정되었습니다.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>양식 수정</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormTemplateFields menuOptions={menuOptions} defaultValues={template} onFormTypeChange={setFormType} />
          <div className="flex items-center gap-2">
            <Label>활성 상태</Label>
            <select name="isActive" defaultValue={String(template.isActive)} className="rounded border px-2 py-1 text-sm">
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
          {formType === "TABLE" ? (
            <TableSchemaBuilder schema={tableSchema} onChange={setTableSchema} />
          ) : (
            <FieldBuilder fields={fields} onChange={setFields} />
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "수정 중..." : "수정"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Delete Button ----

export function FormTemplateDeleteButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${templateName}" 양식을 삭제하시겠습니까?`)) return;
    setLoading(true);
    try {
      await deleteFormTemplate(templateId);
      toast.success("양식이 삭제되었습니다.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

// ---- Shared Form Fields ----

function FormTemplateFields({ menuOptions, defaultValues, onFormTypeChange }: {
  menuOptions: MenuOption[];
  defaultValues?: { name: string; description: string | null; formType: string; menuNodeId: string | null; allowedSites: string; sortOrder: number };
  onFormTypeChange?: (type: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>양식명</Label>
        <Input name="name" required defaultValue={defaultValues?.name} placeholder="예: 안전점검표" />
      </div>
      <div className="space-y-2">
        <Label>설명</Label>
        <Input name="description" defaultValue={defaultValues?.description || ""} placeholder="양식 설명" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>양식 유형</Label>
          <select
            name="formType"
            defaultValue={defaultValues?.formType || "FORM"}
            className="w-full rounded border px-3 py-2 text-sm"
            onChange={(e) => onFormTypeChange?.(e.target.value)}
          >
            {FORM_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>연결 메뉴</Label>
          <select name="menuNodeId" defaultValue={defaultValues?.menuNodeId || ""} className="w-full rounded border px-3 py-2 text-sm">
            <option value="">없음</option>
            {menuOptions.map((m) => (<option key={m.id} value={m.id}>{m.title} ({m.domain})</option>))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>사용 가능 사업장</Label>
          <Input name="allowedSites" defaultValue={defaultValues?.allowedSites || "ALL"} placeholder="ALL 또는 HS,PT" />
          <p className="text-xs text-muted-foreground">ALL = 전체, 콤마로 구분</p>
        </div>
        <div className="space-y-2">
          <Label>정렬 순서</Label>
          <Input name="sortOrder" type="number" defaultValue={defaultValues?.sortOrder ?? 0} />
        </div>
      </div>
    </>
  );
}

// ---- Table Schema Builder ----

const COL_TYPES = [
  { value: "text", label: "텍스트" },
  { value: "number", label: "숫자" },
  { value: "select", label: "선택" },
  { value: "readonly", label: "읽기전용" },
];

const HEADER_TYPES = [
  { value: "text", label: "텍스트" },
  { value: "date", label: "날짜" },
  { value: "number", label: "숫자" },
  { value: "select", label: "선택" },
  { value: "readonly", label: "읽기전용" },
];

function TableSchemaBuilder({ schema, onChange }: { schema: TableTemplateSchema; onChange: (s: TableTemplateSchema) => void }) {
  const update = (patch: Partial<TableTemplateSchema>) => onChange({ ...schema, ...patch });

  // Header fields
  const addHeader = () => update({ headerFields: [...schema.headerFields, { id: `hf_${Date.now()}`, label: "", type: "text" }] });
  const updateHeader = (idx: number, patch: Partial<HeaderField>) => {
    const arr = [...schema.headerFields];
    arr[idx] = { ...arr[idx], ...patch };
    update({ headerFields: arr });
  };
  const removeHeader = (idx: number) => update({ headerFields: schema.headerFields.filter((_, i) => i !== idx) });

  // Table columns
  const addColumn = () => update({ columns: [...schema.columns, { id: `col_${Date.now()}`, label: "", type: "text" }] });
  const updateColumn = (idx: number, patch: Partial<TableColumn>) => {
    const arr = [...schema.columns];
    arr[idx] = { ...arr[idx], ...patch };
    update({ columns: arr });
  };
  const removeColumn = (idx: number) => update({ columns: schema.columns.filter((_, i) => i !== idx) });
  const moveColumn = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= schema.columns.length) return;
    const arr = [...schema.columns];
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    update({ columns: arr });
  };

  // Default rows
  const addDefaultRow = () => {
    const row: Record<string, string> = {};
    schema.columns.forEach((c) => { row[c.id] = c.defaultValue || ""; });
    update({ defaultRows: [...(schema.defaultRows || []), row] });
  };
  const updateDefaultRow = (rowIdx: number, colId: string, value: string) => {
    const rows = [...(schema.defaultRows || [])];
    rows[rowIdx] = { ...rows[rowIdx], [colId]: value };
    update({ defaultRows: rows });
  };
  const removeDefaultRow = (rowIdx: number) => update({ defaultRows: (schema.defaultRows || []).filter((_, i) => i !== rowIdx) });

  return (
    <div className="space-y-6">
      {/* PDF 방향 */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">PDF 방향</Label>
        <select value={schema.orientation || "landscape"} onChange={(e) => update({ orientation: e.target.value as "portrait" | "landscape" })} className="rounded border px-2 py-1 text-sm">
          <option value="portrait">A4 세로</option>
          <option value="landscape">A4 가로</option>
        </select>
      </div>

      {/* 상단 필드 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">상단 필드 (문서 제목, 점검일 등)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addHeader}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 헤더 필드
          </Button>
        </div>
        {schema.headerFields.map((hf, idx) => (
          <div key={hf.id} className="flex items-center gap-2 rounded border p-2">
            <Input value={hf.label} onChange={(e) => updateHeader(idx, { label: e.target.value })} placeholder="필드명" className="flex-1" />
            <select value={hf.type} onChange={(e) => updateHeader(idx, { type: e.target.value as HeaderField["type"] })} className="rounded border px-2 py-1 text-sm w-24">
              {HEADER_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
            {hf.type === "select" && (
              <Input value={(hf.options || []).join(",")} onChange={(e) => updateHeader(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="옵션(콤마)" className="w-40 text-xs" />
            )}
            <Input value={hf.defaultValue || ""} onChange={(e) => updateHeader(idx, { defaultValue: e.target.value })} placeholder="기본값" className="w-24 text-xs" />
            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
              <input type="checkbox" checked={hf.half || false} onChange={(e) => updateHeader(idx, { half: e.target.checked })} className="rounded" />
              반폭
            </label>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeHeader(idx)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* 테이블 컬럼 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">테이블 컬럼</Label>
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 컬럼 추가
          </Button>
        </div>
        {schema.columns.length === 0 && (
          <p className="py-3 text-center text-sm text-muted-foreground">컬럼을 추가하세요.</p>
        )}
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
              <Input value={(col.options || []).join(",")} onChange={(e) => updateColumn(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="옵션(콤마)" className="w-40 text-xs" />
            )}
            <Input value={col.defaultValue || ""} onChange={(e) => updateColumn(idx, { defaultValue: e.target.value })} placeholder="기본값" className="w-24 text-xs" />
            <Input type="number" value={col.width || ""} onChange={(e) => updateColumn(idx, { width: Number(e.target.value) || undefined })} placeholder="폭(px)" className="w-20 text-xs" title="열 폭 (px 단위, 비워두면 자동)" />
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeColumn(idx)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* 기본 행 */}
      {schema.columns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">기본 행 데이터 (미리 채워진 행)</Label>
            <Button type="button" variant="outline" size="sm" onClick={addDefaultRow}>
              <Plus className="mr-1 h-3.5 w-3.5" /> 행 추가
            </Button>
          </div>
          {(schema.defaultRows || []).length > 0 && (
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    {schema.columns.map((c) => (<th key={c.id} className="border-r px-2 py-1 text-left font-medium last:border-r-0">{c.label || "?"}</th>))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {(schema.defaultRows || []).map((row, ri) => (
                    <tr key={ri} className="border-t">
                      {schema.columns.map((c) => (
                        <td key={c.id} className="border-r px-1 py-0.5 last:border-r-0">
                          <input value={row[c.id] || ""} onChange={(e) => updateDefaultRow(ri, c.id, e.target.value)} className="w-full border-0 bg-transparent px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary rounded" />
                        </td>
                      ))}
                      <td className="px-1">
                        <button type="button" onClick={() => removeDefaultRow(ri)} className="text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
