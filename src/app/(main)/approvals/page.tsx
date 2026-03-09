import {
  getPendingMyApprovalDocs,
  getMyInProgressApprovals,
  getMyCompletedApprovals,
  getRejectedApprovals,
  getReferenceApprovals,
  getDepartmentApprovals,
} from "@/actions/doc-approval-actions";
import { ApprovalInbox } from "@/components/approval/approval-inbox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function ApprovalsPage() {
  const [pending, inProgress, completed, rejected, reference, department] = await Promise.all([
    getPendingMyApprovalDocs(),
    getMyInProgressApprovals(),
    getMyCompletedApprovals(),
    getRejectedApprovals(),
    getReferenceApprovals(),
    getDepartmentApprovals(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">결재함</h1>
          <p className="text-sm text-muted-foreground">결재 문서를 관리합니다.</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/approvals/new">
            <Plus className="mr-2 h-4 w-4" />
            새 결재
          </Link>
        </Button>
      </div>

      <ApprovalInbox
        pending={JSON.parse(JSON.stringify(pending))}
        inProgress={JSON.parse(JSON.stringify(inProgress))}
        completed={JSON.parse(JSON.stringify(completed))}
        rejected={JSON.parse(JSON.stringify(rejected))}
        reference={JSON.parse(JSON.stringify(reference))}
        department={JSON.parse(JSON.stringify(department))}
      />
    </div>
  );
}
