/**
 * 안전검사 유틸리티
 * - 상태 분류 기준값 분리
 * - D-Day 계산
 * - 상태 계산 로직
 */

/** 상태 분류 기준 (일 단위) - 설정 변경 가능하도록 상수 분리 */
export const INSPECTION_STATUS_THRESHOLDS = {
  URGENT_DAYS: 30,
  WARNING_DAYS: 90,
} as const;

export type InspectionStatus = "expired" | "urgent" | "warning" | "normal" | "unknown";

export interface InspectionStatusInfo {
  status: InspectionStatus;
  label: string;
  dDay: number | null;
  colorClass: string;
  badgeVariant: "destructive" | "default" | "secondary" | "outline";
}

const STATUS_CONFIG: Record<InspectionStatus, { label: string; colorClass: string; badgeVariant: InspectionStatusInfo["badgeVariant"] }> = {
  expired: { label: "기한 만료", colorClass: "text-red-600 bg-red-50", badgeVariant: "destructive" },
  urgent: { label: "긴급", colorClass: "text-orange-600 bg-orange-50", badgeVariant: "default" },
  warning: { label: "주의", colorClass: "text-amber-600 bg-amber-50", badgeVariant: "secondary" },
  normal: { label: "정상", colorClass: "text-green-600 bg-green-50", badgeVariant: "outline" },
  unknown: { label: "미정", colorClass: "text-gray-500 bg-gray-50", badgeVariant: "outline" },
};

/**
 * D-Day 계산: 만료일까지 남은 일수 (음수 = 지남)
 */
export function calculateDDay(expiryDate: Date | string | null, baseDate?: Date): number | null {
  if (!expiryDate) return null;
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const base = baseDate ?? new Date();
  const diffMs = expiry.getTime() - base.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 만료일 기준 상태 분류
 */
export function getInspectionStatus(
  expiryDate: Date | string | null,
  baseDate?: Date,
  thresholds = INSPECTION_STATUS_THRESHOLDS,
): InspectionStatusInfo {
  const dDay = calculateDDay(expiryDate, baseDate);

  if (dDay === null) {
    return { ...STATUS_CONFIG.unknown, status: "unknown", dDay: null };
  }

  let status: InspectionStatus;
  if (dDay < 0) {
    status = "expired";
  } else if (dDay <= thresholds.URGENT_DAYS) {
    status = "urgent";
  } else if (dDay <= thresholds.WARNING_DAYS) {
    status = "warning";
  } else {
    status = "normal";
  }

  return { ...STATUS_CONFIG[status], status, dDay };
}

/**
 * D-Day 표시 문자열
 */
export function formatDDay(dDay: number | null): string {
  if (dDay === null) return "-";
  if (dDay === 0) return "D-Day";
  if (dDay > 0) return `D-${dDay}`;
  return `D+${Math.abs(dDay)}`;
}

/**
 * 날짜 포맷 (YYYY-MM-DD)
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * 만료 타임라인 데이터 생성 - 기준월부터 N개월간 만료 수 집계
 */
export function buildExpiryTimeline(
  items: Array<{ expiryDate: string | null }>,
  monthsAhead: number = 12,
  baseDate?: Date,
): Array<{ year: number; month: number; label: string; count: number }> {
  const base = baseDate ?? new Date();
  const result: Array<{ year: number; month: number; label: string; count: number }> = [];

  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const count = items.filter((item) => {
      if (!item.expiryDate) return false;
      const exp = new Date(item.expiryDate);
      return exp.getFullYear() === year && exp.getMonth() + 1 === month;
    }).length;

    result.push({
      year,
      month,
      label: `${year}.${String(month).padStart(2, "0")}`,
      count,
    });
  }

  return result;
}

/**
 * 엑셀 열 매핑 정의
 */
export const EXCEL_COLUMN_MAP = [
  { key: "location", header: "공장(설치장소)", required: true },
  { key: "equipmentType", header: "장비종류", required: true },
  { key: "code", header: "관리번호", required: true },
  { key: "spec", header: "형식(규격)", required: false },
  { key: "capacity", header: "용량", required: false },
  { key: "lastInspectionDate", header: "전 검사일", required: false, type: "date" as const },
  { key: "expiryDate", header: "기간만료", required: false, type: "date" as const },
  { key: "certNo", header: "검사증 번호", required: false },
  { key: "memo", header: "비고", required: false },
] as const;
