"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATH = "/safety/inspection";

// ── Types ──

export interface SafetyInspectionListItem {
  id: string;
  siteCode: string;
  year: number;
  equipmentTypeId: string;
  equipmentTypeName: string;
  code: string;
  spec: string | null;
  location: string;
  capacity: string | null;
  lastInspectionDate: string | null;
  expiryDate: string | null;
  certNo: string | null;
  memo: string | null;
  createdAt: string;
}

export interface SafetyInspectionDetail extends SafetyInspectionListItem {
  createdById: string;
  updatedById: string | null;
  updatedAt: string;
  histories: SafetyInspectionHistoryItem[];
  photos: SafetyInspectionPhotoItem[];
}

export interface SafetyInspectionHistoryItem {
  id: string;
  inspectionDate: string;
  expiryDate: string | null;
  certNo: string | null;
  memo: string | null;
  createdById: string;
  createdAt: string;
}

export interface SafetyInspectionPhotoItem {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedById: string;
  createdAt: string;
}

export interface EquipmentTypeOption {
  id: string;
  name: string;
}

// ── Equipment Type Master ──

export async function getEquipmentTypes(): Promise<EquipmentTypeOption[]> {
  const types = await prisma.safetyInspectionEquipmentType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  return types;
}

export async function createEquipmentType(name: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.safetyInspectionEquipmentType.findUnique({ where: { name } });
  if (existing) {
    if (!existing.isActive) {
      await prisma.safetyInspectionEquipmentType.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      return existing.id;
    }
    throw new Error("이미 존재하는 장비 종류입니다");
  }

  const maxOrder = await prisma.safetyInspectionEquipmentType.aggregate({ _max: { sortOrder: true } });
  const type = await prisma.safetyInspectionEquipmentType.create({
    data: { name, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  });
  return type.id;
}

// ── List ──

interface GetListParams {
  siteCode?: string;
  year?: number;
  equipmentTypeId?: string;
  status?: string; // "expired" | "urgent" | "warning" | "normal"
  search?: string;
}

export async function getSafetyInspectionList(
  params: GetListParams = {},
): Promise<SafetyInspectionListItem[]> {
  const where: Record<string, unknown> = { isDeleted: false };

  if (params.siteCode && params.siteCode !== "ALL") {
    where.siteCode = params.siteCode;
  }
  if (params.year) {
    where.year = params.year;
  }
  if (params.equipmentTypeId) {
    where.equipmentTypeId = params.equipmentTypeId;
  }
  if (params.search) {
    where.OR = [
      { code: { contains: params.search } },
      { location: { contains: params.search } },
      { spec: { contains: params.search } },
      { certNo: { contains: params.search } },
    ];
  }

  const list = await prisma.safetyInspectionItem.findMany({
    where,
    include: { equipmentType: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // status filter는 날짜 기반 계산이 필요하므로 후처리
  let items = list.map((item) => ({
    id: item.id,
    siteCode: item.siteCode,
    year: item.year,
    equipmentTypeId: item.equipmentTypeId,
    equipmentTypeName: item.equipmentType.name,
    code: item.code,
    spec: item.spec,
    location: item.location,
    capacity: item.capacity,
    lastInspectionDate: item.lastInspectionDate?.toISOString() ?? null,
    expiryDate: item.expiryDate?.toISOString() ?? null,
    certNo: item.certNo,
    memo: item.memo,
    createdAt: item.createdAt.toISOString(),
  }));

  // 상태 필터 적용 (클라이언트 계산과 일치시키기 위해 서버에서도 계산)
  if (params.status) {
    const now = new Date();
    items = items.filter((item) => {
      if (!item.expiryDate) return params.status === "unknown";
      const dDay = Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      switch (params.status) {
        case "expired": return dDay < 0;
        case "urgent": return dDay >= 0 && dDay <= 30;
        case "warning": return dDay > 30 && dDay <= 90;
        case "normal": return dDay > 90;
        default: return true;
      }
    });
  }

  return items;
}

// ── Status Counts ──

export async function getStatusCounts(
  siteCode?: string,
  year?: number,
): Promise<{
  total: number;
  expired: number;
  urgent: number;
  warning: number;
  normal: number;
}> {
  const where: Record<string, unknown> = { isDeleted: false };
  if (siteCode && siteCode !== "ALL") where.siteCode = siteCode;
  if (year) where.year = year;

  const items = await prisma.safetyInspectionItem.findMany({
    where,
    select: { expiryDate: true },
  });

  const now = new Date();
  const counts = { total: items.length, expired: 0, urgent: 0, warning: 0, normal: 0 };

  for (const item of items) {
    if (!item.expiryDate) continue;
    const dDay = Math.ceil((item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (dDay < 0) counts.expired++;
    else if (dDay <= 30) counts.urgent++;
    else if (dDay <= 90) counts.warning++;
    else counts.normal++;
  }

  return counts;
}

// ── Detail ──

export async function getSafetyInspectionById(id: string): Promise<SafetyInspectionDetail | null> {
  const item = await prisma.safetyInspectionItem.findFirst({
    where: { id, isDeleted: false },
    include: {
      equipmentType: { select: { name: true } },
      histories: { orderBy: { inspectionDate: "desc" } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!item) return null;

  return {
    id: item.id,
    siteCode: item.siteCode,
    year: item.year,
    equipmentTypeId: item.equipmentTypeId,
    equipmentTypeName: item.equipmentType.name,
    code: item.code,
    spec: item.spec,
    location: item.location,
    capacity: item.capacity,
    lastInspectionDate: item.lastInspectionDate?.toISOString() ?? null,
    expiryDate: item.expiryDate?.toISOString() ?? null,
    certNo: item.certNo,
    memo: item.memo,
    createdById: item.createdById,
    updatedById: item.updatedById,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    histories: item.histories.map((h) => ({
      id: h.id,
      inspectionDate: h.inspectionDate.toISOString(),
      expiryDate: h.expiryDate?.toISOString() ?? null,
      certNo: h.certNo,
      memo: h.memo,
      createdById: h.createdById,
      createdAt: h.createdAt.toISOString(),
    })),
    photos: item.photos.map((p) => ({
      id: p.id,
      fileName: p.fileName,
      storagePath: p.storagePath,
      mimeType: p.mimeType,
      fileSize: p.fileSize,
      uploadedById: p.uploadedById,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

// ── Create ──

export async function createSafetyInspectionItem(data: {
  siteCode: string;
  year: number;
  equipmentTypeId: string;
  code: string;
  spec?: string;
  location: string;
  capacity?: string;
  lastInspectionDate?: string;
  expiryDate?: string;
  certNo?: string;
  memo?: string;
}): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // 동일 사업장+연도에 같은 관리번호가 이미 있으면 경고
  const existing = await prisma.safetyInspectionItem.findFirst({
    where: { siteCode: data.siteCode, code: data.code, year: data.year, isDeleted: false },
  });
  if (existing) {
    throw new Error(`관리번호 "${data.code}"가 이미 존재합니다. 다른 번호를 사용하거나 기존 항목을 수정해주세요.`);
  }

  const item = await prisma.safetyInspectionItem.create({
    data: {
      siteCode: data.siteCode,
      year: data.year,
      equipmentTypeId: data.equipmentTypeId,
      code: data.code,
      spec: data.spec || null,
      location: data.location,
      capacity: data.capacity || null,
      lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      certNo: data.certNo || null,
      memo: data.memo || null,
      createdById: session.user.id,
    },
  });

  // 초기 이력 생성
  if (data.lastInspectionDate) {
    await prisma.safetyInspectionHistory.create({
      data: {
        safetyInspectionItemId: item.id,
        inspectionDate: new Date(data.lastInspectionDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        certNo: data.certNo || null,
        memo: "초기 등록",
        createdById: session.user.id,
      },
    });
  }

  revalidatePath(REVALIDATE_PATH);
  return item.id;
}

// ── Update ──

export async function updateSafetyInspectionItem(
  id: string,
  data: {
    equipmentTypeId?: string;
    code?: string;
    spec?: string;
    location?: string;
    capacity?: string;
    lastInspectionDate?: string | null;
    expiryDate?: string | null;
    certNo?: string | null;
    memo?: string | null;
  },
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const updateData: Record<string, unknown> = { updatedById: session.user.id };

  if (data.equipmentTypeId !== undefined) updateData.equipmentTypeId = data.equipmentTypeId;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.spec !== undefined) updateData.spec = data.spec || null;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.capacity !== undefined) updateData.capacity = data.capacity || null;
  if (data.lastInspectionDate !== undefined) updateData.lastInspectionDate = data.lastInspectionDate ? new Date(data.lastInspectionDate) : null;
  if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
  if (data.certNo !== undefined) updateData.certNo = data.certNo || null;
  if (data.memo !== undefined) updateData.memo = data.memo || null;

  await prisma.safetyInspectionItem.update({ where: { id }, data: updateData });
  revalidatePath(REVALIDATE_PATH);
}

// ── Delete (soft) ──

export async function deleteSafetyInspectionItem(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.safetyInspectionItem.update({
    where: { id },
    data: { isDeleted: true, updatedById: session.user.id },
  });
  revalidatePath(REVALIDATE_PATH);
}

// ── Add History ──

export async function addInspectionHistory(data: {
  safetyInspectionItemId: string;
  inspectionDate: string;
  expiryDate?: string;
  certNo?: string;
  memo?: string;
}): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const history = await prisma.safetyInspectionHistory.create({
    data: {
      safetyInspectionItemId: data.safetyInspectionItemId,
      inspectionDate: new Date(data.inspectionDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      certNo: data.certNo || null,
      memo: data.memo || null,
      createdById: session.user.id,
    },
  });

  // 장비의 최신 검사일/만료일 업데이트
  await prisma.safetyInspectionItem.update({
    where: { id: data.safetyInspectionItemId },
    data: {
      lastInspectionDate: new Date(data.inspectionDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      certNo: data.certNo || undefined,
      updatedById: session.user.id,
    },
  });

  revalidatePath(REVALIDATE_PATH);
  return history.id;
}

// ── Delete Photo ──

export async function deleteSafetyInspectionPhoto(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.safetyInspectionPhoto.delete({ where: { id } });
  revalidatePath(REVALIDATE_PATH);
}

// ── Bulk Create (Excel Upload) ──

export interface BulkCreateInput {
  siteCode: string;
  year: number;
  equipmentTypeName: string;
  code: string;
  spec?: string;
  location: string;
  capacity?: string;
  lastInspectionDate?: string;
  expiryDate?: string;
  certNo?: string;
  memo?: string;
}

export interface BulkValidationResult {
  valid: BulkCreateInput[];
  errors: Array<{ row: number; message: string }>;
  duplicates: string[];
}

export async function validateBulkData(
  rows: BulkCreateInput[],
): Promise<BulkValidationResult> {
  const errors: Array<{ row: number; message: string }> = [];
  const valid: BulkCreateInput[] = [];
  const codeSet = new Set<string>();
  const duplicates: string[] = [];

  // 활성 데이터 중 동일 관리번호 확인
  const existingCodes = await prisma.safetyInspectionItem.findMany({
    where: { isDeleted: false },
    select: { code: true, siteCode: true, year: true },
  });
  const existingCodeSet = new Set(existingCodes.map((c) => `${c.siteCode}:${c.code}:${c.year}`));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 엑셀 행 번호 (헤더 제외)

    if (!row.code) {
      errors.push({ row: rowNum, message: "관리번호는 필수입니다" });
      continue;
    }
    if (!row.location) {
      errors.push({ row: rowNum, message: "설치장소는 필수입니다" });
      continue;
    }
    if (!row.equipmentTypeName) {
      errors.push({ row: rowNum, message: "장비종류는 필수입니다" });
      continue;
    }

    const key = `${row.siteCode}:${row.code}:${row.year}`;
    if (existingCodeSet.has(key)) {
      duplicates.push(row.code);
      continue;
    }
    if (codeSet.has(key)) {
      errors.push({ row: rowNum, message: `중복된 관리번호: ${row.code}` });
      continue;
    }

    codeSet.add(key);
    valid.push(row);
  }

  return { valid, errors, duplicates };
}

export async function bulkCreateItems(items: BulkCreateInput[]): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  let created = 0;

  for (const item of items) {
    // 장비 종류 조회 또는 생성
    let eqType = await prisma.safetyInspectionEquipmentType.findUnique({
      where: { name: item.equipmentTypeName },
    });
    if (!eqType) {
      eqType = await prisma.safetyInspectionEquipmentType.create({
        data: { name: item.equipmentTypeName },
      });
    } else if (!eqType.isActive) {
      await prisma.safetyInspectionEquipmentType.update({
        where: { id: eqType.id },
        data: { isActive: true },
      });
    }

    try {
      await prisma.safetyInspectionItem.create({
        data: {
          siteCode: item.siteCode,
          year: item.year,
          equipmentTypeId: eqType.id,
          code: item.code,
          spec: item.spec || null,
          location: item.location,
          capacity: item.capacity || null,
          lastInspectionDate: item.lastInspectionDate ? new Date(item.lastInspectionDate) : null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          certNo: item.certNo || null,
          memo: item.memo || null,
          createdById: session.user.id,
        },
      });
      created++;
    } catch {
      // 유니크 제약 충돌 시 건너뜀 (이미 존재하는 관리번호)
    }
  }

  revalidatePath(REVALIDATE_PATH);
  return created;
}

// ── Upcoming Deadlines ──

export async function getUpcomingDeadlines(
  siteCode?: string,
  year?: number,
  limit: number = 5,
): Promise<SafetyInspectionListItem[]> {
  const where: Record<string, unknown> = {
    isDeleted: false,
    expiryDate: { not: null },
  };
  if (siteCode && siteCode !== "ALL") where.siteCode = siteCode;
  if (year) where.year = year;

  const items = await prisma.safetyInspectionItem.findMany({
    where,
    include: { equipmentType: { select: { name: true } } },
    orderBy: { expiryDate: "asc" },
  });

  // 만료일이 가장 가까운 순 (아직 만료 안 된 것 우선, 만료된 것도 포함)
  const now = new Date();
  const sorted = items
    .map((item) => ({
      ...item,
      dDay: item.expiryDate ? Math.ceil((item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
    }))
    .sort((a, b) => {
      if (a.dDay === null) return 1;
      if (b.dDay === null) return -1;
      return a.dDay - b.dDay;
    })
    .slice(0, limit);

  return sorted.map((item) => ({
    id: item.id,
    siteCode: item.siteCode,
    year: item.year,
    equipmentTypeId: item.equipmentTypeId,
    equipmentTypeName: item.equipmentType.name,
    code: item.code,
    spec: item.spec,
    location: item.location,
    capacity: item.capacity,
    lastInspectionDate: item.lastInspectionDate?.toISOString() ?? null,
    expiryDate: item.expiryDate?.toISOString() ?? null,
    certNo: item.certNo,
    memo: item.memo,
    createdAt: item.createdAt.toISOString(),
  }));
}
