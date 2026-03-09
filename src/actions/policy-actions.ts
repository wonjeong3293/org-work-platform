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

// ---- 조회 ----

export async function getPolicyDocuments(options?: {
  search?: string;
  extension?: string;
  year?: number;
  siteCode?: string;
  includeArchived?: boolean;
  category?: string;
}) {
  await requireAuth();

  const where: Record<string, unknown> = {};

  // category filter: defaults to "POLICY" for backward compatibility
  where.category = options?.category || "POLICY";

  if (!options?.includeArchived) {
    where.isArchived = false;
  }
  if (options?.extension) {
    where.extension = options.extension;
  }
  if (options?.year) {
    where.year = options.year;
  }
  // site filter: ALL shows everything (all sites), specific site shows ALL + that site
  if (options?.siteCode && options.siteCode !== "ALL") {
    where.siteCode = { in: ["ALL", options.siteCode] };
  }
  // ALL: no siteCode filter → shows all sites combined
  if (options?.search) {
    where.OR = [
      { originalName: { contains: options.search } },
      { uploadedBy: { name: { contains: options.search } } },
    ];
  }

  return prisma.policyDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { name: true, position: true } },
    },
  });
}

export async function getCurrentByType(
  policyType: "SIGNED_PDF" | "POLICY_PPT",
  siteCode?: string,
  category?: string,
) {
  const where: Record<string, unknown> = {
    policyType,
    isCurrent: true,
    isArchived: false,
    category: category || "POLICY",
  };
  if (siteCode && siteCode !== "ALL") {
    where.siteCode = siteCode;
  }

  return prisma.policyDocument.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { name: true, position: true } },
    },
  });
}

// ---- 최신본 설정 ----

export async function setCurrentDocument(id: string) {
  const session = await requireAuth();

  const doc = await prisma.policyDocument.findUnique({ where: { id } });
  if (!doc) throw new Error("문서를 찾을 수 없습니다");
  if (doc.isArchived) throw new Error("보관된 문서는 최신본으로 설정할 수 없습니다");

  await prisma.$transaction([
    prisma.policyDocument.updateMany({
      where: { policyType: doc.policyType, siteCode: doc.siteCode, category: doc.category, isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.policyDocument.update({
      where: { id },
      data: { isCurrent: true },
    }),
    prisma.policyDocumentLog.create({
      data: {
        documentId: id,
        action: "SET_CURRENT",
        performedById: session.user.id,
        detail: `최신본 설정: ${doc.originalName} (${doc.policyType}, ${doc.siteCode})`,
      },
    }),
  ]);

  revalidatePath("/safety/policy");
  revalidatePath("/safety/goals");
}

// ---- 보관 (모든 사용자) ----

export async function archiveDocument(id: string) {
  const session = await requireAuth();

  const doc = await prisma.policyDocument.findUnique({ where: { id } });
  if (!doc) throw new Error("문서를 찾을 수 없습니다");
  if (doc.isArchived) throw new Error("이미 보관된 문서입니다");

  await prisma.$transaction([
    prisma.policyDocument.update({
      where: { id },
      data: {
        isArchived: true,
        isCurrent: false,
        archivedAt: new Date(),
        archivedById: session.user.id,
      },
    }),
    prisma.policyDocumentLog.create({
      data: {
        documentId: id,
        action: "ARCHIVE",
        performedById: session.user.id,
        detail: `문서 보관: ${doc.originalName}`,
      },
    }),
  ]);

  revalidatePath("/safety/policy");
  revalidatePath("/safety/goals");
}

// ---- 영구 삭제 (관리자만) ----

export async function deleteDocument(id: string, confirmName: string) {
  const session = await requireAuth();

  const isAdmin = (session.user as Record<string, unknown>)?.isAdmin;
  if (!isAdmin) throw new Error("관리자만 영구 삭제할 수 있습니다");

  const doc = await prisma.policyDocument.findUnique({ where: { id } });
  if (!doc) throw new Error("문서를 찾을 수 없습니다");

  if (doc.originalName !== confirmName) {
    throw new Error("파일명이 일치하지 않습니다");
  }

  // 삭제 전 로그 기록 (documentId는 SetNull로 유지)
  await prisma.policyDocumentLog.create({
    data: {
      documentId: id,
      action: "DELETE",
      performedById: session.user.id,
      detail: `영구 삭제: ${doc.originalName} (v${doc.version}, ${doc.extension})`,
    },
  });

  // 파일 삭제
  try {
    const absolutePath = path.join(process.cwd(), doc.storagePath);
    await unlink(absolutePath);
  } catch {
    // 파일이 이미 없을 수 있음
  }

  // DB 삭제 (PolicyDocumentLog.documentId는 SetNull 처리됨)
  await prisma.policyDocument.delete({ where: { id } });

  revalidatePath("/safety/policy");
  revalidatePath("/safety/goals");
}

// ---- 복원 ----

export async function restoreDocument(id: string) {
  const session = await requireAuth();

  const doc = await prisma.policyDocument.findUnique({ where: { id } });
  if (!doc) throw new Error("문서를 찾을 수 없습니다");
  if (!doc.isArchived) throw new Error("보관 상태가 아닌 문서입니다");

  await prisma.$transaction([
    prisma.policyDocument.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedById: null,
      },
    }),
    prisma.policyDocumentLog.create({
      data: {
        documentId: id,
        action: "RESTORE",
        performedById: session.user.id,
        detail: `문서 복원: ${doc.originalName}`,
      },
    }),
  ]);

  revalidatePath("/safety/policy");
  revalidatePath("/safety/goals");
}
