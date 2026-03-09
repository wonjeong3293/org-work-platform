export const TASK_STATUS = {
  TODO: { value: "TODO", label: "할 일" },
  IN_PROGRESS: { value: "IN_PROGRESS", label: "진행 중" },
  IN_REVIEW: { value: "IN_REVIEW", label: "검토 중" },
  DONE: { value: "DONE", label: "완료" },
} as const;

export const TASK_PRIORITY = {
  LOW: { value: "LOW", label: "낮음", color: "bg-gray-100 text-gray-700" },
  MEDIUM: { value: "MEDIUM", label: "보통", color: "bg-blue-100 text-blue-700" },
  HIGH: { value: "HIGH", label: "높음", color: "bg-orange-100 text-orange-700" },
  URGENT: { value: "URGENT", label: "긴급", color: "bg-red-100 text-red-700" },
} as const;

export const PROJECT_STATUS = {
  ACTIVE: { value: "ACTIVE", label: "진행 중" },
  COMPLETED: { value: "COMPLETED", label: "완료" },
  ARCHIVED: { value: "ARCHIVED", label: "보관" },
  ON_HOLD: { value: "ON_HOLD", label: "보류" },
} as const;

export const DOC_APPROVAL_TYPE = {
  FILE_APPROVAL: { value: "FILE", label: "파일 업로드 결재" },
  BASIC_FORM_APPROVAL: { value: "FORM", label: "일반 웹 양식 결재" },
  STRUCTURED_TABLE_APPROVAL: { value: "TABLE", label: "정형 테이블 문서 결재" },
} as const;

export type DocApprovalType = "FILE" | "FORM" | "TABLE";

export const APPROVAL_STATUS = {
  DRAFT: { value: "DRAFT", label: "작성중" },
  PENDING: { value: "PENDING", label: "결재 대기" },
  IN_PROGRESS: { value: "IN_PROGRESS", label: "결재 진행중" },
  APPROVED: { value: "APPROVED", label: "승인완료" },
  REJECTED: { value: "REJECTED", label: "반려" },
  WITHDRAWN: { value: "WITHDRAWN", label: "회수" },
} as const;

export const APPROVAL_STEP_TYPE = {
  APPROVE: { value: "APPROVE", label: "승인" },
  REVIEW: { value: "REVIEW", label: "검토" },
  NOTIFY: { value: "NOTIFY", label: "통보" },
} as const;

export const APPROVAL_STEP_STATUS = {
  PENDING: { value: "PENDING", label: "대기" },
  APPROVED: { value: "APPROVED", label: "승인" },
  REJECTED: { value: "REJECTED", label: "반려" },
  SKIPPED: { value: "SKIPPED", label: "건너뜀" },
} as const;

export const POSITIONS = [
  "사원", "주임", "대리", "과장", "차장", "부장", "이사", "상무", "전무", "부사장", "사장",
] as const;

export const PROJECT_MEMBER_ROLE = {
  OWNER: { value: "OWNER", label: "소유자" },
  MANAGER: { value: "MANAGER", label: "관리자" },
  MEMBER: { value: "MEMBER", label: "멤버" },
} as const;

export const POLICY_TYPE = {
  SIGNED_PDF: { value: "SIGNED_PDF", label: "서명본 PDF" },
  POLICY_PPT: { value: "POLICY_PPT", label: "방침 PPT" },
} as const;

export type PolicyType = "SIGNED_PDF" | "POLICY_PPT";

export function extensionToPolicyType(ext: string): PolicyType {
  if (ext === "ppt" || ext === "pptx") return "POLICY_PPT";
  return "SIGNED_PDF";
}
