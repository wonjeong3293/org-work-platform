import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAllUsersForAdmin } from "@/actions/user-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCreateButton } from "@/components/admin/user-edit-dialog";
import { UserTable } from "@/components/admin/user-table";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    redirect("/dashboard");
  }

  const [users, roles, departments] = await Promise.all([
    getAllUsersForAdmin(),
    prisma.role.findMany({
      select: { id: true, name: true, displayName: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // Serialize dates for client component
  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground">
            사용자 목록 조회, 역할 변경, 활성/비활성 관리 ({users.length}명)
          </p>
        </div>
        <UserCreateButton roles={roles} departments={departments} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">사용자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable
            users={serializedUsers}
            roles={roles}
            departments={departments}
          />
        </CardContent>
      </Card>
    </div>
  );
}
