import * as XLSX from "xlsx";
import type { TableTemplateSchema, TableRowData, TableColumn, HeaderField } from "@/lib/table-schema";

/**
 * 테이블 문서 엑셀 다운로드
 * - 컬럼 정의 기반으로 동적 헤더 생성
 * - 상단 필드(headerFields) 정보도 별도 시트 또는 상단에 포함
 */
export function downloadTableExcel(
  schema: TableTemplateSchema,
  rows: TableRowData[],
  headerData: Record<string, string>,
  fileName: string,
) {
  const wb = XLSX.utils.book_new();

  // 데이터 시트
  const headers = schema.columns.map((col) => col.label);
  const dataRows = rows.map((row) =>
    schema.columns.map((col) => row[col.id] ?? ""),
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws["!cols"] = schema.columns.map((col) => ({
    wch: Math.max((col.label.length * 2) + 2, col.width ? Math.floor(col.width / 8) : 14),
  }));
  XLSX.utils.book_append_sheet(wb, ws, "데이터");

  // 문서정보 시트 (상단 헤더 필드)
  if (schema.headerFields.length > 0) {
    const infoRows = schema.headerFields.map((hf) => [
      hf.label,
      headerData[hf.id] ?? hf.defaultValue ?? "",
    ]);
    const infoWs = XLSX.utils.aoa_to_sheet([["항목", "값"], ...infoRows]);
    infoWs["!cols"] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, infoWs, "문서정보");
  }

  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

/**
 * 빈 양식 엑셀 다운로드 (데이터 입력용 템플릿)
 */
export function downloadTemplateExcel(
  schema: TableTemplateSchema,
  fileName: string,
) {
  const wb = XLSX.utils.book_new();
  const headers = schema.columns.map((col) => col.label);

  // 기본행이 있으면 포함, 없으면 헤더만
  const defaultRows = (schema.defaultRows || []).map((row) =>
    schema.columns.map((col) => row[col.id] ?? col.defaultValue ?? ""),
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...defaultRows]);
  ws["!cols"] = schema.columns.map((col) => ({
    wch: Math.max((col.label.length * 2) + 2, col.width ? Math.floor(col.width / 8) : 14),
  }));
  XLSX.utils.book_append_sheet(wb, ws, "데이터");

  XLSX.writeFile(wb, `${fileName}_양식.xlsx`);
}

/**
 * 엑셀 파일 파싱 → TableRowData[] 변환
 */
export function parseTableExcel(
  file: File,
  schema: TableTemplateSchema,
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        if (rawRows.length === 0) {
          resolve({ rows: [], errors: [], warnings: [] });
          return;
        }

        // 헤더 매핑: 엑셀 컬럼 label → schema column id
        const columnMap = buildColumnMap(schema.columns, Object.keys(rawRows[0]));

        const rows: TableRowData[] = [];
        const errors: ParseError[] = [];
        const warnings: string[] = [];

        // 매핑 안 된 컬럼 경고
        const unmapped = schema.columns.filter(
          (col) => !columnMap.has(col.id) && col.type !== "readonly",
        );
        if (unmapped.length > 0) {
          warnings.push(
            `매핑되지 않은 컬럼: ${unmapped.map((c) => c.label).join(", ")}`,
          );
        }

        for (let i = 0; i < rawRows.length; i++) {
          const rawRow = rawRows[i];
          const rowNum = i + 2; // 엑셀 행 번호
          const row: TableRowData = {};
          let hasError = false;

          for (const col of schema.columns) {
            const excelKey = columnMap.get(col.id);
            if (!excelKey) {
              // 매핑 안 된 컬럼은 기본값 사용
              row[col.id] = col.defaultValue || "";
              continue;
            }

            let value = rawRow[excelKey];
            if (value instanceof Date) {
              value = value.toISOString().split("T")[0];
            }
            const strValue = String(value ?? "").trim();

            // 필수 검증
            if (col.required && !strValue) {
              errors.push({ row: rowNum, column: col.label, message: "필수값 누락" });
              hasError = true;
              continue;
            }

            // select 타입 검증
            if (col.type === "select" && col.options && strValue) {
              if (!col.options.includes(strValue)) {
                errors.push({
                  row: rowNum,
                  column: col.label,
                  message: `"${strValue}"은(는) 유효하지 않은 값입니다 (${col.options.join(", ")})`,
                });
                hasError = true;
                continue;
              }
            }

            // number 타입 검증
            if (col.type === "number" && strValue && isNaN(Number(strValue))) {
              errors.push({ row: rowNum, column: col.label, message: `숫자가 아닙니다: "${strValue}"` });
              hasError = true;
              continue;
            }

            row[col.id] = strValue;
          }

          if (!hasError) {
            rows.push(row);
          }
        }

        resolve({ rows, errors, warnings });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsArrayBuffer(file);
  });
}

// ── 내부 유틸 ──

export interface ParseError {
  row: number;
  column: string;
  message: string;
}

export interface ParseResult {
  rows: TableRowData[];
  errors: ParseError[];
  warnings: string[];
}

/**
 * 엑셀 헤더 → 스키마 컬럼 매핑
 * label 일치 우선, 없으면 유사도 비교
 */
function buildColumnMap(
  columns: TableColumn[],
  excelHeaders: string[],
): Map<string, string> {
  const map = new Map<string, string>();

  for (const col of columns) {
    // 정확히 일치
    const exact = excelHeaders.find(
      (h) => normalize(h) === normalize(col.label),
    );
    if (exact) {
      map.set(col.id, exact);
      continue;
    }

    // 포함 관계 (예: "공장" ↔ "공장(위치)")
    const partial = excelHeaders.find(
      (h) => normalize(h).includes(normalize(col.label)) || normalize(col.label).includes(normalize(h)),
    );
    if (partial && !Array.from(map.values()).includes(partial)) {
      map.set(col.id, partial);
    }
  }

  return map;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}
