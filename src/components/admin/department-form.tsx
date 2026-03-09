"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDepartment, updateDepartment, deleteDepartment } from "@/actions/department-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface DeptFlat {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  _count: { members: number; children: number };
}

export function DepartmentCreateButton({ allDepts }: { allDepts: DeptFlat[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createDepartment({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        description: (fd.get("description") as string) || undefined,
        parentId: (fd.get("parentId") as string) || undefined,
        sortOrder: Number(fd.get("sortOrder")) || 0,
      });
      toast.success("부서가 추가되었습니다.");
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          부서 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>부서 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DepartmentFormFields activeDepts={allDepts.filter((d) => d.isActive)} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "추가 중..." : "추가"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentEditButton({
  dept,
  allDepts,
}: {
  dept: DeptFlat;
  allDepts: DeptFlat[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateDepartment(dept.id, {
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        description: (fd.get("description") as string) || null,
        parentId: (fd.get("parentId") as string) || null,
        sortOrder: Number(fd.get("sortOrder")) || 0,
      });
      toast.success("부서가 수정되었습니다.");
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
          <DialogTitle>부서 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DepartmentFormFields
            activeDepts={allDepts.filter((d) => d.isActive && d.id !== dept.id)}
            defaultValues={dept}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "수정 중..." : "수정"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentDeleteButton({ dept }: { dept: DeptFlat }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${dept.name}" 부서를 비활성화하시겠습니까?`)) return;
    setLoading(true);
    try {
      await deleteDepartment(dept.id);
      toast.success("부서가 비활성화되었습니다.");
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
      disabled={loading || !dept.isActive}
      title={!dept.isActive ? "이미 비활성화된 부서입니다" : "비활성화"}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function DepartmentFormFields({
  activeDepts,
  defaultValues,
}: {
  activeDepts: DeptFlat[];
  defaultValues?: Partial<DeptFlat>;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">부서명</Label>
          <Input name="name" required defaultValue={defaultValues?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">부서 코드</Label>
          <Input name="code" required defaultValue={defaultValues?.code} placeholder="DEV" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea name="description" defaultValue={defaultValues?.description || ""} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>상위 부서</Label>
          <select
            name="parentId"
            defaultValue={defaultValues?.parentId || ""}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">없음 (최상위)</option>
            {activeDepts.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">정렬 순서</Label>
          <Input name="sortOrder" type="number" defaultValue={defaultValues?.sortOrder ?? 0} />
        </div>
      </div>
    </>
  );
}
