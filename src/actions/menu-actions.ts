"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface MenuTreeNode {
  id: string;
  title: string;
  slug: string;
  domain: string;
  type: string;
  route: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  parentId: string | null;
  moduleKey: string | null;
  scopeType: string;
  pageType: string;
  children: MenuTreeNode[];
}

function buildTree(
  nodes: Omit<MenuTreeNode, "children">[],
  parentId: string | null = null
): MenuTreeNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((n) => ({
      ...n,
      children: buildTree(nodes, n.id),
    }));
}

export async function getMenuTree(): Promise<MenuTreeNode[]> {
  const nodes = await prisma.menuNode.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      slug: true,
      domain: true,
      type: true,
      route: true,
      icon: true,
      color: true,
      sortOrder: true,
      parentId: true,
      moduleKey: true,
      scopeType: true,
      pageType: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  return buildTree(nodes);
}

export async function getMenuNodes() {
  return prisma.menuNode.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      domain: true,
      type: true,
      route: true,
      icon: true,
      color: true,
      sortOrder: true,
      parentId: true,
      isActive: true,
      moduleKey: true,
      scopeType: true,
      pageType: true,
      _count: { select: { children: true } },
    },
  });
}

export async function createMenuNode(data: {
  title: string;
  slug: string;
  domain: string;
  type: string;
  route?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  parentId?: string;
  moduleKey?: string;
  scopeType?: string;
  pageType?: string;
}) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const node = await prisma.menuNode.create({
    data: {
      title: data.title,
      slug: data.slug,
      domain: data.domain,
      type: data.type,
      route: data.route || null,
      icon: data.icon || null,
      color: data.color || null,
      sortOrder: data.sortOrder ?? 0,
      parentId: data.parentId || null,
      moduleKey: data.moduleKey || null,
      scopeType: data.scopeType || "SITE_ONLY",
      pageType: data.pageType || "NONE",
    },
  });

  revalidatePath("/", "layout");
  return node;
}

export async function updateMenuNode(
  id: string,
  data: {
    title?: string;
    slug?: string;
    domain?: string;
    type?: string;
    route?: string | null;
    icon?: string | null;
    color?: string | null;
    sortOrder?: number;
    parentId?: string | null;
    isActive?: boolean;
    moduleKey?: string | null;
    scopeType?: string;
    pageType?: string;
  }
) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const node = await prisma.menuNode.update({
    where: { id },
    data,
  });

  revalidatePath("/", "layout");
  return node;
}

export async function reorderMenuNode(id: string, direction: "up" | "down") {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const node = await prisma.menuNode.findUnique({ where: { id } });
  if (!node) throw new Error("메뉴를 찾을 수 없습니다");

  // Get siblings (same parent)
  const siblings = await prisma.menuNode.findMany({
    where: { parentId: node.parentId },
    orderBy: { sortOrder: "asc" },
  });

  const idx = siblings.findIndex((s) => s.id === id);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;

  // Swap sortOrder
  const currentOrder = siblings[idx].sortOrder;
  const swapOrder = siblings[swapIdx].sortOrder;

  await prisma.$transaction([
    prisma.menuNode.update({
      where: { id: siblings[idx].id },
      data: { sortOrder: swapOrder },
    }),
    prisma.menuNode.update({
      where: { id: siblings[swapIdx].id },
      data: { sortOrder: currentOrder },
    }),
  ]);

  revalidatePath("/", "layout");
}

export async function getMenuScopeType(moduleKey: string): Promise<string> {
  const node = await prisma.menuNode.findFirst({
    where: { moduleKey, isActive: true },
    select: { scopeType: true },
  });
  return node?.scopeType ?? "SITE_ONLY";
}

export async function getMenuNodeByModuleKey(moduleKey: string) {
  return prisma.menuNode.findFirst({
    where: { moduleKey, isActive: true },
    select: { id: true, title: true, pageType: true, scopeType: true, moduleKey: true },
  });
}

export async function deleteMenuNode(id: string) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const childCount = await prisma.menuNode.count({ where: { parentId: id } });
  if (childCount > 0) {
    throw new Error("하위 메뉴가 있는 노드는 삭제할 수 없습니다. 하위 메뉴를 먼저 삭제해주세요.");
  }

  await prisma.menuNode.delete({ where: { id } });
  revalidatePath("/", "layout");
}
