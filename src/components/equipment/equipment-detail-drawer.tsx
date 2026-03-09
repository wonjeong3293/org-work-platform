"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  Download,
  Eye,
  Upload,
  Trash2,
  Plus,
  FileText,
  FileWarning,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import {
  getEquipmentById,
  updateEquipmentStatus,
  createHistoryCard,
  deleteHistoryCard,
} from "@/actions/equipment-actions";
import type { EquipmentDetail, HistoryCardItem } from "@/actions/equipment-actions";

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

// ── Drawing Section ──

function DrawingSection({ equipment }: { equipment: EquipmentDetail }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

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
          </div>

          {/* PDF/Image Preview Modal */}
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
      </div>

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createHistoryCard(equipmentId, {
        title: fd.get("title") as string,
        content: (fd.get("content") as string) || undefined,
        cardType: fd.get("cardType") as string,
        performedAt: (fd.get("performedAt") as string) || undefined,
        performedBy: (fd.get("performedBy") as string) || undefined,
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
          <Select name="cardType" defaultValue="INSPECTION">
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
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

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
          <SheetDescription>설비 정보, 도면, 이력카드를 관리합니다.</SheetDescription>
        </SheetHeader>

        {loading && !equipment ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            불러오는 중...
          </div>
        ) : equipment ? (
          <div className="space-y-6 pt-4">
            {/* 기본 정보 */}
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

            {/* 이력카드 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  이력카드
                  {equipment.historyCards.length > 0 && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      ({equipment.historyCards.length})
                    </span>
                  )}
                </h3>
                {!showAddCard && (
                  <Button variant="outline" size="sm" onClick={() => setShowAddCard(true)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    추가
                  </Button>
                )}
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
            </div>
          </div>
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
