"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Eye,
  Upload,
  Trash2,
  Plus,
  FileText,
  FileWarning,
  Paperclip,
  FileSpreadsheet,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  getEquipmentById,
  updateEquipmentStatus,
  updateEquipment,
  deleteEquipmentDrawing,
  createHistoryCard,
  deleteHistoryCard,
  bulkImportHistoryCards,
  getEquipmentSpecFields,
  createEquipmentSpecField,
  deleteEquipmentSpecField,
  upsertEquipmentSpecValue,
} from "@/actions/equipment-actions";
import type { EquipmentDetail, HistoryCardItem, SpecFieldItem } from "@/actions/equipment-actions";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  ACTIVE: { label: "가동중", variant: "default" },
  INACTIVE: { label: "비가동", variant: "secondary" },
  MAINTENANCE: { label: "점검중", variant: "outline" },
  DISPOSED: { label: "폐기", variant: "destructive" },
};

const CARD_TYPE_MAP: Record<string, string> = {
  INSPECTION: "점검",
  REPAIR: "수리",
  REPLACEMENT: "교체",
  OTHER: "기타",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(value: number | null): string {
  if (value == null) return "-";
  return value.toLocaleString("ko-KR") + "원";
}

// ── Drawing Section ──

function DrawingSection({ equipment }: { equipment: EquipmentDetail }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleDeleteDrawing() {
    if (!confirm("도면을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await deleteEquipmentDrawing(equipment.id);
      toast.success("도면이 삭제되었습니다.");
      router.refresh();
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  const isPdf = equipment.drawingMime?.includes("pdf");
  const isImage = equipment.drawingMime?.startsWith("image/");

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("equipmentId", equipment.id);
      const res = await fetch("/api/equipment/drawing/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "업로드 실패");
      }
      toast.success("도면이 업로드되었습니다.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">도면</h3>
        <div className="flex gap-1">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            {uploading ? "업로드중..." : "업로드"}
          </Button>
        </div>
      </div>

      {equipment.drawingName ? (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-sm" title={equipment.drawingName}>
              {equipment.drawingName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(equipment.drawingSize)}
            </span>
          </div>
          <div className="flex gap-2">
            {(isPdf || isImage) && (
              <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="mr-1 h-3.5 w-3.5" />
                미리보기
              </Button>
            )}
            <a href={`/api/equipment/drawing/download/${equipment.id}`}>
              <Button variant="ghost" size="sm">
                <Download className="mr-1 h-3.5 w-3.5" />
                다운로드
              </Button>
            </a>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={handleDeleteDrawing} disabled={deleting}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {deleting ? "삭제중..." : "삭제"}
            </Button>
          </div>

          {previewOpen && (
            <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
              <SheetContent side="right" className="w-full sm:max-w-2xl">
                <SheetHeader>
                  <SheetTitle className="truncate">{equipment.drawingName}</SheetTitle>
                  <SheetDescription>도면 미리보기</SheetDescription>
                </SheetHeader>
                {isPdf ? (
                  <iframe
                    src={`/api/equipment/drawing/preview/${equipment.id}`}
                    className="h-full w-full flex-1 rounded border"
                    title={equipment.drawingName || "도면"}
                  />
                ) : isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/equipment/drawing/preview/${equipment.id}`}
                    alt={equipment.drawingName || "도면"}
                    className="w-full rounded border"
                  />
                ) : null}
              </SheetContent>
            </Sheet>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          등록된 도면이 없습니다.
        </div>
      )}
    </div>
  );
}

// ── History Card Item ──

function HistoryCardRow({ card }: { card: HistoryCardItem }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isPdf = card.attachmentMime?.includes("pdf");

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/equipment/history-card/upload/${card.id}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "업로드 실패");
      }
      toast.success("첨부파일이 업로드되었습니다.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 이력카드를 삭제하시겠습니까?")) return;
    try {
      await deleteHistoryCard(card.id);
      toast.success("이력카드가 삭제되었습니다.");
      router.refresh();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {CARD_TYPE_MAP[card.cardType] || card.cardType}
          </Badge>
          <span className="text-sm font-medium">{card.title}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {card.content && (
        <p className="text-sm text-muted-foreground">{card.content}</p>
      )}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>{formatDate(card.performedAt)}</span>
        {card.performedBy && <span>{card.performedBy}</span>}
        {card.vendor && <span>업체: {card.vendor}</span>}
      </div>
      {(card.repairCost != null || card.repairDetail) && (
        <div className="rounded bg-muted/50 px-2 py-1.5 text-xs space-y-0.5">
          {card.repairCost != null && (
            <p><span className="text-muted-foreground">수리비:</span> {formatCurrency(card.repairCost)}</p>
          )}
          {card.repairDetail && (
            <p><span className="text-muted-foreground">수리내역:</span> {card.repairDetail}</p>
          )}
        </div>
      )}

      {/* 첨부파일 */}
      {card.attachmentName ? (
        <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1.5">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 truncate text-xs" title={card.attachmentName}>
            {card.attachmentName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(card.attachmentSize)}
          </span>
          {isPdf && (
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-0.5 h-3 w-3" />
              보기
            </Button>
          )}
          <a href={`/api/equipment/history-card/download/${card.id}`}>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs">
              <Download className="mr-0.5 h-3 w-3" />
              받기
            </Button>
          </a>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-1 h-3 w-3" />
            {uploading ? "업로드중..." : "파일 첨부"}
          </Button>
        </div>
      )}

      {/* PDF Preview */}
      {previewOpen && isPdf && (
        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle className="truncate">{card.attachmentName}</SheetTitle>
              <SheetDescription>첨부파일 미리보기</SheetDescription>
            </SheetHeader>
            <iframe
              src={`/api/equipment/history-card/download/${card.id}`}
              className="h-full w-full flex-1 rounded border"
              title={card.attachmentName || "첨부파일"}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

// ── Add History Card Form ──

function AddHistoryCardForm({
  equipmentId,
  onDone,
}: {
  equipmentId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cardType, setCardType] = useState("INSPECTION");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const costStr = fd.get("repairCost") as string;
      await createHistoryCard(equipmentId, {
        title: fd.get("title") as string,
        content: (fd.get("content") as string) || undefined,
        cardType: fd.get("cardType") as string,
        performedAt: (fd.get("performedAt") as string) || undefined,
        performedBy: (fd.get("performedBy") as string) || undefined,
        vendor: (fd.get("vendor") as string) || undefined,
        repairCost: costStr ? Number(costStr) || null : null,
        repairDetail: (fd.get("repairDetail") as string) || undefined,
      });
      toast.success("이력카드가 추가되었습니다.");
      router.refresh();
      onDone();
    } catch {
      toast.error("이력카드 추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">제목 *</Label>
          <Input name="title" required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">유형</Label>
          <Select name="cardType" defaultValue="INSPECTION" onValueChange={setCardType}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INSPECTION">점검</SelectItem>
              <SelectItem value="REPAIR">수리</SelectItem>
              <SelectItem value="REPLACEMENT">교체</SelectItem>
              <SelectItem value="OTHER">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">내용</Label>
        <Input name="content" className="h-8 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">수행일</Label>
          <Input name="performedAt" type="date" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">담당자</Label>
          <Input name="performedBy" className="h-8 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">업체</Label>
        <Input name="vendor" className="h-8 text-sm" />
      </div>
      {cardType === "REPAIR" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">금액 (원)</Label>
            <Input name="repairCost" type="number" className="h-8 text-sm" placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">수리내역</Label>
            <Input name="repairDetail" className="h-8 text-sm" />
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          취소
        </Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "추가중..." : "추가"}
        </Button>
      </div>
    </form>
  );
}

// ── History Card Excel Import Dialog ──

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = ["날짜", "이력", "업체", "금액", "담당", "확인", "승인"];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  // 컬럼 너비 설정
  ws["!cols"] = [
    { wch: 12 }, // 날짜
    { wch: 30 }, // 이력
    { wch: 15 }, // 업체
    { wch: 12 }, // 금액
    { wch: 10 }, // 담당
    { wch: 10 }, // 확인
    { wch: 10 }, // 승인
  ];
  XLSX.utils.book_append_sheet(wb, ws, "이력카드");
  XLSX.writeFile(wb, "이력카드_양식.xlsx");
}

function HistoryCardImportDialog({
  equipmentId,
  open,
  onOpenChange,
  onDone,
}: {
  equipmentId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<{ performedAt: string; title: string; vendor: string; repairCost: string; performedBy: string; confirm: string; approve: string; error?: string }[]>([]);

  function reset() {
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<(string | number | Date)[]>(ws, { header: 1, raw: false });
        const dataRows = raw.slice(1).filter((r) => r.length > 0 && (r[0] || r[1]));
        const parsed = dataRows.map((r) => {
          const title = String(r[1] || "").trim();
          const errors: string[] = [];
          if (!title) errors.push("이력 필수");
          // 날짜 처리: Date 객체이면 ISO 변환, 문자열이면 그대로
          const dateVal = r[0];
          let dateStr = "";
          if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            dateStr = dateVal.toISOString().slice(0, 10);
          } else if (dateVal) {
            dateStr = String(dateVal).trim();
          }
          return {
            performedAt: dateStr,
            title,
            vendor: String(r[2] || "").trim(),
            repairCost: String(r[3] || "").trim(),
            performedBy: String(r[4] || "").trim(),
            confirm: String(r[5] || "").trim(),
            approve: String(r[6] || "").trim(),
            error: errors.length > 0 ? errors.join(", ") : undefined,
          };
        });
        setRows(parsed);
        toast.success(`${parsed.length}건 읽음`);
      } catch {
        toast.error("파일 분석 실패");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const validRows = rows.filter((r) => !r.error);

  async function handleImport() {
    setSaving(true);
    try {
      await bulkImportHistoryCards(
        validRows.map((r) => ({
          equipmentId,
          title: r.title,
          cardType: "REPAIR",
          performedAt: r.performedAt || undefined,
          performedBy: r.performedBy || undefined,
          vendor: r.vendor || undefined,
          repairCost: r.repairCost || null,
          repairDetail: r.title,
        }))
      );
      toast.success(`${validRows.length}건 등록 완료`);
      onOpenChange(false);
      reset();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>이력카드 엑셀 업로드</DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">엑셀 컬럼: 날짜, 이력(*), 업체, 금액, 담당, 확인, 승인</p>
              <Input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="max-w-xs" disabled={loading} />
              {loading && <p className="text-xs text-muted-foreground animate-pulse">분석 중...</p>}
            </div>
            <div className="text-center">
              <Button variant="link" size="sm" onClick={downloadTemplate}>
                <Download className="mr-1 h-3.5 w-3.5" />
                양식 다운로드
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="outline">전체 {rows.length}건</Badge>
              <Badge variant="default">정상 {validRows.length}건</Badge>
            </div>
            <div className="overflow-x-auto rounded border max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="px-2 py-1 text-left">날짜</th>
                    <th className="px-2 py-1 text-left">이력</th>
                    <th className="px-2 py-1 text-left">업체</th>
                    <th className="px-2 py-1 text-left">금액</th>
                    <th className="px-2 py-1 text-left">담당</th>
                    <th className="px-2 py-1 text-left">확인</th>
                    <th className="px-2 py-1 text-left">승인</th>
                    <th className="px-2 py-1 text-left">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t ${r.error ? "bg-red-50" : ""}`}>
                      <td className="px-2 py-1">{r.performedAt}</td>
                      <td className="px-2 py-1">{r.title}</td>
                      <td className="px-2 py-1">{r.vendor}</td>
                      <td className="px-2 py-1">{r.repairCost}</td>
                      <td className="px-2 py-1">{r.performedBy}</td>
                      <td className="px-2 py-1">{r.confirm}</td>
                      <td className="px-2 py-1">{r.approve}</td>
                      <td className="px-2 py-1">{r.error ? <span className="text-red-600">{r.error}</span> : "OK"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>다시 업로드</Button>
              <Button onClick={handleImport} disabled={saving || validRows.length === 0}>
                {saving ? "등록 중..." : `${validRows.length}건 등록`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Spec Tab ──

function SpecTab({
  equipment,
  canEdit,
  onRefresh,
}: {
  equipment: EquipmentDetail;
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [ratedOutput, setRatedOutput] = useState(equipment.ratedOutput || "");
  const [ratedVoltage, setRatedVoltage] = useState(equipment.ratedVoltage || "");
  const [ratedCurrent, setRatedCurrent] = useState(equipment.ratedCurrent || "");
  const [saving, setSaving] = useState(false);
  const [specFields, setSpecFields] = useState<SpecFieldItem[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newUnit, setNewUnit] = useState("");

  useEffect(() => {
    setRatedOutput(equipment.ratedOutput || "");
    setRatedVoltage(equipment.ratedVoltage || "");
    setRatedCurrent(equipment.ratedCurrent || "");
    // Load custom fields
    const vals: Record<string, string> = {};
    for (const sv of equipment.specValues) {
      vals[sv.fieldId] = sv.value;
    }
    setCustomValues(vals);
  }, [equipment]);

  useEffect(() => {
    getEquipmentSpecFields(equipment.siteCode).then(setSpecFields);
  }, [equipment.siteCode]);

  async function handleSaveSpecs() {
    setSaving(true);
    try {
      await updateEquipment(equipment.id, { ratedOutput, ratedVoltage, ratedCurrent });
      // Save custom values
      for (const field of specFields) {
        const val = customValues[field.id];
        if (val !== undefined) {
          await upsertEquipmentSpecValue(equipment.id, field.id, val);
        }
      }
      toast.success("사양이 저장되었습니다.");
      setEditing(false);
      onRefresh();
    } catch {
      toast.error("저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddField() {
    if (!newLabel.trim() || !newKey.trim()) {
      toast.error("표시명과 키를 입력하세요.");
      return;
    }
    try {
      await createEquipmentSpecField({
        siteCode: equipment.siteCode,
        label: newLabel,
        fieldKey: newKey,
        unit: newUnit || undefined,
      });
      toast.success("커스텀 항목이 추가되었습니다.");
      setAddFieldOpen(false);
      setNewLabel("");
      setNewKey("");
      setNewUnit("");
      const fields = await getEquipmentSpecFields(equipment.siteCode);
      setSpecFields(fields);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가 실패");
    }
  }

  async function handleDeleteField(id: string) {
    if (!confirm("이 사양 항목을 삭제하시겠습니까?")) return;
    try {
      await deleteEquipmentSpecField(id);
      toast.success("삭제되었습니다.");
      const fields = await getEquipmentSpecFields(equipment.siteCode);
      setSpecFields(fields);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">고정 사양</h3>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            사양 편집
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">제조사</span>
          <p>{equipment.manufacturer || "-"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">모델명</span>
          <p>{equipment.model || "-"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">시리얼 번호</span>
          <p>{equipment.serialNumber || "-"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">정격 출력</span>
          {editing ? (
            <Input value={ratedOutput} onChange={(e) => setRatedOutput(e.target.value)} className="h-7 text-sm mt-0.5" />
          ) : (
            <p>{equipment.ratedOutput || "-"}</p>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">정격 전압</span>
          {editing ? (
            <Input value={ratedVoltage} onChange={(e) => setRatedVoltage(e.target.value)} className="h-7 text-sm mt-0.5" />
          ) : (
            <p>{equipment.ratedVoltage || "-"}</p>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">정격 전류</span>
          {editing ? (
            <Input value={ratedCurrent} onChange={(e) => setRatedCurrent(e.target.value)} className="h-7 text-sm mt-0.5" />
          ) : (
            <p>{equipment.ratedCurrent || "-"}</p>
          )}
        </div>
      </div>

      {/* 커스텀 사양 */}
      {(specFields.length > 0 || canEdit) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">커스텀 사양</h3>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setAddFieldOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                커스텀 항목 추가
              </Button>
            )}
          </div>
          {specFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 커스텀 사양이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {specFields.map((f) => (
                <div key={f.id}>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">{f.label}{f.unit ? ` (${f.unit})` : ""}</span>
                    {canEdit && (
                      <button onClick={() => handleDeleteField(f.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <Input
                      value={customValues[f.id] || ""}
                      onChange={(e) => setCustomValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                      className="h-7 text-sm mt-0.5"
                    />
                  ) : (
                    <p>{customValues[f.id] || equipment.specValues.find((sv) => sv.fieldId === f.id)?.value || "-"}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>취소</Button>
          <Button size="sm" onClick={handleSaveSpecs} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      )}

      {/* 커스텀 항목 추가 다이얼로그 */}
      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>커스텀 사양 항목 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">표시명 *</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="예: 냉각방식" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">키 *</Label>
              <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="예: cooling_method" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">단위</Label>
              <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="예: kg" className="h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddFieldOpen(false)}>취소</Button>
            <Button onClick={handleAddField}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Drawer ──

interface EquipmentDetailDrawerProps {
  equipmentId: string | null;
  onClose: () => void;
}

export function EquipmentDetailDrawer({
  equipmentId,
  onClose,
}: EquipmentDetailDrawerProps) {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (sessionData?.user as any)?.role?.name;
  const canEdit = userRole === "ADMIN" || userRole === "MANAGER";

  const loadData = useCallback(async () => {
    if (!equipmentId) return;
    setLoading(true);
    try {
      const data = await getEquipmentById(equipmentId);
      setEquipment(data);
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStatusChange(newStatus: string) {
    if (!equipment) return;
    setStatusChanging(true);
    try {
      await updateEquipmentStatus(equipment.id, newStatus);
      toast.success("상태가 변경되었습니다.");
      await loadData();
      router.refresh();
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    } finally {
      setStatusChanging(false);
    }
  }

  const statusInfo = equipment ? (STATUS_MAP[equipment.status] || { label: equipment.status, variant: "default" as const }) : null;

  return (
    <Sheet open={!!equipmentId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{equipment?.name || "설비 상세"}</SheetTitle>
          <SheetDescription>설비 정보, 사양, 이력카드를 관리합니다.</SheetDescription>
        </SheetHeader>

        {loading && !equipment ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            불러오는 중...
          </div>
        ) : equipment ? (
          <Tabs defaultValue="basic" className="pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">기본정보</TabsTrigger>
              <TabsTrigger value="spec">설비 사양</TabsTrigger>
              <TabsTrigger value="history">이력카드</TabsTrigger>
            </TabsList>

            {/* 기본정보 탭 */}
            <TabsContent value="basic" className="space-y-6 pt-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">기본 정보</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">설비명</span>
                    <p className="font-medium">{equipment.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">위치</span>
                    <p className="font-medium">{equipment.location}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">모델명</span>
                    <p>{equipment.model || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">제조사</span>
                    <p>{equipment.manufacturer || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">시리얼 번호</span>
                    <p>{equipment.serialNumber || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">설치일</span>
                    <p>{formatDate(equipment.installDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">최종 점검일</span>
                    <p>{formatDate(equipment.lastInspection)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">차기 검사일</span>
                    <p>{formatDate(equipment.nextInspection)}</p>
                  </div>
                  {equipment.note && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">비고</span>
                      <p>{equipment.note}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 상태 변경 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">상태 관리</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">현재 상태:</span>
                  {statusInfo && (
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={equipment.status}
                    onValueChange={handleStatusChange}
                    disabled={statusChanging}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">가동중</SelectItem>
                      <SelectItem value="INACTIVE">비가동</SelectItem>
                      <SelectItem value="MAINTENANCE">점검중</SelectItem>
                      <SelectItem value="DISPOSED">폐기</SelectItem>
                    </SelectContent>
                  </Select>
                  {statusChanging && (
                    <span className="text-xs text-muted-foreground">변경중...</span>
                  )}
                </div>
              </div>

              {/* 도면 */}
              <DrawingSection equipment={equipment} />
            </TabsContent>

            {/* 설비 사양 탭 */}
            <TabsContent value="spec" className="pt-4">
              <SpecTab equipment={equipment} canEdit={canEdit} onRefresh={loadData} />
            </TabsContent>

            {/* 이력카드 탭 */}
            <TabsContent value="history" className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  이력카드
                  {equipment.historyCards.length > 0 && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      ({equipment.historyCards.length})
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="mr-1 h-3.5 w-3.5" />
                    양식 다운로드
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                    <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                    엑셀 업로드
                  </Button>
                  {!showAddCard && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddCard(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      추가
                    </Button>
                  )}
                </div>
              </div>

              {showAddCard && (
                <AddHistoryCardForm
                  equipmentId={equipment.id}
                  onDone={() => {
                    setShowAddCard(false);
                    loadData();
                  }}
                />
              )}

              {equipment.historyCards.length === 0 && !showAddCard ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  등록된 이력카드가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {equipment.historyCards.map((card) => (
                    <HistoryCardRow key={card.id} card={card} />
                  ))}
                </div>
              )}

              <HistoryCardImportDialog
                equipmentId={equipment.id}
                open={importOpen}
                onOpenChange={setImportOpen}
                onDone={loadData}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-12">
            <FileWarning className="mr-2 h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">설비를 찾을 수 없습니다.</span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
