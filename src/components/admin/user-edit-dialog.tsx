"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUser, createUser } from "@/actions/user-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  position: string | null;
  isAdmin: boolean;
  isActive: boolean;
  department: { id: string; name: string } | null;
  role: { id: string; name: string; displayName: string } | null;
}

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

interface DeptOption {
  id: string;
  name: string;
}

export function UserEditButton({
  user,
  roles,
  departments,
}: {
  user: UserData;
  roles: RoleOption[];
  departments: DeptOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(user.isActive);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateUser(user.id, {
        name: fd.get("name") as string,
        position: (fd.get("position") as string) || undefined,
        roleId: (fd.get("roleId") as string) || undefined,
        departmentId: (fd.get("departmentId") as string) || null,
        isAdmin,
        isActive,
      });
      toast.success("사용자 정보가 수정되었습니다.");
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
          <DialogTitle>사용자 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>이메일</Label>
            <Input value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input name="name" required defaultValue={user.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">직위</Label>
            <Input name="position" defaultValue={user.position || ""} />
          </div>
          <div className="space-y-2">
            <Label>역할</Label>
            <select name="roleId" defaultValue={user.role?.id || ""} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">없음</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>부서</Label>
            <select name="departmentId" defaultValue={user.department?.id || ""} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">없음</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <Label>관리자 권한</Label>
            <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
          </div>
          <div className="flex items-center justify-between">
            <Label>활성 상태</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "수정 중..." : "수정"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UserCreateButton({
  roles,
  departments,
}: {
  roles: RoleOption[];
  departments: DeptOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createUser({
        email: fd.get("email") as string,
        name: fd.get("name") as string,
        password: fd.get("password") as string,
        position: (fd.get("position") as string) || undefined,
        departmentId: (fd.get("departmentId") as string) || undefined,
        roleId: (fd.get("roleId") as string) || undefined,
      });
      toast.success("사용자가 생성되었습니다.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          사용자 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 사용자 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input name="email" type="email" required placeholder="user@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">초기 비밀번호</Label>
            <Input name="password" type="password" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">직위</Label>
            <Input name="position" placeholder="사원, 대리, 과장..." />
          </div>
          <div className="space-y-2">
            <Label>역할</Label>
            <select name="roleId" className="w-full rounded border px-3 py-2 text-sm">
              <option value="">없음</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>부서</Label>
            <select name="departmentId" className="w-full rounded border px-3 py-2 text-sm">
              <option value="">없음</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "생성 중..." : "생성"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
