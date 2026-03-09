"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserEditButton } from "@/components/admin/user-edit-dialog";
import { ArrowUpDown, Search } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  position: string | null;
  phone: string | null;
  employeeNumber: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string; // ISO string
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

type SortKey = "name" | "email" | "position" | "department" | "role" | "isActive" | "createdAt";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function UserTable({
  users,
  roles,
  departments,
}: {
  users: UserRow[];
  roles: RoleOption[];
  departments: DeptOption[];
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.position || "").toLowerCase().includes(q) ||
          (u.department?.name || "").toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let av = "";
      let bv = "";
      switch (sortKey) {
        case "name": av = a.name; bv = b.name; break;
        case "email": av = a.email; bv = b.email; break;
        case "position": av = a.position || ""; bv = b.position || ""; break;
        case "department": av = a.department?.name || ""; bv = b.department?.name || ""; break;
        case "role": av = a.role?.displayName || ""; bv = b.role?.displayName || ""; break;
        case "isActive": av = a.isActive ? "1" : "0"; bv = b.isActive ? "1" : "0"; break;
        case "createdAt": av = a.createdAt; bv = b.createdAt; break;
      }
      const cmp = av.localeCompare(bv, "ko");
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [users, search, sortKey, sortAsc]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="pb-3 pr-4 font-medium cursor-pointer select-none hover:text-foreground"
      onClick={() => handleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      </span>
    </th>
  );

  return (
    <>
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="이름, 이메일, 직위, 부서 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <SortHeader label="이름" k="name" />
              <SortHeader label="이메일" k="email" />
              <SortHeader label="직위" k="position" />
              <SortHeader label="부서" k="department" />
              <SortHeader label="역할" k="role" />
              <SortHeader label="상태" k="isActive" />
              <SortHeader label="가입일" k="createdAt" />
              <th className="pb-3 font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {user.name}
                    {user.isAdmin && (
                      <Badge variant="default" className="text-xs">관리자</Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{user.email}</td>
                <td className="py-3 pr-4">{user.position || "-"}</td>
                <td className="py-3 pr-4">{user.department?.name || "-"}</td>
                <td className="py-3 pr-4">
                  <Badge variant="outline">{user.role?.displayName || "없음"}</Badge>
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "활성" : "비활성"}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
                <td className="py-3">
                  <UserEditButton
                    user={user}
                    roles={roles}
                    departments={departments}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
