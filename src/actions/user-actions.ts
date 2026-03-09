"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";

export async function getUsers(options?: {
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { departmentId, search, page = 1, limit = 20 } = options || {};

  const where = {
    isActive: true,
    ...(departmentId && { departmentId }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeNumber: { contains: search } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        phone: true,
        employeeNumber: true,
        profileImage: true,
        isAdmin: true,
        department: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, pages: Math.ceil(total / limit) };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      rank: true,
      phone: true,
      employeeNumber: true,
      profileImage: true,
      isAdmin: true,
      isActive: true,
      createdAt: true,
      department: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, displayName: true } },
    },
  });
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    position?: string;
    phone?: string;
    departmentId?: string | null;
    roleId?: string;
    isAdmin?: boolean;
    isActive?: boolean;
  }
) {
  const session = await auth();
  const currentUser = session?.user;
  const isAdmin = (currentUser as Record<string, unknown>)?.isAdmin;
  const isSelf = currentUser?.id === id;

  if (!isAdmin && !isSelf) {
    throw new Error("권한이 없습니다");
  }

  // Non-admins can only update their own limited fields
  if (!isAdmin) {
    const { name, phone } = data;
    await prisma.user.update({ where: { id }, data: { name, phone } });
  } else {
    await prisma.user.update({ where: { id }, data });
  }

  revalidatePath("/organization/members");
  revalidatePath(`/organization/members/${id}`);
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  position?: string;
  departmentId?: string;
  roleId?: string;
}) {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new Error("이미 존재하는 이메일입니다");
  }

  const hashedPassword = await hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      position: data.position || null,
      departmentId: data.departmentId || null,
      roleId: data.roleId || null,
    },
  });

  revalidatePath("/admin/users");
  return user;
}

export async function getAllUsersForAdmin() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    throw new Error("권한이 없습니다");
  }

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      phone: true,
      employeeNumber: true,
      isAdmin: true,
      isActive: true,
      createdAt: true,
      department: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, displayName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function searchUsers(query: string) {
  if (!query || query.length < 1) return [];

  return prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      profileImage: true,
      department: { select: { name: true } },
    },
    take: 10,
  });
}
