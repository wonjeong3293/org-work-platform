"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getApprovalTemplates() {
  return prisma.approvalTemplate.findMany({
    where: { isActive: true },
    orderBy: { category: "asc" },
  });
}

export async function getPendingApprovals() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  return prisma.approvalRequest.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS"] },
      steps: {
        some: {
          approverId: session.user.id,
          status: "PENDING",
        },
      },
    },
    include: {
      submitter: { select: { id: true, name: true, position: true, department: { select: { name: true } } } },
      template: { select: { name: true, category: true } },
      steps: {
        include: { approver: { select: { id: true, name: true, position: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSentApprovals() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  return prisma.approvalRequest.findMany({
    where: { submitterId: session.user.id },
    include: {
      template: { select: { name: true, category: true } },
      steps: {
        include: { approver: { select: { id: true, name: true, position: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApprovalById(id: string) {
  return prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      submitter: {
        select: {
          id: true, name: true, position: true, profileImage: true,
          department: { select: { name: true } },
        },
      },
      template: true,
      steps: {
        include: { approver: { select: { id: true, name: true, position: true, profileImage: true } } },
        orderBy: { stepOrder: "asc" },
      },
      attachments: true,
    },
  });
}

export async function createApproval(data: {
  title: string;
  content: string;
  templateId?: string;
  urgency?: string;
  approvers: { userId: string; type: string }[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const request = await prisma.approvalRequest.create({
    data: {
      title: data.title,
      content: data.content,
      templateId: data.templateId || null,
      urgency: data.urgency || "NORMAL",
      submitterId: session.user.id,
      status: "PENDING",
      submittedAt: new Date(),
      steps: {
        create: data.approvers.map((approver, index) => ({
          stepOrder: index + 1,
          type: approver.type,
          approverId: approver.userId,
          status: index === 0 ? "PENDING" : "PENDING",
        })),
      },
    },
  });

  revalidatePath("/approvals");
  return request;
}

export async function processApprovalAction(
  requestId: string,
  action: "APPROVED" | "REJECTED",
  comment?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
    },
  });

  if (!request) throw new Error("결재 요청을 찾을 수 없습니다");

  // Find the current step for this user
  const currentStep = request.steps.find(
    (s) => s.approverId === session.user.id && s.status === "PENDING"
  );
  if (!currentStep) throw new Error("결재 권한이 없습니다");

  // Update the step
  await prisma.approvalStep.update({
    where: { id: currentStep.id },
    data: {
      status: action,
      comment: comment || null,
      actionAt: new Date(),
    },
  });

  if (action === "REJECTED") {
    // Reject the entire request
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", completedAt: new Date() },
    });
  } else {
    // Check if there's a next step
    const nextStep = request.steps.find(
      (s) => s.stepOrder === currentStep.stepOrder + 1
    );

    if (nextStep) {
      // Move to in_progress
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: "IN_PROGRESS" },
      });
    } else {
      // All steps completed - approve the request
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", completedAt: new Date() },
      });
    }
  }

  revalidatePath("/approvals");
  revalidatePath(`/approvals/${requestId}`);
}

export async function withdrawApproval(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.submitterId !== session.user.id) {
    throw new Error("회수 권한이 없습니다");
  }

  if (!["PENDING", "IN_PROGRESS"].includes(request.status)) {
    throw new Error("이미 완료된 결재는 회수할 수 없습니다");
  }

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: { status: "WITHDRAWN", completedAt: new Date() },
  });

  // Reset all pending steps
  await prisma.approvalStep.updateMany({
    where: { requestId, status: "PENDING" },
    data: { status: "SKIPPED" },
  });

  revalidatePath("/approvals");
  revalidatePath("/approvals/sent");
}
