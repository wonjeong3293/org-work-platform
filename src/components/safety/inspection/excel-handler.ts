import * as XLSX from "xlsx";
import type { SafetyInspectionListItem } from "@/actions/safety-inspection-actions";
import type { BulkCreateInput } from "@/actions/safety-inspection-actions";
import { EXCEL_COLUMN_MAP, formatDate } from "@/lib/safety-inspection-utils";

/**
 * 엑셀 다운로드
 */
export function excelDownload(items: SafetyInspectionListItem[]) {
  const headers = [
    "공장(설치장소)",
    "장비종류",
    "관리번호",
    "형식(규격)",
    "용량",
    "전 검사일",
    "기간만료",
    "검사증 번호",
    "비고",
  ];

  const rows = items.map((item) => [
    item.location,
    item.equipmentTypeName,
    item.code,
    item.spec || "",
    item.capacity || "",
    formatDate(item.lastInspectionDate),
    formatDate(item.expiryDate),
    item.certNo || "",
    item.memo || "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 열 너비 설정
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length * 2, 12) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "안전검사");
  XLSX.writeFile(wb, `안전검사_${new Date().toISOString().split("T")[0]}.xlsx`);
}

/**
 * 엑셀 파싱
 */
export function parseExcelFile(
  file: File,
  siteCode: string,
  year: number,
): Promise<BulkCreateInput[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        const items: BulkCreateInput[] = json.map((row) => {
          const getValue = (header: string): string => {
            const val = row[header];
            if (val === undefined || val === null) return "";
            if (val instanceof Date) return val.toISOString().split("T")[0];
            return String(val).trim();
          };

          return {
            siteCode,
            year,
            location: getValue(EXCEL_COLUMN_MAP[0].header),
            equipmentTypeName: getValue(EXCEL_COLUMN_MAP[1].header),
            code: getValue(EXCEL_COLUMN_MAP[2].header),
            spec: getValue(EXCEL_COLUMN_MAP[3].header) || undefined,
            capacity: getValue(EXCEL_COLUMN_MAP[4].header) || undefined,
            lastInspectionDate: parseExcelDate(getValue(EXCEL_COLUMN_MAP[5].header)) || undefined,
            expiryDate: parseExcelDate(getValue(EXCEL_COLUMN_MAP[6].header)) || undefined,
            certNo: getValue(EXCEL_COLUMN_MAP[7].header) || undefined,
            memo: getValue(EXCEL_COLUMN_MAP[8].header) || undefined,
          };
        });

        resolve(items);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 엑셀 날짜 파싱 (다양한 형식 대응)
 */
function parseExcelDate(value: string): string | null {
  if (!value) return null;

  // ISO 형식
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.split("T")[0];

  // YYYY.MM.DD 또는 YYYY/MM/DD
  const match = value.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  // Date 객체로 시도
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return null;
}
