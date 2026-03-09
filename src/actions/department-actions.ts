"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getDepartments() {
  return prisma.department.findMany({
    where: { isActive: true },
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllDepartmentsForAdmin() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  return prisma.department.findMany({
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { members: true, children: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getDepartmentTree() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    include: {
      members: {
        where: { isActive: true },
        select: { id: true, name: true, position: true, profileImage: true },
      },
      _count: { select: { members: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Build tree structure
  const deptMap = new Map(departments.map((d) => [d.id, { ...d, children: [] as typeof departments }]));
  const roots: typeof departments = [];

  for (const dept of departments) {
    if (dept.parentId && deptMap.has(dept.parentId)) {
      (deptMap.get(dept.parentId)! as { children: typeof departments }).children.push(dept);
    } else {
      roots.push(dept);
    }
  }

  return roots.map((r) => deptMap.get(r.id)!);
}

function revalidateDepartmentPaths() {
  revalidatePath("/organization");
  revalidatePath("/admin/departments");
  revalidatePath("/admin");
}

export async function createDepartment(data: {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const existing = await prisma.department.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new Error("이미 존재하는 부서 코드입니다");
  }

  const dept = await prisma.department.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description || null,
      parentId: data.parentId || null,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  revalidateDepartmentPaths();
  return dept;
}

export async function updateDepartment(
  id: string,
  data: {
    name?: string;
    code?: string;
    description?: string | null;
    parentId?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  await prisma.department.update({ where: { id }, data });
  revalidateDepartmentPaths();
}

export async function deleteDepartment(id: string) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const dept = await prisma.department.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          children: { where: { isActive: true } },
          members: { where: { isActive: true } },
        },
      },
    },
  });

  if (!dept) {
    throw new Error("부서를 찾을 수 없습니다");
  }

  if (dept._count.children > 0) {
    throw new Error(`하위 부서가 ${dept._count.children}개 있어 삭제할 수 없습니다. 하위 부서를 먼저 삭제해주세요.`);
  }

  if (dept._count.members > 0) {
    throw new Error(`소속 사용자가 ${dept._count.members}명 있어 삭제할 수 없습니다. 사용자를 다른 부서로 이동해주세요.`);
  }

  await prisma.department.update({
    where: { id },
    data: { isActive: false },
  });

  revalidateDepartmentPaths();
}
