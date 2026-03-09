import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDocApprovals, getDocApprovalById } from "@/actions/doc-approval-actions";
import { getMenuNodeByModuleKey } from "@/actions/menu-actions";
import { DocApprovalTable } from "@/components/approval/doc-approval-table";
import { LatestApprovedCard } from "@/components/approval/latest-approved-card";
import Link from "next/link";
import { Plus } from "lucide-react";
import { parseTableSchema } from "@/lib/table-schema";

export default async function DocumentApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleKey: string }>;
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { moduleKey } = await params;
  const sp = await searchParams;
  const site = sp.site || "ALL";
  const year = Number(sp.year) || new Date().getFullYear();

  const menuNode = await getMenuNodeByModuleKey(moduleKey);
  const pageTitle = menuNode?.title || moduleKey;

  const approvals = await getDocApprovals(moduleKey, {
    siteCode: site,
    year,
  });

  const qs = new URLSearchParams();
  if (sp.site) qs.set("site", sp.site);
  if (sp.year) qs.set("year", sp.year);
  const qsStr = qs.toString();
  const qsSuffix = qsStr ? `?${qsStr}` : "";

  const serialized = approvals.map((a) => {
    let tableSchema = null;
    let headerData: Record<string, string> = {};
    let tableData: Record<string, string>[] = [];
    const isTable = a.formTemplate?.formType === "TABLE";
    if (isTable && a.formTemplate?.tableSchema) {
      tableSchema = parseTableSchema(a.formTemplate.tableSchema);
      try { headerData = JSON.parse(a.headerData); } catch {}
      try { tableData = JSON.parse(a.tableData); } catch {}
    }
    return {
      id: a.id,
      title: a.title,
      status: a.status,
      siteCode: a.siteCode,
      createdAt: a.createdAt.toISOString(),
      submitter: { name: a.submitter.name, position: a.submitter.position || "" },
      formTemplate: a.formTemplate ? { name: a.formTemplate.name, formType: a.formTemplate.formType } : null,
      isTable,
      tableSchema,
      headerData,
      tableData,
      steps: a.steps.map((s) => ({
        stepType: s.stepType,
        status: s.status,
        approverName: s.approver.name,
        approverPosition: s.approver.position || "",
        actionAt: s.actionAt?.toISOString() || null,
      })),
    };
  });

  // 최근 승인 문서 상세 조회 (PDF용)
  const latestApprovedSummary = approvals.find((a) => a.status === "APPROVED");
  let latestApprovedData = null;
  if (latestApprovedSummary) {
    const detail = await getDocApprovalById(latestApprovedSummary.id);
    if (detail) {
      const isTable = detail.formTemplate?.formType === "TABLE";
      let tableSchema = null;
      let headerData: Record<string, string> = {};
      let tableData: Record<string, string>[] = [];
      if (isTable && detail.formTemplate?.tableSchema) {
        tableSchema = parseTableSchema(detail.formTemplate.tableSchema);
        try { headerData = JSON.parse(detail.headerData); } catch {}
        try { tableData = JSON.parse(detail.tableData); } catch {}
      }
      latestApprovedData = {
        id: detail.id,
        title: detail.title,
        createdAt: detail.createdAt.toISOString(),
        submitter: { name: detail.submitter.name, position: detail.submitter.position || "" },
        isTable,
        tableSchema,
        headerData,
        tableData,
        steps: detail.steps.map((s) => ({
          stepType: s.stepType,
          status: s.status,
          approverName: s.approver.name,
          approverPosition: s.approver.position || "",
          actionAt: s.actionAt?.toISOString() || null,
        })),
      };
    }
  }

  // 현재 진행중인 결재
  const pendingCount = approvals.filter((a) => ["REQUESTED", "IN_PROGRESS"].includes(a.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground">문서 결재를 관리합니다.</p>
      </div>

      {/* 최근 승인 문서 + PDF */}
      {latestApprovedData && (
        <LatestApprovedCard
          data={latestApprovedData}
          moduleKey={moduleKey}
          qsSuffix={qsSuffix}
        />
      )}

      {/* 진행중 안내 */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2 border border-amber-200">
          <Badge variant="secondary" className="text-xs">{pendingCount}건</Badge>
          결재 대기 중인 문서가 있습니다.
        </div>
      )}

      {/* 문서 목록 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">결재 문서 이력</CardTitle>
          <Link href={`/documents/approval/${moduleKey}/new${qsSuffix}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 문서 작성
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <DocApprovalTable
            approvals={serialized}
            moduleKey={moduleKey}
            qsSuffix={qsSuffix}
          />
        </CardContent>
      </Card>
    </div>
  );
}
