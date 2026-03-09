import { getSentApprovals } from "@/actions/approval-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Plus, Clock, Send } from "lucide-react";
import Link from "next/link";
import { APPROVAL_STATUS } from "@/lib/constants";
import { format } from "date-fns";

export default async function SentApprovalsPage() {
  const approvals = await getSentApprovals();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">결재 발신함</h1>
          <p className="text-sm text-muted-foreground">내가 올린 결재 문서입니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/approvals">수신함</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/approvals/new">
              <Plus className="mr-2 h-4 w-4" />
              새 결재
            </Link>
          </Button>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-12">
          <Send className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">발신한 결재 문서가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const status = APPROVAL_STATUS[approval.status as keyof typeof APPROVAL_STATUS];
            const statusVariant =
              approval.status === "APPROVED" ? "default" :
              approval.status === "REJECTED" ? "destructive" : "outline";
            return (
              <Link key={approval.id} href={`/approvals/${approval.id}`}>
                <Card className="transition-colors hover:bg-gray-50">
                  <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="rounded-lg bg-blue-50 p-2 shrink-0">
                        <FileCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <p className="font-medium truncate">{approval.title}</p>
                          {approval.urgency === "URGENT" && (
                            <Badge variant="destructive" className="text-xs">긴급</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                          <span>{approval.template?.name}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(approval.createdAt, "yyyy-MM-dd")}
                          </span>
                          <span>
                            결재선: {approval.steps.filter((s) => s.status === "APPROVED").length}/{approval.steps.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusVariant} className="self-start sm:self-center shrink-0">{status?.label}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
