"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ── Helpers ──

async function getAuthUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("인증이 필요합니다.");
  return session.user.id;
}

// ── Events ──

export async function getEvents(params: {
  userId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const currentUserId = await getAuthUserId();
  const targetUserId = params.userId || currentUserId;

  // 본인이 아닌 경우 접근 권한 확인
  if (targetUserId !== currentUserId) {
    const access = await prisma.plannerAccess.findUnique({
      where: { ownerId_granteeId: { ownerId: targetUserId, granteeId: currentUserId } },
    });
    if (!access) throw new Error("접근 권한이 없습니다.");
  }

  return prisma.plannerEvent.findMany({
    where: {
      userId: targetUserId,
      AND: [
        { startDate: { lte: params.endDate } },
        {
          OR: [
            { endDate: { gte: params.startDate } },
            { endDate: null },
          ],
        },
      ],
    },
    include: { checklists: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ startDate: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getEventsByDate(date: Date, userId?: string) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return getEvents({
    userId,
    startDate: dayStart,
    endDate: dayEnd,
  });
}

export async function createEvent(data: {
  title: string;
  description?: string;
  eventType?: string;
  priority?: string;
  color?: string;
  allDay?: boolean;
  startDate: string;
  endDate?: string;
}) {
  const userId = await getAuthUserId();

  const event = await prisma.plannerEvent.create({
    data: {
      title: data.title,
      description: data.description,
      eventType: data.eventType,
      priority: data.priority,
      color: data.color,
      allDay: data.allDay,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      userId,
    },
  });

  revalidatePath("/planner");
  return event;
}

export async function updateEvent(
  eventId: string,
  data: {
    title?: string;
    description?: string;
    eventType?: string;
    status?: string;
    priority?: string;
    color?: string;
    allDay?: boolean;
    startDate?: Date;
    endDate?: Date;
    sortOrder?: number;
  },
) {
  const userId = await getAuthUserId();

  const event = await prisma.plannerEvent.update({
    where: { id: eventId, userId },
    data,
  });

  revalidatePath("/planner");
  return event;
}

export async function deleteEvent(eventId: string) {
  const userId = await getAuthUserId();

  await prisma.plannerEvent.delete({
    where: { id: eventId, userId },
  });

  revalidatePath("/planner");
}

// ── Checklists ──

export async function getChecklists(params: {
  userId?: string;
  date?: Date;
  includeCompleted?: boolean;
  eventId?: string;
}) {
  const currentUserId = await getAuthUserId();
  const targetUserId = params.userId || currentUserId;

  if (targetUserId !== currentUserId) {
    const access = await prisma.plannerAccess.findUnique({
      where: { ownerId_granteeId: { ownerId: targetUserId, granteeId: currentUserId } },
    });
    if (!access) throw new Error("접근 권한이 없습니다.");
  }

  const where: Record<string, unknown> = { userId: targetUserId };

  if (params.eventId) {
    where.eventId = params.eventId;
  }

  if (params.date) {
    const dayStart = new Date(params.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(params.date);
    dayEnd.setHours(23, 59, 59, 999);
    where.OR = [
      { dueDate: { gte: dayStart, lte: dayEnd } },
      { dueDate: null },
    ];
  }

  if (!params.includeCompleted) {
    where.isCompleted = false;
  }

  return prisma.plannerChecklist.findMany({
    where,
    orderBy: [{ isCompleted: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createChecklist(data: {
  title: string;
  dueDate?: string;
  eventId?: string;
}) {
  const userId = await getAuthUserId();

  const maxOrder = await prisma.plannerChecklist.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });

  const checklist = await prisma.plannerChecklist.create({
    data: {
      title: data.title,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      eventId: data.eventId,
      userId,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/planner");
  return checklist;
}

export async function updateChecklist(
  checklistId: string,
  data: {
    title?: string;
    isCompleted?: boolean;
    sortOrder?: number;
    dueDate?: Date | null;
    eventId?: string | null;
  },
) {
  const userId = await getAuthUserId();

  const checklist = await prisma.plannerChecklist.update({
    where: { id: checklistId, userId },
    data,
  });

  revalidatePath("/planner");
  return checklist;
}

export async function deleteChecklist(checklistId: string) {
  const userId = await getAuthUserId();

  await prisma.plannerChecklist.delete({
    where: { id: checklistId, userId },
  });

  revalidatePath("/planner");
}

export async function toggleChecklist(checklistId: string) {
  const userId = await getAuthUserId();

  const item = await prisma.plannerChecklist.findUnique({
    where: { id: checklistId, userId },
  });
  if (!item) throw new Error("체크리스트를 찾을 수 없습니다.");

  return updateChecklist(checklistId, { isCompleted: !item.isCompleted });
}

// ── Memos ──

export async function getMemo(date: Date, userId?: string) {
  const currentUserId = await getAuthUserId();
  const targetUserId = userId || currentUserId;

  if (targetUserId !== currentUserId) {
    const access = await prisma.plannerAccess.findUnique({
      where: { ownerId_granteeId: { ownerId: targetUserId, granteeId: currentUserId } },
    });
    if (!access) throw new Error("접근 권한이 없습니다.");
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return prisma.plannerMemo.findFirst({
    where: {
      userId: targetUserId,
      date: { gte: dayStart, lte: dayEnd },
    },
  });
}

export async function upsertMemo(data: {
  date: string;
  title?: string;
  content: string;
  isPinned?: boolean;
}) {
  const userId = await getAuthUserId();

  const dayStart = new Date(data.date + "T00:00:00");
  const dayEnd = new Date(data.date + "T23:59:59.999");

  const existing = await prisma.plannerMemo.findFirst({
    where: { userId, date: { gte: dayStart, lte: dayEnd } },
  });

  if (existing) {
    const memo = await prisma.plannerMemo.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        content: data.content,
        isPinned: data.isPinned,
      },
    });
    revalidatePath("/planner");
    return memo;
  }

  const memo = await prisma.plannerMemo.create({
    data: {
      userId,
      date: dayStart,
      title: data.title,
      content: data.content,
      isPinned: data.isPinned,
    },
  });

  revalidatePath("/planner");
  return memo;
}

export async function deleteMemo(memoId: string) {
  const userId = await getAuthUserId();

  await prisma.plannerMemo.delete({
    where: { id: memoId, userId },
  });

  revalidatePath("/planner");
}

// ── Access Control ──

export async function getAccessList() {
  const userId = await getAuthUserId();

  return prisma.plannerAccess.findMany({
    where: { ownerId: userId },
    include: { grantee: { select: { id: true, name: true, position: true, department: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function grantAccess(data: {
  granteeId: string;
  accessType?: string;
}) {
  const userId = await getAuthUserId();

  if (data.granteeId === userId) throw new Error("본인에게는 권한을 부여할 수 없습니다.");

  const access = await prisma.plannerAccess.upsert({
    where: { ownerId_granteeId: { ownerId: userId, granteeId: data.granteeId } },
    update: { accessType: data.accessType || "VIEW" },
    create: {
      ownerId: userId,
      granteeId: data.granteeId,
      accessType: data.accessType || "VIEW",
    },
  });

  revalidatePath("/planner");
  return access;
}

export async function revokeAccess(granteeId: string) {
  const userId = await getAuthUserId();

  await prisma.plannerAccess.delete({
    where: { ownerId_granteeId: { ownerId: userId, granteeId } },
  });

  revalidatePath("/planner");
}

// ── Team / All View ──

export async function getTeamEvents(params: {
  startDate: Date;
  endDate: Date;
  departmentId?: string;
}) {
  const currentUserId = await getAuthUserId();
  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { departmentId: true, isAdmin: true },
  });

  if (!user) throw new Error("사용자를 찾을 수 없습니다.");

  // 관리자는 전체 조회 가능
  const whereUser: Record<string, unknown> = {};
  if (!user.isAdmin) {
    // 팀원: 본인 + 접근 권한이 있는 사용자의 이벤트
    const accessList = await prisma.plannerAccess.findMany({
      where: { granteeId: currentUserId },
      select: { ownerId: true },
    });
    const accessibleUserIds = [currentUserId, ...accessList.map((a) => a.ownerId)];
    whereUser.userId = { in: accessibleUserIds };
  } else if (params.departmentId) {
    const deptUsers = await prisma.user.findMany({
      where: { departmentId: params.departmentId, isActive: true },
      select: { id: true },
    });
    whereUser.userId = { in: deptUsers.map((u) => u.id) };
  }

  return prisma.plannerEvent.findMany({
    where: {
      ...whereUser,
      AND: [
        { startDate: { lte: params.endDate } },
        {
          OR: [
            { endDate: { gte: params.startDate } },
            { endDate: null, startDate: { gte: params.startDate } },
          ],
        },
      ],
    },
    include: {
      user: { select: { id: true, name: true, position: true, department: { select: { name: true } } } },
    },
    orderBy: [{ startDate: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      position: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });
}
