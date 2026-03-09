import { getDepartmentTree } from "@/actions/department-actions";
import { OrgChart } from "@/components/organization/org-chart";

export default async function OrganizationPage() {
  const departments = await getDepartmentTree();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">조직도</h1>
        <p className="text-muted-foreground">조직 구조와 구성원을 확인합니다.</p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OrgChart departments={departments as any} />
    </div>
  );
}
