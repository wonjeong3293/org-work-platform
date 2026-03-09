"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

// Get documents for a module
export async function getDocuments(moduleKey: string, options?: {
  search?: string;
  extension?: string;
  year?: number;
  siteCode?: string;
  includeArchived?: boolean;
}) {
  await requireAuth();
  const where: Record<string, unknown> = { moduleKey };

  if (!options?.includeArchived) {
    where.status = "ACTIVE";
  }
  if (options?.extension) where.extension = options.extension;
  if (options?.year) where.year = options.year;
  if (options?.siteCode && options.siteCode !== "ALL") {
    where.siteCode = { in: ["ALL", options.siteCode] };
  }
  if (options?.search) {
    where.OR = [
      { originalName: { contains: options.search } },
      { title: { contains: options.search } },
      { createdBy: { name: { contains: options.search } } },
    ];
  }

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, position: true } },
    },
  });
}

// Get current document for a module
export async function getCurrentDocument(moduleKey: string, siteCode?: string) {
  const where: Record<string, unknown> = {
    moduleKey,
    isCurrent: true,
    status: "ACTIVE",
  };
  if (siteCode && siteCode !== "ALL") {
    where.siteCode = siteCode;
  }
  return prisma.document.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, position: true } },
    },
  });
}

// Set as current document
export async function setDocumentCurrent(id: string) {
  const session = await requireAuth();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new Error("문서를 찾을 수 없습니다");
  if (doc.status !== "ACTIVE") throw new Error("활성 문서만 최신본으로 설정할 수 있습니다");

  await prisma.$transaction([
    prisma.document.updateMany({
      where: { moduleKey: doc.moduleKey, siteCode: doc.siteCode, isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.document.update({
      where: { id },
      data: { isCurrent: true },
    }),
    prisma.documentLog.create({
      data: {
        documentId: id,
        action: "SET_CURRENT",
        performedById: session.user.id,
        detail: `최신본 설정: ${doc.originalName}`,
      },
    }),
  ]);

  revalidatePath("/documents");
}

// Archive document
export async function archiveDocument2(id: string) {
  const session = await requireAuth();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new Error("문서를 찾을 수 없습니다");
  if (doc.status === "ARCHIVED") throw new Error("이미 보관된 문서입니다");

  await prisma.$transaction([
    prisma.document.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        isCurrent: false,
        archivedAt: new Date(),
        archivedById: session.user.id,
      },
    }),
    prisma.documentLog.create({
      data: {
        documentId: id,
        action: "ARCHIVE",
        performedById: session.user.id,
        detail: `문서 보관: ${doc.originalName}`,
      },
    }),
  ]);

  revalidatePath("/documents");
}

// Restore document
export async function restoreDocument2(id: string) {
  const session = await requireAuth();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new Error("문서를 찾을 수 없습니다");
  if (doc.status !== "ARCHIVED") throw new Error("보관 상태가 아닌 문서입니다");

  await prisma.$transaction([
    prisma.document.update({
      where: { id },
      data: {
        status: "ACTIVE",
        archivedAt: null,
        archivedById: null,
      },
    }),
    prisma.documentLog.create({
      data: {
        documentId: id,
        action: "RESTORE",
        performedById: session.user.id,
        detail: `문서 복원: ${doc.originalName}`,
      },
    }),
  ]);

  revalidatePath("/documents");
}

// Delete document (admin only)
export async function deleteDocument2(id: string, confirmName: string) {
  const session = await requireAuth();
  const isAdmin = (session.user as Record<string, unknown>)?.isAdmin;
  if (!isAdmin) throw new Error("관리자만 삭제할 수 있습니다");

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new Error("문서를 찾을 수 없습니다");
  if (doc.originalName !== confirmName) throw new Error("파일명이 일치하지 않습니다");

  await prisma.documentLog.create({
    data: {
      documentId: id,
      action: "DELETE",
      performedById: session.user.id,
      detail: `영구 삭제: ${doc.originalName} (v${doc.version}, ${doc.extension})`,
    },
  });

  try {
    const absolutePath = path.join(process.cwd(), doc.storagePath);
    await unlink(absolutePath);
  } catch {}

  await prisma.document.delete({ where: { id } });
  revalidatePath("/documents");
}
