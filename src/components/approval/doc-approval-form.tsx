"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createDocApproval, submitDocApproval } from "@/actions/doc-approval-actions";
import { Plus, X, Trash2, Upload, Download, FileSpreadsheet } from "lucide-react";
import type { TableTemplateSchema, TableRowData } from "@/lib/table-schema";
import { parseTableSchema } from "@/lib/table-schema";
import { downloadTableExcel, downloadTemplateExcel } from "./table-excel-handler";
import { TableExcelUploadDialog } from "./table-excel-upload-dialog";

interface Template {
  id: string;
  name: string;
  formType: string;
  formSchema: string;
  tableSchema: string;
  defaultApprovers: string;
}

interface UserOption {
  id: string;
  name: string;
  position: string | null;
}

interface Props {
  moduleKey: string;
  siteCode: string;
  year: number;
  templates: Template[];
  users: UserOption[];
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export function DocApprovalForm({ moduleKey, siteCode, year, templates, users }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [approvers, setApprovers] = useState<{ userId: string; type: string }[]>([]);

  // TABLE type state
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({});
  const [tableRows, setTableRows] = useState<TableRowData[]>([]);
  const [showExcelUpload, setShowExcelUpload] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const isTableType = selectedTemplate?.formType === "TABLE";

  let fields: FormField[] = [];
  try {
    if (selectedTemplate && !isTableType) fields = JSON.parse(selectedTemplate.formSchema);
  } catch {}

  let tableSchema: TableTemplateSchema | null = null;
  if (isTableType && selectedTemplate) {
    tableSchema = parseTableSchema(selectedTemplate.tableSchema);
  }

  // Load default approvers and table defaults when template changes
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setFormValues({});
    setHeaderValues({});
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      try {
        const defaults = JSON.parse(tmpl.defaultApprovers);
        if (Array.isArray(defaults) && defaults.length > 0) {
          setApprovers(defaults);
        }
      } catch {}
      // Load table defaults
      if (tmpl.formType === "TABLE") {
        const ts = parseTableSchema(tmpl.tableSchema);
        // Set header default values
        const hDefaults: Record<string, string> = {};
        ts.headerFields.forEach((hf) => { if (hf.defaultValue) hDefaults[hf.id] = hf.defaultValue; });
        setHeaderValues(hDefaults);
        // Set default rows
        if (ts.defaultRows && ts.defaultRows.length > 0) {
          setTableRows(ts.defaultRows.map((r) => ({ ...r })));
        } else {
          setTableRows([]);
        }
      }
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const addApprover = () => {
    setApprovers([...approvers, { userId: "", type: "APPROVE" }]);
  };

  const removeApprover = (idx: number) => {
    setApprovers(approvers.filter((_, i) => i !== idx));
  };

  const updateApprover = (idx: number, field: "userId" | "type", value: string) => {
    const updated = [...approvers];
    updated[idx] = { ...updated[idx], [field]: value };
    setApprovers(updated);
  };

  const buildPayload = () => ({
    moduleKey,
    formTemplateId: selectedTemplateId || undefined,
    title,
    formData: isTableType ? "{}" : JSON.stringify(formValues),
    headerData: isTableType ? JSON.stringify(headerValues) : undefined,
    tableData: isTableType ? JSON.stringify(tableRows) : undefined,
    siteCode,
    year,
  });

  const handleSaveDraft = async () => {
    if (!title.trim()) { toast.error("제목을 입력하세요."); return; }
    setLoading(true);
    try {
      await createDocApproval(buildPayload());
      toast.success("임시저장되었습니다.");
      router.push(`/documents/approval/${moduleKey}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("제목을 입력하세요."); return; }
    if (approvers.length === 0 || approvers.some((a) => !a.userId)) {
      toast.error("결재자를 모두 지정하세요."); return;
    }
    setLoading(true);
    try {
      const approval = await createDocApproval(buildPayload());
      await submitDocApproval(approval.id, approvers);
      toast.success("결재가 요청되었습니다.");
      router.push(`/documents/approval/${moduleKey}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "결재 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Table row helpers
  const addTableRow = () => {
    if (!tableSchema) return;
    const row: TableRowData = {};
    tableSchema.columns.forEach((c) => { row[c.id] = c.defaultValue || ""; });
    setTableRows([...tableRows, row]);
  };
  const updateTableRow = (rowIdx: number, colId: string, value: string) => {
    const rows = [...tableRows];
    rows[rowIdx] = { ...rows[rowIdx], [colId]: value };
    setTableRows(rows);
  };
  const removeTableRow = (rowIdx: number) => setTableRows(tableRows.filter((_, i) => i !== rowIdx));

  const handleExcelImport = (rows: TableRowData[], mode: "replace" | "append") => {
    if (mode === "replace") {
      setTableRows(rows);
    } else {
      setTableRows((prev) => [...prev, ...rows]);
    }
    toast.success(`${rows.length}행이 ${mode === "replace" ? "교체" : "추가"}되었습니다.`);
  };

  const handleExcelDownload = () => {
    if (!tableSchema) return;
    const name = selectedTemplate?.name || title || "문서";
    downloadTableExcel(tableSchema, tableRows, headerValues, name);
  };

  const handleTemplateDownload = () => {
    if (!tableSchema) return;
    const name = selectedTemplate?.name || title || "문서";
    downloadTemplateExcel(tableSchema, name);
  };

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">기본 정보</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>양식 선택</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger><SelectValue placeholder="양식을 선택하세요" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="문서 제목" />
          </div>
        </CardContent>
      </Card>

      {/* 양식 필드 - 일반 결재문서 */}
      {!isTableType && fields.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">문서 내용</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</Label>
                {field.type === "select" && field.options ? (
                  <Select value={formValues[field.id] || ""} onValueChange={(v) => handleFieldChange(field.id, v)}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : field.type === "date" ? (
                  <Input type="date" value={formValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} />
                ) : field.type === "number" ? (
                  <Input type="number" value={formValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} placeholder={field.placeholder} />
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formValues[field.id] === "true"} onChange={(e) => handleFieldChange(field.id, String(e.target.checked))} className="rounded" />
                    <span className="text-sm">{field.placeholder || field.label}</span>
                  </label>
                ) : (
                  <Input value={formValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} placeholder={field.placeholder} />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 정형 테이블 문서 - 상단 필드 */}
      {isTableType && tableSchema && tableSchema.headerFields.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">문서 정보</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {tableSchema.headerFields.map((hf) => (
                <div key={hf.id} className={`space-y-2 ${hf.half ? "" : "col-span-2 sm:col-span-1"}`}>
                  <Label>{hf.label}{hf.required && <span className="text-red-500 ml-1">*</span>}</Label>
                  {hf.type === "date" ? (
                    <Input type="date" value={headerValues[hf.id] || ""} onChange={(e) => setHeaderValues((p) => ({ ...p, [hf.id]: e.target.value }))} />
                  ) : hf.type === "select" && hf.options ? (
                    <Select value={headerValues[hf.id] || ""} onValueChange={(v) => setHeaderValues((p) => ({ ...p, [hf.id]: v }))}>
                      <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>
                        {hf.options.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  ) : hf.type === "readonly" ? (
                    <Input value={hf.defaultValue || ""} disabled className="bg-muted" />
                  ) : (
                    <Input value={headerValues[hf.id] || ""} onChange={(e) => setHeaderValues((p) => ({ ...p, [hf.id]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 정형 테이블 문서 - 테이블 본문 */}
      {isTableType && tableSchema && tableSchema.columns.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">측정 데이터</CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleTemplateDownload} title="빈 양식 다운로드">
                <FileSpreadsheet className="mr-1 h-4 w-4" /> 양식 다운로드
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowExcelUpload(true)}>
                <Upload className="mr-1 h-4 w-4" /> 엑셀 업로드
              </Button>
              {tableRows.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={handleExcelDownload}>
                  <Download className="mr-1 h-4 w-4" /> 다운로드
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={addTableRow}>
                <Plus className="mr-1 h-4 w-4" /> 행 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-2 py-2 text-center text-xs font-medium w-10">#</th>
                    {tableSchema.columns.map((col) => (
                      <th key={col.id} className="px-3 py-2 text-left text-xs font-medium" style={col.width ? { width: `${col.width}px` } : undefined}>{col.label}</th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr><td colSpan={tableSchema.columns.length + 2} className="py-6 text-center text-muted-foreground text-sm">행을 추가하세요.</td></tr>
                  ) : (
                    tableRows.map((row, ri) => (
                      <tr key={ri} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-2 py-1 text-center text-xs text-muted-foreground">{ri + 1}</td>
                        {tableSchema!.columns.map((col) => (
                          <td key={col.id} className="px-1 py-1">
                            {col.type === "select" && col.options ? (
                              <select
                                value={row[col.id] || ""}
                                onChange={(e) => updateTableRow(ri, col.id, e.target.value)}
                                className="w-full rounded border px-2 py-1 text-sm bg-background"
                              >
                                <option value="">선택</option>
                                {col.options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                              </select>
                            ) : col.type === "readonly" ? (
                              <span className="block px-2 py-1 text-sm text-muted-foreground">{row[col.id] || col.defaultValue || ""}</span>
                            ) : (
                              <Input
                                type={col.type === "number" ? "number" : "text"}
                                value={row[col.id] || ""}
                                onChange={(e) => updateTableRow(ri, col.id, e.target.value)}
                                className="h-8 text-sm"
                              />
                            )}
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTableRow(ri)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결재라인 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">결재라인</CardTitle>
          <Button variant="outline" size="sm" onClick={addApprover}><Plus className="mr-1 h-4 w-4" /> 결재자 추가</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">결재자를 추가하세요.</p>
          ) : (
            approvers.map((approver, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                <Select value={approver.type} onValueChange={(v) => updateApprover(idx, "type", v)}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVE">승인</SelectItem>
                    <SelectItem value="AGREE">합의</SelectItem>
                    <SelectItem value="NOTIFY">참조</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={approver.userId} onValueChange={(v) => updateApprover(idx, "userId", v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="결재자 선택" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}{u.position ? ` (${u.position})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeApprover(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleSaveDraft} disabled={loading}>임시저장</Button>
        <Button onClick={handleSubmit} disabled={loading}>결재요청</Button>
      </div>

      {/* 엑셀 업로드 다이얼로그 */}
      {isTableType && tableSchema && (
        <TableExcelUploadDialog
          open={showExcelUpload}
          onOpenChange={setShowExcelUpload}
          schema={tableSchema}
          onImport={handleExcelImport}
        />
      )}
    </div>
  );
}
