import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllDocApprovals } from "@/actions/doc-approval-actions";
import { AdminApprovalTable } from "@/components/admin/admin-approval-table";

export default async function AdminApprovalsPage() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    redirect("/dashboard");
  }

  const approvals = await getAllDocApprovals();

  const serialized = approvals.map((a) => ({
    id: a.id,
    moduleKey: a.moduleKey,
    title: a.title,
    status: a.status,
    siteCode: a.siteCode,
    year: a.year,
    createdAt: a.createdAt.toISOString(),
    submitter: { name: a.submitter.name, position: a.submitter.position },
    formTemplate: a.formTemplate ? { name: a.formTemplate.name, formType: a.formTemplate.formType } : null,
    stepCount: a.steps.length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">결재 관리</h1>
        <p className="text-muted-foreground">
          전체 결재 문서를 관리합니다. 테스트 데이터를 선택하여 삭제할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">결재 문서 목록 ({serialized.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminApprovalTable approvals={serialized} />
        </CardContent>
      </Card>
    </div>
  );
}
