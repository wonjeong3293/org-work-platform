"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createEquipment } from "@/actions/equipment-actions";

export function EquipmentCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createEquipment({
        name: fd.get("name") as string,
        location: fd.get("location") as string,
        model: (fd.get("model") as string) || undefined,
        manufacturer: (fd.get("manufacturer") as string) || undefined,
        serialNumber: (fd.get("serialNumber") as string) || undefined,
        installDate: (fd.get("installDate") as string) || undefined,
        lastInspection: (fd.get("lastInspection") as string) || undefined,
        nextInspection: (fd.get("nextInspection") as string) || undefined,
        status: (fd.get("status") as string) || "ACTIVE",
        siteCode: (fd.get("siteCode") as string) || "ALL",
        note: (fd.get("note") as string) || undefined,
      });
      toast.success("설비가 등록되었습니다.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("설비 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          신규 설비 등록
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>신규 설비 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">설비명 *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">위치 *</Label>
              <Input id="location" name="location" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="model">모델명</Label>
              <Input id="model" name="model" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manufacturer">제조사</Label>
              <Input id="manufacturer" name="manufacturer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="serialNumber">시리얼 번호</Label>
              <Input id="serialNumber" name="serialNumber" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siteCode">사업장</Label>
              <Select name="siteCode" defaultValue="ALL">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체</SelectItem>
                  <SelectItem value="HS">화성</SelectItem>
                  <SelectItem value="PT">평택</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">상태</Label>
              <Select name="status" defaultValue="ACTIVE">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">가동중</SelectItem>
                  <SelectItem value="INACTIVE">비가동</SelectItem>
                  <SelectItem value="MAINTENANCE">점검중</SelectItem>
                  <SelectItem value="DISPOSED">폐기</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="installDate">설치일</Label>
              <Input id="installDate" name="installDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lastInspection">최종 점검일</Label>
              <Input id="lastInspection" name="lastInspection" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextInspection">차기 검사일</Label>
              <Input id="nextInspection" name="nextInspection" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">비고</Label>
            <Input id="note" name="note" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "등록중..." : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
