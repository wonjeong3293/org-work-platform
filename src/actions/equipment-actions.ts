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
  ratedOutput: string | null;
  ratedVoltage: string | null;
  ratedCurrent: string | null;
  drawingPath: string | null;
  drawingName: string | null;
  drawingSize: number | null;
  drawingMime: string | null;
  createdAt: string;
  updatedAt: string;
  historyCards: HistoryCardItem[];
  specValues: { fieldId: string; label: string; unit: string | null; value: string }[];
}

export interface HistoryCardItem {
  id: string;
  title: string;
  content: string | null;
  cardType: string;
  performedAt: string;
  performedBy: string | null;
  vendor: string | null;
  repairCost: number | null;
  repairDetail: string | null;
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
      specValues: {
        include: { field: true },
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
    ratedOutput: eq.ratedOutput,
    ratedVoltage: eq.ratedVoltage,
    ratedCurrent: eq.ratedCurrent,
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
      vendor: card.vendor,
      repairCost: card.repairCost,
      repairDetail: card.repairDetail,
      attachmentPath: card.attachmentPath,
      attachmentName: card.attachmentName,
      attachmentSize: card.attachmentSize,
      attachmentMime: card.attachmentMime,
      createdAt: card.createdAt.toISOString(),
    })),
    specValues: eq.specValues.map((sv) => ({
      fieldId: sv.fieldId,
      label: sv.field.label,
      unit: sv.field.unit,
      value: sv.value,
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
  ratedOutput?: string;
  ratedVoltage?: string;
  ratedCurrent?: string;
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
  if (data.ratedOutput !== undefined) updateData.ratedOutput = data.ratedOutput || null;
  if (data.ratedVoltage !== undefined) updateData.ratedVoltage = data.ratedVoltage || null;
  if (data.ratedCurrent !== undefined) updateData.ratedCurrent = data.ratedCurrent || null;

  await prisma.equipment.update({ where: { id }, data: updateData });
  revalidatePath("/production/equipment-master");
}

// ── Delete ──

export async function deleteEquipment(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role?.name;
  if (role !== "ADMIN" && role !== "MANAGER") {
    throw new Error("권한이 없습니다. MANAGER 이상만 삭제할 수 있습니다.");
  }

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
  vendor?: string;
  repairCost?: number | null;
  repairDetail?: string;
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
      vendor: data.vendor || null,
      repairCost: data.repairCost ?? null,
      repairDetail: data.repairDetail || null,
    },
  });

  revalidatePath("/production/equipment-master");
  revalidatePath("/production/maintenance-dashboard");
  return card.id;
}

export async function deleteHistoryCard(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.equipmentHistoryCard.delete({ where: { id } });
  revalidatePath("/production/equipment-master");
}

// ── Delete Drawing ──

export async function deleteEquipmentDrawing(equipmentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const eq = await prisma.equipment.findUnique({ where: { id: equipmentId }, select: { drawingPath: true } });
  if (!eq) throw new Error("설비를 찾을 수 없습니다.");

  if (eq.drawingPath) {
    const fs = await import("fs/promises");
    const path = await import("path");
    const absPath = path.join(process.cwd(), eq.drawingPath);
    try { await fs.unlink(absPath); } catch { /* 파일 없어도 무시 */ }
  }

  await prisma.equipment.update({
    where: { id: equipmentId },
    data: { drawingPath: null, drawingName: null, drawingSize: null, drawingMime: null },
  });

  revalidatePath("/production/equipment-master");
}

// ── Bulk Create Equipment (엑셀 일괄 등록) ──

export async function bulkCreateEquipment(items: {
  name: string;
  location: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  installDate?: string;
  status?: string;
  siteCode?: string;
  note?: string;
  ratedOutput?: string;
  ratedVoltage?: string;
  ratedCurrent?: string;
}[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.equipment.createMany({
    data: items.map((item) => ({
      name: item.name,
      location: item.location,
      model: item.model || null,
      manufacturer: item.manufacturer || null,
      serialNumber: item.serialNumber || null,
      installDate: item.installDate ? new Date(item.installDate) : null,
      status: item.status || "ACTIVE",
      siteCode: item.siteCode || "ALL",
      note: item.note || null,
      ratedOutput: item.ratedOutput || null,
      ratedVoltage: item.ratedVoltage || null,
      ratedCurrent: item.ratedCurrent || null,
    })),
  });

  revalidatePath("/production/equipment-master");
}

// ── Bulk Import History Cards (이력카드 엑셀 import) ──

export async function bulkImportHistoryCards(items: {
  equipmentId: string;
  title: string;
  cardType: string;
  performedAt?: string;
  performedBy?: string;
  vendor?: string;
  repairCost?: number | string | null;
  repairDetail?: string;
}[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.equipmentHistoryCard.createMany({
    data: items.map((item) => {
      let performedAt = new Date();
      if (item.performedAt) {
        const parsed = new Date(item.performedAt);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
          performedAt = parsed;
        }
      }
      return {
        equipmentId: item.equipmentId,
        title: item.title,
        cardType: item.cardType,
        performedAt,
        performedBy: item.performedBy || null,
        vendor: item.vendor || null,
        repairCost: item.repairCost ? Number(item.repairCost) || null : null,
        repairDetail: item.repairDetail || null,
      };
    }),
  });

  revalidatePath("/production/equipment-master");
  revalidatePath("/production/maintenance-dashboard");
}

// ── Maintenance Dashboard (유지보수 현황 집계) ──

export interface MaintenanceDashboardData {
  totalRepairCount: number;
  totalRepairCost: number;
  mostRepaired: string | null;
  monthlyStats: { month: number; repairCount: number; repairCost: number }[];
  byEquipment: { equipmentName: string; count: number }[];
  recentCards: {
    id: string;
    performedAt: string;
    equipmentName: string;
    repairDetail: string | null;
    repairCost: number | null;
    performedBy: string | null;
    vendor: string | null;
    cardType: string;
  }[];
}

export async function getMaintenanceDashboard(params: {
  siteCode?: string;
  year?: number;
}): Promise<MaintenanceDashboardData> {
  const year = params.year || new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const siteWhere: Record<string, unknown> = {};
  if (params.siteCode && params.siteCode !== "ALL") {
    siteWhere.siteCode = params.siteCode;
  }

  const cards = await prisma.equipmentHistoryCard.findMany({
    where: {
      performedAt: { gte: startDate, lt: endDate },
      equipment: siteWhere,
    },
    include: {
      equipment: { select: { name: true } },
    },
    orderBy: { performedAt: "desc" },
  });

  const repairCards = cards.filter((c) => c.cardType === "REPAIR");
  const totalRepairCount = repairCards.length;
  const totalRepairCost = repairCards.reduce((sum, c) => sum + (c.repairCost || 0), 0);

  // 가장 많이 수리된 설비
  const repairByEquip: Record<string, number> = {};
  for (const c of repairCards) {
    repairByEquip[c.equipment.name] = (repairByEquip[c.equipment.name] || 0) + 1;
  }
  let mostRepaired: string | null = null;
  let maxCount = 0;
  for (const [name, count] of Object.entries(repairByEquip)) {
    if (count > maxCount) { mostRepaired = name; maxCount = count; }
  }

  // 월별 집계
  const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    repairCount: 0,
    repairCost: 0,
  }));
  for (const c of repairCards) {
    const m = c.performedAt.getMonth();
    monthlyStats[m].repairCount += 1;
    monthlyStats[m].repairCost += c.repairCost || 0;
  }

  // 설비별 점검 비중 (모든 카드 타입)
  const byEquipMap: Record<string, number> = {};
  for (const c of cards) {
    byEquipMap[c.equipment.name] = (byEquipMap[c.equipment.name] || 0) + 1;
  }
  const byEquipment = Object.entries(byEquipMap)
    .map(([equipmentName, count]) => ({ equipmentName, count }))
    .sort((a, b) => b.count - a.count);

  // 최근 50건
  const recentCards = cards.slice(0, 50).map((c) => ({
    id: c.id,
    performedAt: c.performedAt.toISOString(),
    equipmentName: c.equipment.name,
    repairDetail: c.repairDetail,
    repairCost: c.repairCost,
    performedBy: c.performedBy,
    vendor: c.vendor,
    cardType: c.cardType,
  }));

  return { totalRepairCount, totalRepairCost, mostRepaired, monthlyStats, byEquipment, recentCards };
}

// ── Equipment Spec Fields (커스텀 사양 필드) ──

export interface SpecFieldItem {
  id: string;
  siteCode: string;
  label: string;
  fieldKey: string;
  unit: string | null;
  sortOrder: number;
  isActive: boolean;
}

export async function getEquipmentSpecFields(siteCode: string = "ALL"): Promise<SpecFieldItem[]> {
  const fields = await prisma.equipmentSpecField.findMany({
    where: { siteCode, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return fields.map((f) => ({
    id: f.id,
    siteCode: f.siteCode,
    label: f.label,
    fieldKey: f.fieldKey,
    unit: f.unit,
    sortOrder: f.sortOrder,
    isActive: f.isActive,
  }));
}

export async function createEquipmentSpecField(data: {
  siteCode?: string;
  label: string;
  fieldKey: string;
  unit?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role?.name;
  if (role !== "ADMIN" && role !== "MANAGER") {
    throw new Error("권한이 없습니다. MANAGER 이상만 사양 필드를 추가할 수 있습니다.");
  }

  const field = await prisma.equipmentSpecField.create({
    data: {
      siteCode: data.siteCode || "ALL",
      label: data.label,
      fieldKey: data.fieldKey,
      unit: data.unit || null,
    },
  });
  revalidatePath("/production/equipment-master");
  return field.id;
}

export async function deleteEquipmentSpecField(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role?.name;
  if (role !== "ADMIN" && role !== "MANAGER") {
    throw new Error("권한이 없습니다. MANAGER 이상만 사양 필드를 삭제할 수 있습니다.");
  }

  await prisma.equipmentSpecField.delete({ where: { id } });
  revalidatePath("/production/equipment-master");
}

export async function upsertEquipmentSpecValue(equipmentId: string, fieldId: string, value: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.equipmentSpecValue.upsert({
    where: { equipmentId_fieldId: { equipmentId, fieldId } },
    update: { value },
    create: { equipmentId, fieldId, value },
  });
  revalidatePath("/production/equipment-master");
}
