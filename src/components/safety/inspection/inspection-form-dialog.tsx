"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SafetyInspectionListItem,
  EquipmentTypeOption,
} from "@/actions/safety-inspection-actions";
import {
  createSafetyInspectionItem,
  updateSafetyInspectionItem,
} from "@/actions/safety-inspection-actions";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentTypes: EquipmentTypeOption[];
  sites: Array<{ code: string; name: string }>;
  currentSite: string;
  currentYear: number;
  editData?: SafetyInspectionListItem | null;
}

export function InspectionFormDialog({
  open,
  onOpenChange,
  equipmentTypes,
  sites,
  currentSite,
  currentYear,
  editData,
}: Props) {
  const isEdit = !!editData;
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    siteCode: editData?.siteCode || currentSite || "ALL",
    equipmentTypeId: editData?.equipmentTypeId || "",
    code: editData?.code || "",
    spec: editData?.spec || "",
    location: editData?.location || "",
    capacity: editData?.capacity || "",
    lastInspectionDate: editData?.lastInspectionDate
      ? editData.lastInspectionDate.split("T")[0]
      : "",
    expiryDate: editData?.expiryDate ? editData.expiryDate.split("T")[0] : "",
    certNo: editData?.certNo || "",
    memo: editData?.memo || "",
  });

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.equipmentTypeId) {
      toast.error("장비종류를 선택해주세요.");
      return;
    }
    if (!form.code.trim()) {
      toast.error("관리번호를 입력해주세요.");
      return;
    }
    if (!form.location.trim()) {
      toast.error("설치장소를 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && editData) {
          await updateSafetyInspectionItem(editData.id, {
            equipmentTypeId: form.equipmentTypeId,
            code: form.code,
            spec: form.spec || undefined,
            location: form.location,
            capacity: form.capacity || undefined,
            lastInspectionDate: form.lastInspectionDate || null,
            expiryDate: form.expiryDate || null,
            certNo: form.certNo || null,
            memo: form.memo || null,
          });
          toast.success("수정되었습니다.");
        } else {
          await createSafetyInspectionItem({
            siteCode: form.siteCode,
            year: currentYear,
            equipmentTypeId: form.equipmentTypeId,
            code: form.code,
            spec: form.spec || undefined,
            location: form.location,
            capacity: form.capacity || undefined,
            lastInspectionDate: form.lastInspectionDate || undefined,
            expiryDate: form.expiryDate || undefined,
            certNo: form.certNo || undefined,
            memo: form.memo || undefined,
          });
          toast.success("장비가 추가되었습니다.");
        }
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "장비 수정" : "장비 추가"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <Label>사업장</Label>
              <Select value={form.siteCode} onValueChange={(v) => updateField("siteCode", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">통합</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>장비종류 *</Label>
            <Select value={form.equipmentTypeId} onValueChange={(v) => updateField("equipmentTypeId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {equipmentTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>관리번호 *</Label>
              <Input
                value={form.code}
                onChange={(e) => updateField("code", e.target.value)}
                placeholder="예: PR-001"
              />
            </div>
            <div>
              <Label>형식(규격)</Label>
              <Input
                value={form.spec}
                onChange={(e) => updateField("spec", e.target.value)}
                placeholder="예: 200톤"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>설치장소 *</Label>
              <Input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="예: 1공장"
              />
            </div>
            <div>
              <Label>용량</Label>
              <Input
                value={form.capacity}
                onChange={(e) => updateField("capacity", e.target.value)}
                placeholder="예: 5톤"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>전 검사일</Label>
              <Input
                type="date"
                value={form.lastInspectionDate}
                onChange={(e) => updateField("lastInspectionDate", e.target.value)}
              />
            </div>
            <div>
              <Label>기간만료</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => updateField("expiryDate", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>검사증 번호</Label>
            <Input
              value={form.certNo}
              onChange={(e) => updateField("certNo", e.target.value)}
            />
          </div>

          <div>
            <Label>비고</Label>
            <Textarea
              value={form.memo}
              onChange={(e) => updateField("memo", e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : isEdit ? "수정" : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
