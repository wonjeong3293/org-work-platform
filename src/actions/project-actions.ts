"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getProjects() {
  return prisma.project.findMany({
    include: {
      department: { select: { name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      members: {
        include: { user: { select: { id: true, name: true, position: true, profileImage: true } } },
      },
      _count: { select: { members: true } },
    },
  });
}

export async function createProject(data: {
  name: string;
  description?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      departmentId: data.departmentId || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });

  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: session.user.id,
      role: "OWNER",
    },
  });

  revalidatePath("/projects");
  return project;
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string; status?: string }
) {
  await prisma.project.update({ where: { id }, data });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
}
