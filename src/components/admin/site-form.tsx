"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSite, updateSite, deleteSite } from "@/actions/site-actions";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface SiteData {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export function SiteCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createSite({
        code: (fd.get("code") as string).toUpperCase(),
        name: fd.get("name") as string,
        sortOrder: Number(fd.get("sortOrder")) || 0,
      });
      toast.success("사업장이 추가되었습니다.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />사업장 추가</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사업장 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>사업장 코드</Label>
              <Input name="code" required placeholder="HS" />
            </div>
            <div className="space-y-2">
              <Label>사업장명</Label>
              <Input name="name" required placeholder="화성" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>정렬 순서</Label>
            <Input name="sortOrder" type="number" defaultValue={0} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "추가 중..." : "추가"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SiteEditButton({ site }: { site: SiteData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateSite(site.id, {
        name: fd.get("name") as string,
        isActive: fd.get("isActive") === "true",
        sortOrder: Number(fd.get("sortOrder")) || 0,
      });
      toast.success("사업장이 수정되었습니다.");
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
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사업장 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>사업장 코드</Label>
            <Input value={site.code} disabled />
          </div>
          <div className="space-y-2">
            <Label>사업장명</Label>
            <Input name="name" required defaultValue={site.name} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>정렬 순서</Label>
              <Input name="sortOrder" type="number" defaultValue={site.sortOrder} />
            </div>
            <div className="space-y-2">
              <Label>상태</Label>
              <select name="isActive" defaultValue={String(site.isActive)} className="w-full rounded border px-3 py-2 text-sm">
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "수정 중..." : "수정"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SiteDeleteButton({ site }: { site: SiteData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${site.name}(${site.code})" 사업장을 삭제하시겠습니까?`)) return;
    setLoading(true);
    try {
      await deleteSite(site.id);
      toast.success("사업장이 삭제되었습니다.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-red-500 hover:text-red-700"
      onClick={handleDelete}
      disabled={loading}
      title="삭제"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
