"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Types ──

export interface EquipmentListItem {
  id: string;
  name: string;
  location: string;
  model: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  status: string;
  siteCode: string;
  lastInspection: string | null;
  nextInspection: string | null;
  installDate: string | null;
  note: string | null;
  drawingName: string | null;
  createdAt: string;
}

export interface EquipmentDetail {
  id: string;
  name: string;
  location: string;
  model: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  status: string;
  siteCode: string;
  lastInspection: string | null;
  nextInspection: string | null;
  installDate: string | null;
  note: string | null;
  drawingPath: string | null;
  drawingName: string | null;
  drawingSize: number | null;
  drawingMime: string | null;
  createdAt: string;
  updatedAt: string;
  historyCards: HistoryCardItem[];
}

export interface HistoryCardItem {
  id: string;
  title: string;
  content: string | null;
  cardType: string;
  performedAt: string;
  performedBy: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentMime: string | null;
  createdAt: string;
}

// ── List ──

interface GetEquipmentListParams {
  siteCode?: string;
  status?: string;
  search?: string;
}

export async function getEquipmentList(
  params: GetEquipmentListParams = {}
): Promise<EquipmentListItem[]> {
  const where: Record<string, unknown> = {};

  if (params.siteCode && params.siteCode !== "ALL") {
    where.siteCode = params.siteCode;
  }
  if (params.status && params.status !== "all") {
    where.status = params.status;
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { location: { contains: params.search } },
      { model: { contains: params.search } },
      { manufacturer: { contains: params.search } },
      { serialNumber: { contains: params.search } },
    ];
  }

  const list = await prisma.equipment.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return list.map((eq) => ({
    id: eq.id,
    name: eq.name,
    location: eq.location,
    model: eq.model,
    manufacturer: eq.manufacturer,
    serialNumber: eq.serialNumber,
    status: eq.status,
    siteCode: eq.siteCode,
    lastInspection: eq.lastInspection?.toISOString() ?? null,
    nextInspection: eq.nextInspection?.toISOString() ?? null,
    installDate: eq.installDate?.toISOString() ?? null,
    note: eq.note,
    drawingName: eq.drawingName,
    createdAt: eq.createdAt.toISOString(),
  }));
}

// ── Detail ──

export async function getEquipmentById(id: string): Promise<EquipmentDetail | null> {
  const eq = await prisma.equipment.findUnique({
    where: { id },
    include: {
      historyCards: {
        orderBy: { performedAt: "desc" },
      },
    },
  });
  if (!eq) return null;

  return {
    id: eq.id,
    name: eq.name,
    location: eq.location,
    model: eq.model,
    manufacturer: eq.manufacturer,
    serialNumber: eq.serialNumber,
    status: eq.status,
    siteCode: eq.siteCode,
    lastInspection: eq.lastInspection?.toISOString() ?? null,
    nextInspection: eq.nextInspection?.toISOString() ?? null,
    installDate: eq.installDate?.toISOString() ?? null,
    note: eq.note,
    drawingPath: eq.drawingPath,
    drawingName: eq.drawingName,
    drawingSize: eq.drawingSize,
    drawingMime: eq.drawingMime,
    createdAt: eq.createdAt.toISOString(),
    updatedAt: eq.updatedAt.toISOString(),
    historyCards: eq.historyCards.map((card) => ({
      id: card.id,
      title: card.title,
      content: card.content,
      cardType: card.cardType,
      performedAt: card.performedAt.toISOString(),
      performedBy: card.performedBy,
      attachmentPath: card.attachmentPath,
      attachmentName: card.attachmentName,
      attachmentSize: card.attachmentSize,
      attachmentMime: card.attachmentMime,
      createdAt: card.createdAt.toISOString(),
    })),
  };
}

// ── Status Counts ──

export async function getEquipmentStatusCounts(siteCode?: string): Promise<{
  total: number;
  ACTIVE: number;
  INACTIVE: number;
  MAINTENANCE: number;
  DISPOSED: number;
}> {
  const where: Record<string, unknown> = {};
  if (siteCode && siteCode !== "ALL") {
    where.siteCode = siteCode;
  }

  const all = await prisma.equipment.findMany({ where, select: { status: true } });
  const counts = { ACTIVE: 0, INACTIVE: 0, MAINTENANCE: 0, DISPOSED: 0 };
  for (const eq of all) {
    if (eq.status in counts) {
      counts[eq.status as keyof typeof counts] += 1;
    }
  }
  return { total: all.length, ...counts };
}

// ── Create ──

export async function createEquipment(data: {
  name: string;
  location: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  installDate?: string;
  lastInspection?: string;
  nextInspection?: string;
  status?: string;
  siteCode?: string;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const eq = await prisma.equipment.create({
    data: {
      name: data.name,
      location: data.location,
      model: data.model || null,
      manufacturer: data.manufacturer || null,
      serialNumber: data.serialNumber || null,
      installDate: data.installDate ? new Date(data.installDate) : null,
      lastInspection: data.lastInspection ? new Date(data.lastInspection) : null,
      nextInspection: data.nextInspection ? new Date(data.nextInspection) : null,
      status: data.status || "ACTIVE",
      siteCode: data.siteCode || "ALL",
      note: data.note || null,
    },
  });

  revalidatePath("/production/equipment-master");
  return eq.id;
}

// ── Update Status ──

export async function updateEquipmentStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.equipment.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/production/equipment-master");
}

// ── Update Equipment ──

export async function updateEquipment(id: string, data: {
  name?: string;
  location?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  installDate?: string | null;
  lastInspection?: string | null;
  nextInspection?: string | null;
  status?: string;
  siteCode?: string;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.model !== undefined) updateData.model = data.model || null;
  if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer || null;
  if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber || null;
  if (data.installDate !== undefined) updateData.installDate = data.installDate ? new Date(data.installDate) : null;
  if (data.lastInspection !== undefined) updateData.lastInspection = data.lastInspection ? new Date(data.lastInspection) : null;
  if (data.nextInspection !== undefined) updateData.nextInspection = data.nextInspection ? new Date(data.nextInspection) : null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.siteCode !== undefined) updateData.siteCode = data.siteCode;
  if (data.note !== undefined) updateData.note = data.note || null;

  await prisma.equipment.update({ where: { id }, data: updateData });
  revalidatePath("/production/equipment-master");
}

// ── Delete ──

export async function deleteEquipment(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.equipment.delete({ where: { id } });
  revalidatePath("/production/equipment-master");
}

// ── History Card CRUD ──

export async function createHistoryCard(equipmentId: string, data: {
  title: string;
  content?: string;
  cardType: string;
  performedAt?: string;
  performedBy?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const card = await prisma.equipmentHistoryCard.create({
    data: {
      equipmentId,
      title: data.title,
      content: data.content || null,
      cardType: data.cardType,
      performedAt: data.performedAt ? new Date(data.performedAt) : new Date(),
      performedBy: data.performedBy || session.user.name || null,
    },
  });

  revalidatePath("/production/equipment-master");
  return card.id;
}

export async function deleteHistoryCard(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.equipmentHistoryCard.delete({ where: { id } });
  revalidatePath("/production/equipment-master");
}
