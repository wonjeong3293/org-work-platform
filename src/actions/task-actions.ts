"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getTasks(options?: {
  projectId?: string;
  status?: string;
  assigneeId?: string;
  search?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const where = {
    ...(options?.projectId && { projectId: options.projectId }),
    ...(options?.status && { status: options.status }),
    ...(options?.assigneeId && { assigneeId: options.assigneeId }),
    ...(options?.search && { title: { contains: options.search } }),
    parentId: null, // Only top-level tasks
  };

  return prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, profileImage: true } },
      creator: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      labels: { include: { label: true } },
      _count: { select: { subtasks: true, comments: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getTasksByStatus() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const tasks = await prisma.task.findMany({
    where: { parentId: null },
    include: {
      assignee: { select: { id: true, name: true, profileImage: true } },
      project: { select: { id: true, name: true } },
      labels: { include: { label: true } },
      _count: { select: { subtasks: true, comments: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return {
    TODO: tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
    IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW"),
    DONE: tasks.filter((t) => t.status === "DONE"),
  };
}

export async function getTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, profileImage: true, position: true } },
      creator: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      subtasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      comments: {
        include: { author: { select: { id: true, name: true, profileImage: true } } },
        orderBy: { createdAt: "asc" },
      },
      labels: { include: { label: true } },
      attachments: true,
    },
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  assigneeId?: string;
  dueDate?: string;
  parentId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  const maxSort = await prisma.task.aggregate({
    _max: { sortOrder: true },
    where: { status: data.status || "TODO" },
  });

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status || "TODO",
      priority: data.priority || "MEDIUM",
      projectId: data.projectId || null,
      assigneeId: data.assigneeId || null,
      creatorId: session.user.id,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      parentId: data.parentId || null,
      sortOrder: (maxSort._max.sortOrder || 0) + 1,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/tasks/board");
  revalidatePath("/dashboard");
  return task;
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
    sortOrder?: number;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.status === "DONE") {
    updateData.completedAt = new Date();
  }

  await prisma.task.update({ where: { id }, data: updateData });
  revalidatePath("/tasks");
  revalidatePath("/tasks/board");
  revalidatePath("/dashboard");
}

export async function updateTaskStatus(id: string, status: string, sortOrder: number) {
  const updateData: Record<string, unknown> = { status, sortOrder };
  if (status === "DONE") {
    updateData.completedAt = new Date();
  }

  await prisma.task.update({ where: { id }, data: updateData });
  revalidatePath("/tasks");
  revalidatePath("/tasks/board");
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
  revalidatePath("/tasks/board");
  revalidatePath("/dashboard");
}

export async function addTaskComment(taskId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("로그인이 필요합니다");

  await prisma.taskComment.create({
    data: { taskId, content, authorId: session.user.id },
  });

  revalidatePath(`/tasks/${taskId}`);
}
