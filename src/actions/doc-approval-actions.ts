"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function getDocApprovals(moduleKey: string, options?: {
  siteCode?: string;
  year?: number;
  status?: string;
  search?: string;
}) {
  await requireAuth();
  const where: Record<string, unknown> = { moduleKey };

  if (options?.year) where.year = options.year;
  if (options?.status && options.status !== "ALL") where.status = options.status;
  if (options?.siteCode && options.siteCode !== "ALL") {
    where.siteCode = { in: ["ALL", options.siteCode] };
  }
  if (options?.search) {
    where.OR = [
      { title: { contains: options.search } },
      { submitter: { name: { contains: options.search } } },
    ];
  }

  return prisma.documentApproval.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      submitter: { select: { name: true, position: true } },
      formTemplate: { select: { name: true, formType: true, tableSchema: true } },
      steps: {
        include: { approver: { select: { id: true, name: true, position: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
  });
}

export async function getDocApprovalById(id: string) {
  return prisma.documentApproval.findUnique({
    where: { id },
    include: {
      submitter: {
        select: { id: true, name: true, position: true, profileImage: true, department: { select: { name: true } } },
      },
      formTemplate: true,
      steps: {
        include: { approver: { select: { id: true, name: true, position: true, profileImage: true } } },
        orderBy: { stepOrder: "asc" },
      },
      document: true,
    },
  });
}

export async function createDocApproval(data: {
  moduleKey: string;
  formTemplateId?: string;
  title: string;
  formData?: string;
  headerData?: string;
  tableData?: string;
  siteCode?: string;
  year?: number;
}) {
  const session = await requireAuth();

  const approval = await prisma.documentApproval.create({
    data: {
      moduleKey: data.moduleKey,
      formTemplateId: data.formTemplateId || null,
      title: data.title,
      formData: data.formData || "{}",
      headerData: data.headerData || "{}",
      tableData: data.tableData || "[]",
      siteCode: data.siteCode || "ALL",
      year: data.year || new Date().getFullYear(),
      submitterId: session.user.id,
      status: "DRAFT",
    },
  });

  revalidatePath("/documents");
  return approval;
}

export async function updateDocApproval(id: string, data: {
  title?: string;
  formData?: string;
  headerData?: string;
  tableData?: string;
}) {
  const session = await requireAuth();
  const approval = await prisma.documentApproval.findUnique({ where: { id } });
  if (!approval) throw new Error("문서를 찾을 수 없습니다");
  if (approval.submitterId !== session.user.id) throw new Error("작성자만 수정할 수 있습니다");
  if (approval.status !== "DRAFT") throw new Error("임시저장 상태에서만 수정할 수 있습니다");

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.formData !== undefined) updateData.formData = data.formData;
  if (data.headerData !== undefined) updateData.headerData = data.headerData;
  if (data.tableData !== undefined) updateData.tableData = data.tableData;

  await prisma.documentApproval.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/documents");
}

export async function submitDocApproval(id: string, approvers: { userId: string; type: string }[]) {
  const session = await requireAuth();
  const approval = await prisma.documentApproval.findUnique({ where: { id } });
  if (!approval) throw new Error("문서를 찾을 수 없습니다");
  if (approval.submitterId !== session.user.id) throw new Error("작성자만 결재요청할 수 있습니다");
  if (approval.status !== "DRAFT") throw new Error("임시저장 상태에서만 결재요청할 수 있습니다");

  await prisma.$transaction([
    prisma.documentApproval.update({
      where: { id },
      data: { status: "REQUESTED", submittedAt: new Date() },
    }),
    ...approvers.map((approver, index) =>
      prisma.documentApprovalStep.create({
        data: {
          approvalId: id,
          stepOrder: index + 1,
          stepType: approver.type,
          approverId: approver.userId,
          status: "PENDING",
        },
      })
    ),
  ]);

  revalidatePath("/documents");
}

export async function processDocApproval(id: string, action: "APPROVED" | "REJECTED", comment?: string) {
  const session = await requireAuth();

  const approval = await prisma.documentApproval.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
  if (!approval) throw new Error("문서를 찾을 수 없습니다");

  if (action === "REJECTED" && (!comment || !comment.trim())) {
    throw new Error("반려 시 의견을 반드시 입력해야 합니다");
  }

  const currentStep = approval.steps.find(
    (s) => s.approverId === session.user.id && s.status === "PENDING"
  );
  if (!currentStep) throw new Error("결재 권한이 없습니다");

  // Sequential approval enforcement: all previous steps must be approved
  const previousSteps = approval.steps.filter(
    (s) => s.stepOrder < currentStep.stepOrder
  );
  const hasPendingPrevious = previousSteps.some((s) => s.status === "PENDING");
  if (hasPendingPrevious) {
    throw new Error("이전 결재자의 승인이 필요합니다");
  }

  await prisma.documentApprovalStep.update({
    where: { id: currentStep.id },
    data: { status: action, comment: comment || null, actionAt: new Date() },
  });

  if (action === "REJECTED") {
    await prisma.documentApproval.update({
      where: { id },
      data: { status: "REJECTED", completedAt: new Date() },
    });
  } else {
    const nextStep = approval.steps.find((s) => s.stepOrder === currentStep.stepOrder + 1);
    if (nextStep) {
      await prisma.documentApproval.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      });
    } else {
      await prisma.documentApproval.update({
        where: { id },
        data: { status: "APPROVED", completedAt: new Date() },
      });
    }
  }

  revalidatePath("/documents");
}

export async function withdrawDocApproval(id: string) {
  const session = await requireAuth();
  const approval = await prisma.documentApproval.findUnique({ where: { id } });
  if (!approval || approval.submitterId !== session.user.id) throw new Error("회수 권한이 없습니다");
  if (!["REQUESTED", "IN_PROGRESS"].includes(approval.status)) throw new Error("회수할 수 없는 상태입니다");

  await prisma.documentApproval.update({
    where: { id },
    data: { status: "DRAFT", submittedAt: null, completedAt: null },
  });
  await prisma.documentApprovalStep.deleteMany({ where: { approvalId: id } });

  revalidatePath("/documents");
}

// ── 결재함 조회 ──

export async function getMyInProgressApprovals() {
  const session = await requireAuth();
  return prisma.documentApproval.findMany({
    where: { submitterId: session.user.id, status: { in: ["REQUESTED", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
    include: {
      submitter: { select: { name: true, position: true } },
      formTemplate: { select: { name: true, formType: true } },
      steps: { include: { approver: { select: { id: true, name: true, position: true } } }, orderBy: { stepOrder: "asc" } },
    },
  });
}

export async function getMyCompletedApprovals() {
  const session = await requireAuth();
  return prisma.documentApproval.findMany({
    where: { submitterId: session.user.id, status: "APPROVED" },
    orderBy: { completedAt: "desc" },
    include: {
      submitter: { select: { name: true, position: true } },
      formTemplate: { select: { name: true, formType: true } },
      steps: { include: { approver: { select: { id: true, name: true, position: true } } }, orderBy: { stepOrder: "asc" } },
    },
  });
}

export async function getRejectedApprovals() {
  const session = await requireAuth();
  return prisma.documentApproval.findMany({
    where: {
      status: "REJECTED",
      OR: [
        { submitterId: session.user.id },
        { steps: { some: { approverId: session.user.id } } },
      ],
    },
    orderBy: { completedAt: "desc" },
    include: {
      submitter: { select: { name: true, position: true } },
      formTemplate: { select: { name: true, formType: true } },
      steps: { include: { approver: { select: { id: true, name: true, position: true } } }, orderBy: { stepOrder: "asc" } },
    },
  });
}

export async function getReferenceApprovals() {
  const session = await requireAuth();
  return prisma.documentApproval.findMany({
    where: { steps: { some: { approverId: session.user.id, stepType: "NOTIFY" } } },
    orderBy: { createdAt: "desc" },
    include: {
      submitter: { select: { name: true, position: true } },
      formTemplate: { select: { name: true, formType: true } },
      steps: { include: { approver: { select: { id: true, name: true, position: true } } }, orderBy: { stepOrder: "asc" } },
    },
  });
}

export async function getDepartmentApprovals() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { departmentId: true } });
  if (!user?.departmentId) return [];

  const deptMembers = await prisma.user.findMany({
    where: { departmentId: user.departmentId },
    select: { id: true },
  });
  const memberIds = deptMembers.map(m => m.id);

  return prisma.documentApproval.findMany({
    where: { submitterId: { in: memberIds }, status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
    include: {
      submitter: { select: { name: true, position: true } },
      formTemplate: { select: { name: true, formType: true } },
      steps: { include: { approver: { select: { id: true, name: true, position: true } } }, orderBy: { stepOrder: "asc" } },
    },
  });
}

export async function getPendingMyApprovalDocs() {
  const session = await requireAuth();

  const approvals = await prisma.documentApproval.findMany({
    where: {
      status: { in: ["REQUESTED", "IN_PROGRESS"] },
      steps: { some: { approverId: session.user.id, status: "PENDING" } },
    },
    orderBy: { createdAt: "desc" },
    include: {
      submitter: { select: { name: true, position: true } },
      formTemplate: { select: { name: true, formType: true } },
      steps: { include: { approver: { select: { id: true, name: true, position: true } } }, orderBy: { stepOrder: "asc" } },
    },
  });

  // Filter: only include if it's actually my turn (all previous steps approved)
  return approvals.filter(approval => {
    const myStep = approval.steps.find(s => s.approverId === session.user.id && s.status === "PENDING");
    if (!myStep) return false;
    const previousSteps = approval.steps.filter(s => s.stepOrder < myStep.stepOrder);
    return previousSteps.every(s => s.status === "APPROVED");
  });
}

// ── 관리자 전용 ──

export async function getAllDocApprovals() {
  const session = await requireAuth();
  if (!(session.user as Record<string, unknown>)?.isAdmin) throw new Error("관리자 권한이 필요합니다");

  return prisma.documentApproval.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      submitter: { select: { name: true, position: true } },
      formTemplate: { select: { name: true, formType: true } },
      steps: { select: { id: true } },
    },
  });
}

export async function deleteDocApproval(id: string) {
  const session = await requireAuth();
  if (!(session.user as Record<string, unknown>)?.isAdmin) throw new Error("관리자 권한이 필요합니다");

  // 연결된 Document가 있으면 연결 해제
  await prisma.document.updateMany({
    where: { approvalId: id },
    data: { approvalId: null },
  });

  // 결재 단계 삭제 → 결재 문서 삭제
  await prisma.documentApprovalStep.deleteMany({ where: { approvalId: id } });
  await prisma.documentApproval.delete({ where: { id } });

  revalidatePath("/admin/approvals");
  revalidatePath("/documents");
}

export async function deleteDocApprovalBulk(ids: string[]) {
  const session = await requireAuth();
  if (!(session.user as Record<string, unknown>)?.isAdmin) throw new Error("관리자 권한이 필요합니다");

  await prisma.document.updateMany({
    where: { approvalId: { in: ids } },
    data: { approvalId: null },
  });
  await prisma.documentApprovalStep.deleteMany({ where: { approvalId: { in: ids } } });
  await prisma.documentApproval.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/admin/approvals");
  revalidatePath("/documents");
}
