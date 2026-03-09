"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("관리자 권한이 필요합니다");
  }
  return session;
}

export async function getFormTemplates(options?: { menuNodeId?: string; isActive?: boolean }) {
  const where: Record<string, unknown> = {};
  if (options?.menuNodeId) where.menuNodeId = options.menuNodeId;
  if (options?.isActive !== undefined) where.isActive = options.isActive;

  return prisma.formTemplate.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      menuNode: { select: { id: true, title: true, domain: true, moduleKey: true } },
    },
  });
}

export async function getFormTemplateById(id: string) {
  return prisma.formTemplate.findUnique({
    where: { id },
    include: {
      menuNode: { select: { id: true, title: true, domain: true, moduleKey: true } },
    },
  });
}

export async function getFormTemplatesByMenu(menuNodeId: string) {
  return prisma.formTemplate.findMany({
    where: { menuNodeId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getFormTemplatesByModuleKey(moduleKey: string) {
  return prisma.formTemplate.findMany({
    where: {
      menuNode: { moduleKey },
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
    include: {
      menuNode: { select: { id: true, title: true, moduleKey: true } },
    },
  });
}

export async function createFormTemplate(data: {
  name: string;
  description?: string;
  formType?: string;
  formSchema?: string;
  tableSchema?: string;
  menuNodeId?: string;
  defaultApprovers?: string;
  allowedSites?: string;
  sortOrder?: number;
}) {
  await requireAdmin();

  const template = await prisma.formTemplate.create({
    data: {
      name: data.name,
      description: data.description || null,
      formType: data.formType || "FORM",
      formSchema: data.formSchema || "[]",
      tableSchema: data.tableSchema || "{}",
      menuNodeId: data.menuNodeId || null,
      defaultApprovers: data.defaultApprovers || "[]",
      allowedSites: data.allowedSites || "ALL",
      sortOrder: data.sortOrder ?? 0,
    },
  });

  revalidatePath("/admin/forms");
  return template;
}

export async function updateFormTemplate(id: string, data: {
  name?: string;
  description?: string | null;
  formType?: string;
  formSchema?: string;
  tableSchema?: string;
  menuNodeId?: string | null;
  defaultApprovers?: string;
  allowedSites?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  await requireAdmin();

  const template = await prisma.formTemplate.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/forms");
  return template;
}

export async function deleteFormTemplate(id: string) {
  await requireAdmin();

  // Check if any approvals use this template
  const count = await prisma.documentApproval.count({ where: { formTemplateId: id } });
  if (count > 0) {
    throw new Error("이 양식을 사용한 결재 문서가 있어 삭제할 수 없습니다.");
  }

  await prisma.formTemplate.delete({ where: { id } });
  revalidatePath("/admin/forms");
}
