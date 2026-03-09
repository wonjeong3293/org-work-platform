import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllDepartmentsForAdmin } from "@/actions/department-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DepartmentCreateButton,
  DepartmentEditButton,
  DepartmentDeleteButton,
} from "@/components/admin/department-form";

interface DeptWithRelations {
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

function buildFlatTree(
  depts: DeptWithRelations[],
  parentId: string | null = null,
  depth = 0
): { dept: DeptWithRelations; depth: number }[] {
  const result: { dept: DeptWithRelations; depth: number }[] = [];
  const children = depts
    .filter((d) => d.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const child of children) {
    result.push({ dept: child, depth });
    result.push(...buildFlatTree(depts, child.id, depth + 1));
  }
  return result;
}

export default async function AdminDepartmentsPage() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    redirect("/dashboard");
  }

  const allDepts = await getAllDepartmentsForAdmin();
  const flatTree = buildFlatTree(allDepts);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">부서 관리</h1>
          <p className="text-sm text-muted-foreground">
            부서 추가/수정/비활성화를 관리합니다. ({allDepts.filter((d) => d.isActive).length}개 활성)
          </p>
        </div>
        <DepartmentCreateButton allDepts={allDepts} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">부서 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">부서명</th>
                  <th className="pb-3 pr-4 font-medium">코드</th>
                  <th className="pb-3 pr-4 font-medium">소속 인원</th>
                  <th className="pb-3 pr-4 font-medium">하위 부서</th>
                  <th className="pb-3 pr-4 font-medium">상태</th>
                  <th className="pb-3 pr-4 font-medium">순서</th>
                  <th className="pb-3 font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {flatTree.map(({ dept, depth }) => (
                  <tr
                    key={dept.id}
                    className={`border-b last:border-0 ${!dept.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="py-3 pr-4">
                      <span
                        style={{ paddingLeft: `${depth * 20}px` }}
                        className="flex items-center gap-1"
                      >
                        {depth > 0 && <span className="text-gray-300">└</span>}
                        {dept.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline">{dept.code}</Badge>
                    </td>
                    <td className="py-3 pr-4">{dept._count.members}명</td>
                    <td className="py-3 pr-4">{dept._count.children}개</td>
                    <td className="py-3 pr-4">
                      <Badge variant={dept.isActive ? "default" : "secondary"}>
                        {dept.isActive ? "활성" : "비활성"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{dept.sortOrder}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <DepartmentEditButton dept={dept} allDepts={allDepts} />
                        <DepartmentDeleteButton dept={dept} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
