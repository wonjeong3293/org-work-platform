"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getSites() {
  return prisma.site.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function getActiveSites() {
  return prisma.site.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createSite(data: {
  code: string;
  name: string;
  sortOrder?: number;
}) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const existing = await prisma.site.findUnique({ where: { code: data.code } });
  if (existing) throw new Error("이미 존재하는 사업장 코드입니다");

  const site = await prisma.site.create({
    data: {
      code: data.code,
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  revalidatePath("/admin/sites");
  return site;
}

export async function updateSite(
  id: string,
  data: { name?: string; isActive?: boolean; sortOrder?: number }
) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const site = await prisma.site.update({ where: { id }, data });
  revalidatePath("/admin/sites");
  return site;
}

export async function deleteSite(id: string) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  await prisma.site.delete({ where: { id } });
  revalidatePath("/admin/sites");
}
