import { getApprovalById, processApprovalAction, withdrawApproval } from "@/actions/approval-actions";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { APPROVAL_STATUS, APPROVAL_STEP_TYPE, APPROVAL_STEP_STATUS } from "@/lib/constants";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, MinusCircle } from "lucide-react";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ approvalId: string }>;
}) {
  const { approvalId } = await params;
  const approval = await getApprovalById(approvalId);
  if (!approval) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  const isSubmitter = approval.submitterId === userId;
  const canWithdraw = isSubmitter && ["PENDING", "IN_PROGRESS"].includes(approval.status);

  const currentStep = approval.steps.find(
    (s) => s.approverId === userId && s.status === "PENDING"
  );
  const canAction = !!currentStep && ["PENDING", "IN_PROGRESS"].includes(approval.status);

  const status = APPROVAL_STATUS[approval.status as keyof typeof APPROVAL_STATUS];
  const statusVariant =
    approval.status === "APPROVED" ? "default" :
    approval.status === "REJECTED" ? "destructive" :
    approval.status === "WITHDRAWN" ? "secondary" : "outline";

  async function handleApprove(formData: FormData) {
    "use server";
    await processApprovalAction(approvalId, "APPROVED", formData.get("comment") as string);
  }

  async function handleReject(formData: FormData) {
    "use server";
    await processApprovalAction(approvalId, "REJECTED", formData.get("comment") as string);
  }

  async function handleWithdraw() {
    "use server";
    await withdrawApproval(approvalId);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{approval.title}</h1>
            {approval.urgency === "URGENT" && (
              <Badge variant="destructive">긴급</Badge>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant={statusVariant}>{status?.label}</Badge>
            {approval.template && (
              <span>[{approval.template.category}] {approval.template.name}</span>
            )}
            <span>{format(approval.createdAt, "yyyy-MM-dd HH:mm")}</span>
          </div>
        </div>
        {canWithdraw && (
          <form action={handleWithdraw}>
            <Button variant="outline" type="submit" className="text-orange-600">
              회수
            </Button>
          </form>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기안자</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={approval.submitter.profileImage || undefined} />
                <AvatarFallback>{approval.submitter.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{approval.submitter.name}</p>
                <p className="text-sm text-muted-foreground">
                  {approval.submitter.position} · {approval.submitter.department?.name}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">내용</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">{approval.content}</div>
            </CardContent>
          </Card>

          {canAction && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">결재 처리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea name="comment" form="approve-form" placeholder="결재 의견 (선택)" />
                <div className="flex gap-3">
                  <form id="approve-form" action={handleApprove}>
                    <input type="hidden" name="comment" />
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      승인
                    </Button>
                  </form>
                  <form action={handleReject}>
                    <input type="hidden" name="comment" />
                    <Button type="submit" variant="destructive">
                      <XCircle className="mr-2 h-4 w-4" />
                      반려
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">결재선</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approval.steps.map((step, idx) => {
                const stepType = APPROVAL_STEP_TYPE[step.type as keyof typeof APPROVAL_STEP_TYPE];
                const stepStatus = APPROVAL_STEP_STATUS[step.status as keyof typeof APPROVAL_STEP_STATUS];
                const icon =
                  step.status === "APPROVED" ? <CheckCircle className="h-5 w-5 text-green-500" /> :
                  step.status === "REJECTED" ? <XCircle className="h-5 w-5 text-red-500" /> :
                  step.status === "SKIPPED" ? <MinusCircle className="h-5 w-5 text-gray-400" /> :
                  <Clock className="h-5 w-5 text-yellow-500" />;

                return (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {icon}
                      {idx < approval.steps.length - 1 && (
                        <div className="mt-1 h-full w-px bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{step.approver.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {stepType?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {step.approver.position} · {stepStatus?.label}
                      </p>
                      {step.actionAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(step.actionAt, "yyyy-MM-dd HH:mm")}
                        </p>
                      )}
                      {step.comment && (
                        <p className="mt-1 rounded bg-gray-50 p-2 text-xs">
                          {step.comment}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
