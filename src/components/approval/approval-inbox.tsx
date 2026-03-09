"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Send, CheckCircle, XCircle, Eye, Building2, FileCheck } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { APPROVAL_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ApprovalStep = {
  id: string;
  stepOrder: number;
  stepType: string;
  status: string;
  comment?: string | null;
  actionAt?: Date | null;
  approver: { id: string; name: string | null; position: string | null };
};

type ApprovalItem = {
  id: string;
  moduleKey: string;
  title: string;
  status: string;
  createdAt: Date;
  completedAt?: Date | null;
  submitter: { name: string | null; position: string | null };
  formTemplate: { name: string; formType: string } | null;
  steps: ApprovalStep[];
};

type TabKey = "pending" | "inProgress" | "completed" | "rejected" | "reference" | "department";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: typeof Clock;
  color: string;
  borderColor: string;
  bgColor: string;
}

const TABS: TabConfig[] = [
  { key: "pending", label: "결재대기", icon: Clock, color: "text-orange-600", borderColor: "border-l-orange-500", bgColor: "bg-orange-50" },
  { key: "inProgress", label: "진행함", icon: Send, color: "text-blue-600", borderColor: "border-l-blue-500", bgColor: "bg-blue-50" },
  { key: "completed", label: "완료함", icon: CheckCircle, color: "text-green-600", borderColor: "border-l-green-500", bgColor: "bg-green-50" },
  { key: "rejected", label: "반려함", icon: XCircle, color: "text-red-600", borderColor: "border-l-red-500", bgColor: "bg-red-50" },
  { key: "reference", label: "참조함", icon: Eye, color: "text-purple-600", borderColor: "border-l-purple-500", bgColor: "bg-purple-50" },
  { key: "department", label: "부서문서함", icon: Building2, color: "text-teal-600", borderColor: "border-l-teal-500", bgColor: "bg-teal-50" },
];

interface ApprovalInboxProps {
  pending: ApprovalItem[];
  inProgress: ApprovalItem[];
  completed: ApprovalItem[];
  rejected: ApprovalItem[];
  reference: ApprovalItem[];
  department: ApprovalItem[];
}

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  REQUESTED: "outline",
  IN_PROGRESS: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

function ApprovalLineProgress({ steps }: { steps: ApprovalStep[] }) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              step.status === "APPROVED" && "bg-green-500",
              step.status === "REJECTED" && "bg-red-500",
              step.status === "PENDING" && "bg-gray-300",
              step.status === "SKIPPED" && "bg-yellow-400"
            )}
            title={`${step.approver.name} (${step.status})`}
          />
          {i < steps.length - 1 && <div className="h-px w-3 bg-gray-300" />}
        </div>
      ))}
    </div>
  );
}

export function ApprovalInbox({ pending, inProgress, completed, rejected, reference, department }: ApprovalInboxProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const dataMap: Record<TabKey, ApprovalItem[]> = {
    pending,
    inProgress,
    completed,
    rejected,
    reference,
    department,
  };

  const counts: Record<TabKey, number> = {
    pending: pending.length,
    inProgress: inProgress.length,
    completed: completed.length,
    rejected: rejected.length,
    reference: reference.length,
    department: department.length,
  };

  const activeItems = dataMap[activeTab];
  const activeTabConfig = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      {/* Tab cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="text-left"
            >
              <Card
                className={cn(
                  "border-l-4 transition-all cursor-pointer hover:shadow-md",
                  tab.borderColor,
                  isActive && "ring-2 ring-offset-1 ring-gray-400 shadow-md"
                )}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className={cn("rounded-lg p-1.5 w-fit", tab.bgColor)}>
                    <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", tab.color)} />
                  </div>
                  <p className="mt-2 text-xs sm:text-sm font-medium text-muted-foreground">{tab.label}</p>
                  <p className="text-lg sm:text-xl font-bold">{counts[tab.key]}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Active tab list */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <activeTabConfig.icon className={cn("h-5 w-5", activeTabConfig.color)} />
          {activeTabConfig.label}
          <Badge variant="secondary" className="ml-1">{activeItems.length}</Badge>
        </h2>

        {activeItems.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">문서가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeItems.map((approval) => {
              const statusInfo = APPROVAL_STATUS[approval.status as keyof typeof APPROVAL_STATUS];
              const rejectionComment = approval.status === "REJECTED"
                ? approval.steps.find(s => s.status === "REJECTED")?.comment
                : null;

              return (
                <Link
                  key={approval.id}
                  href={`/documents/approval/${approval.moduleKey}/${approval.id}`}
                >
                  <Card className="transition-colors hover:bg-gray-50 mb-2">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        {/* Left: info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn("rounded-lg p-2 shrink-0 mt-0.5", activeTabConfig.bgColor)}>
                            <activeTabConfig.icon className={cn("h-4 w-4", activeTabConfig.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{approval.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{approval.submitter.name}{approval.submitter.position ? ` (${approval.submitter.position})` : ""}</span>
                              {approval.formTemplate && (
                                <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{approval.formTemplate.name}</span>
                              )}
                            </div>
                            <ApprovalLineProgress steps={approval.steps} />
                          </div>
                        </div>

                        {/* Right: status + date */}
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                          <Badge variant={STATUS_BADGE_VARIANT[approval.status] || "outline"}>
                            {statusInfo?.label || approval.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(approval.completedAt || approval.createdAt, "yyyy-MM-dd")}
                          </span>
                        </div>
                      </div>

                      {/* Rejection comment */}
                      {rejectionComment && (
                        <div className="mt-2 ml-11 text-xs text-red-600 bg-red-50 rounded p-2">
                          반려 사유: {rejectionComment}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
