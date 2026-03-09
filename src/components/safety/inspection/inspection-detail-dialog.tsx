"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, Clock, Image as ImageIcon } from "lucide-react";
import type { SafetyInspectionDetail } from "@/actions/safety-inspection-actions";
import {
  getSafetyInspectionById,
  addInspectionHistory,
  deleteSafetyInspectionPhoto,
} from "@/actions/safety-inspection-actions";
import {
  getInspectionStatus,
  formatDDay,
  formatDate,
} from "@/lib/safety-inspection-utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
}

export function InspectionDetailDialog({ open, onOpenChange, itemId }: Props) {
  const [detail, setDetail] = useState<SafetyInspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [historyForm, setHistoryForm] = useState({
    inspectionDate: "",
    expiryDate: "",
    certNo: "",
    memo: "",
  });

  const loadDetail = async () => {
    setLoading(true);
    const data = await getSafetyInspectionById(itemId);
    setDetail(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open && itemId) {
      loadDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("itemId", itemId);

    try {
      const res = await fetch("/api/safety/inspection/photo/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("사진이 업로드되었습니다.");
      loadDetail();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("사진을 삭제하시겠습니까?")) return;
    try {
      await deleteSafetyInspectionPhoto(photoId);
      toast.success("사진이 삭제되었습니다.");
      loadDetail();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  };

  const handleAddHistory = () => {
    if (!historyForm.inspectionDate) {
      toast.error("검사일을 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        await addInspectionHistory({
          safetyInspectionItemId: itemId,
          inspectionDate: historyForm.inspectionDate,
          expiryDate: historyForm.expiryDate || undefined,
          certNo: historyForm.certNo || undefined,
          memo: historyForm.memo || undefined,
        });
        toast.success("검사 이력이 추가되었습니다.");
        setShowHistoryForm(false);
        setHistoryForm({ inspectionDate: "", expiryDate: "", certNo: "", memo: "" });
        loadDetail();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "추가에 실패했습니다.");
      }
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!detail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <p className="text-muted-foreground">데이터를 찾을 수 없습니다.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const statusInfo = getInspectionStatus(detail.expiryDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            장비 상세 - {detail.code}
            <Badge variant={statusInfo.badgeVariant}>{statusInfo.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">장비종류:</span>{" "}
            <span className="font-medium">{detail.equipmentTypeName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">관리번호:</span>{" "}
            <span className="font-medium">{detail.code}</span>
          </div>
          <div>
            <span className="text-muted-foreground">형식(규격):</span>{" "}
            {detail.spec || "-"}
          </div>
          <div>
            <span className="text-muted-foreground">설치장소:</span>{" "}
            {detail.location}
          </div>
          <div>
            <span className="text-muted-foreground">용량:</span>{" "}
            {detail.capacity || "-"}
          </div>
          <div>
            <span className="text-muted-foreground">검사증 번호:</span>{" "}
            {detail.certNo || "-"}
          </div>
          <div>
            <span className="text-muted-foreground">전 검사일:</span>{" "}
            {formatDate(detail.lastInspectionDate)}
          </div>
          <div>
            <span className="text-muted-foreground">기간만료:</span>{" "}
            {formatDate(detail.expiryDate)}
            {statusInfo.dDay !== null && (
              <span className="ml-1 font-medium">({formatDDay(statusInfo.dDay)})</span>
            )}
          </div>
          {detail.memo && (
            <div className="col-span-2">
              <span className="text-muted-foreground">비고:</span> {detail.memo}
            </div>
          )}
        </div>

        <Separator />

        {/* 사진 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-sm">
              <ImageIcon className="h-4 w-4" />
              사진 ({detail.photos.length})
            </h3>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
              />
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  사진 추가
                </span>
              </Button>
            </label>
          </div>
          {detail.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {detail.photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/safety/inspection/photo/download/${photo.id}`}
                    alt={photo.fileName}
                    className="h-24 w-full rounded border object-cover"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-1 right-1 hidden rounded bg-red-500 px-1.5 py-0.5 text-[10px] text-white group-hover:block"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">등록된 사진이 없습니다.</p>
          )}
        </div>

        <Separator />

        {/* 검사 이력 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-sm">
              <Clock className="h-4 w-4" />
              검사 이력 ({detail.histories.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryForm(!showHistoryForm)}
            >
              이력 추가
            </Button>
          </div>

          {showHistoryForm && (
            <div className="mb-3 space-y-2 rounded border p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">검사일 *</Label>
                  <Input
                    type="date"
                    value={historyForm.inspectionDate}
                    onChange={(e) =>
                      setHistoryForm((p) => ({ ...p, inspectionDate: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">만료일</Label>
                  <Input
                    type="date"
                    value={historyForm.expiryDate}
                    onChange={(e) =>
                      setHistoryForm((p) => ({ ...p, expiryDate: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">검사증 번호</Label>
                <Input
                  value={historyForm.certNo}
                  onChange={(e) =>
                    setHistoryForm((p) => ({ ...p, certNo: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">메모</Label>
                <Textarea
                  value={historyForm.memo}
                  onChange={(e) =>
                    setHistoryForm((p) => ({ ...p, memo: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistoryForm(false)}
                >
                  취소
                </Button>
                <Button size="sm" onClick={handleAddHistory} disabled={isPending}>
                  {isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          )}

          {detail.histories.length > 0 ? (
            <div className="space-y-2">
              {detail.histories.map((h) => (
                <div
                  key={h.id}
                  className="rounded border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      검사일: {formatDate(h.inspectionDate)}
                    </span>
                    {h.expiryDate && (
                      <span className="text-muted-foreground">
                        만료: {formatDate(h.expiryDate)}
                      </span>
                    )}
                  </div>
                  {h.certNo && (
                    <p className="text-xs text-muted-foreground">
                      검사증: {h.certNo}
                    </p>
                  )}
                  {h.memo && (
                    <p className="text-xs text-muted-foreground">{h.memo}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">등록된 이력이 없습니다.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
