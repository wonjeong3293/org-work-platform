import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDocApprovalById } from "@/actions/doc-approval-actions";
import { ApprovalStamp } from "@/components/approval/approval-stamp";
import { ApprovalActionButtons } from "@/components/approval/approval-action-buttons";
import { TableDocumentView } from "@/components/approval/table-document-view";
import { TableDocumentPdfButton } from "@/components/approval/table-document-pdf";
import { TableExcelDownloadButton } from "@/components/approval/table-excel-download-button";
import { parseTableSchema } from "@/lib/table-schema";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "임시저장", variant: "outline" },
  REQUESTED: { label: "결재요청", variant: "secondary" },
  IN_PROGRESS: { label: "결재중", variant: "secondary" },
  APPROVED: { label: "승인완료", variant: "default" },
  REJECTED: { label: "반려", variant: "destructive" },
};

export default async function DocApprovalDetailPage({
  params,
}: {
  params: Promise<{ moduleKey: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { moduleKey, id } = await params;
  const approval = await getDocApprovalById(id);
  if (!approval) redirect(`/documents/approval/${moduleKey}`);

  const sc = STATUS_CONFIG[approval.status] || { label: approval.status, variant: "outline" as const };
  const currentUserId = session.user.id;
  const isSubmitter = approval.submitterId === currentUserId;

  // Determine if table type
  const isTableType = approval.formTemplate?.formType === "TABLE";

  // Parse form data (for FORM type)
  let formData: Record<string, unknown> = {};
  try { formData = JSON.parse(approval.formData); } catch {}

  let formSchema: { id: string; label: string; type: string }[] = [];
  try {
    if (approval.formTemplate?.formSchema && !isTableType) {
      formSchema = JSON.parse(approval.formTemplate.formSchema);
    }
  } catch {}

  // Parse table data (for TABLE type)
  let tableSchema = null;
  let headerData: Record<string, string> = {};
  let tableData: Record<string, string>[] = [];
  if (isTableType && approval.formTemplate?.tableSchema) {
    tableSchema = parseTableSchema(approval.formTemplate.tableSchema);
    try { headerData = JSON.parse(approval.headerData); } catch {}
    try { tableData = JSON.parse(approval.tableData); } catch {}
  }

  const stampSteps = approval.steps.map((s) => ({
    stepType: s.stepType,
    status: s.status,
    approverName: s.approver.name,
    approverPosition: s.approver.position || "",
    actionAt: s.actionAt?.toISOString() || null,
    comment: s.comment,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{approval.title}</h1>
          <p className="text-muted-foreground">
            {approval.formTemplate?.name || "문서"} | {approval.submitter.name}
            {approval.submitter.position && ` (${approval.submitter.position})`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isTableType && tableSchema && (
            <>
              <TableExcelDownloadButton
                title={approval.title}
                tableSchema={tableSchema}
                headerData={headerData}
                tableData={tableData}
              />
              <TableDocumentPdfButton
                title={approval.title}
                tableSchema={tableSchema}
                headerData={headerData}
                tableData={tableData}
                submitter={{ name: approval.submitter.name, position: approval.submitter.position || "" }}
                steps={stampSteps}
              />
            </>
          )}
          <Badge variant={sc.variant} className="text-sm px-3 py-1">{sc.label}</Badge>
        </div>
      </div>

      {/* 결재칸 */}
      {approval.steps.length > 0 && (
        <ApprovalStamp
          submitter={{ name: approval.submitter.name, position: approval.submitter.position || "" }}
          steps={stampSteps}
        />
      )}

      {/* 정형 테이블 문서 */}
      {isTableType && tableSchema ? (
        <TableDocumentView
          tableSchema={tableSchema}
          headerData={headerData}
          tableData={tableData}
        />
      ) : (
        /* 일반 양식 데이터 */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">문서 내용</CardTitle>
          </CardHeader>
          <CardContent>
            {formSchema.length > 0 ? (
              <div className="space-y-4">
                {formSchema.map((field) => (
                  <div key={field.id} className="grid grid-cols-3 gap-4 border-b pb-3 last:border-0">
                    <span className="text-sm font-medium text-muted-foreground">{field.label}</span>
                    <span className="col-span-2 text-sm">
                      {String(formData[field.id] ?? "-")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm">
                {approval.formData !== "{}" ? JSON.stringify(formData, null, 2) : "내용 없음"}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 결재 의견 */}
      {approval.steps.some((s) => s.comment) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">결재 의견</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approval.steps.filter((s) => s.comment || s.status !== "PENDING").map((step) => (
                <div key={step.id} className="flex items-start gap-3 text-sm">
                  <Badge variant={step.status === "APPROVED" ? "default" : step.status === "REJECTED" ? "destructive" : "outline"} className="text-xs shrink-0">
                    {step.status === "APPROVED" ? "승인" : step.status === "REJECTED" ? "반려" : step.status}
                  </Badge>
                  <div>
                    <span className="font-medium">{step.approver.name}</span>
                    {step.approver.position && <span className="text-muted-foreground ml-1">({step.approver.position})</span>}
                    {step.actionAt && <span className="text-muted-foreground ml-2">{new Date(step.actionAt).toLocaleString("ko-KR")}</span>}
                    {step.comment && <p className="mt-1 text-muted-foreground">{step.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결재 처리 버튼 */}
      <ApprovalActionButtons
        approvalId={id}
        status={approval.status}
        currentUserId={currentUserId}
        isSubmitter={isSubmitter}
        steps={approval.steps.map((s) => ({
          approverId: s.approverId,
          status: s.status,
        }))}
      />
    </div>
  );
}
