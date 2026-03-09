"use client";

interface StepData {
  stepType: string;
  status: string;
  approverName: string;
  approverPosition: string;
  actionAt: string | null;
  comment: string | null;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  APPROVE: "승인",
  AGREE: "합의",
  NOTIFY: "참조",
};

export function ApprovalStamp({
  submitter,
  steps,
}: {
  submitter: { name: string; position: string };
  steps: StepData[];
}) {
  return (
    <div className="flex justify-end">
      <div className="flex border rounded-lg overflow-hidden">
        {/* 작성자 */}
        <div className="flex flex-col items-center justify-between border-r px-4 py-2 min-w-[80px] bg-muted/30">
          <span className="text-[10px] text-muted-foreground">{submitter.position || "작성"}</span>
          <span className="text-sm font-bold">{submitter.name}</span>
          <span className="text-[10px] text-muted-foreground">작성자</span>
        </div>
        {/* 결재 단계 */}
        {steps.map((step, idx) => {
          const isApproved = step.status === "APPROVED";
          const isRejected = step.status === "REJECTED";
          const isPending = step.status === "PENDING";
          let dateStr = "";
          if (step.actionAt) {
            const d = new Date(step.actionAt);
            dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          }

          return (
            <div
              key={idx}
              className={`flex flex-col items-center justify-between px-4 py-2 min-w-[80px] ${idx < steps.length - 1 ? "border-r" : ""} ${isRejected ? "bg-red-50" : isApproved ? "bg-blue-50" : ""}`}
            >
              <span className="text-[10px] text-muted-foreground">
                {step.approverPosition || STEP_TYPE_LABELS[step.stepType] || step.stepType}
              </span>
              <span className="text-sm font-bold">{step.approverName}</span>
              <span className={`text-[10px] ${isApproved ? "text-blue-600" : isRejected ? "text-red-600" : "text-muted-foreground"}`}>
                {isPending ? "대기" : isRejected ? "반려" : dateStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
