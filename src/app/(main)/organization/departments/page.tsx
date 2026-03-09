import { getDepartments } from "@/actions/department-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users } from "lucide-react";

export default async function DepartmentsPage() {
  const departments = await getDepartments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">부서 관리</h1>
        <p className="text-muted-foreground">부서를 조회하고 관리합니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{dept.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{dept.code}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{dept._count.members}명</span>
                </div>
                {dept.parent && (
                  <Badge variant="outline">{dept.parent.name}</Badge>
                )}
              </div>
              {dept.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {dept.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
