/**
 * 정형 테이블 문서 스키마 타입 정의
 */

/** 테이블 컬럼 정의 */
export interface TableColumn {
  id: string;
  label: string;
  width?: number;           // px 또는 비율
  type: "text" | "number" | "select" | "readonly";
  options?: string[];        // select 타입일 때 선택값
  defaultValue?: string;     // 기본값
  required?: boolean;
}

/** 상단 헤더 필드 정의 */
export interface HeaderField {
  id: string;
  label: string;
  type: "text" | "date" | "number" | "select" | "readonly";
  options?: string[];
  defaultValue?: string;
  required?: boolean;
  half?: boolean;            // 반폭 (2개를 한 줄에 배치)
}

/** 전체 테이블 템플릿 스키마 */
export interface TableTemplateSchema {
  headerFields: HeaderField[];
  columns: TableColumn[];
  defaultRows: Record<string, string>[];  // 기본 행 데이터
  orientation?: "portrait" | "landscape"; // PDF 방향
}

/** 테이블 행 데이터 */
export type TableRowData = Record<string, string>;

/** 빈 스키마 */
export const EMPTY_TABLE_SCHEMA: TableTemplateSchema = {
  headerFields: [],
  columns: [],
  defaultRows: [],
  orientation: "landscape",
};

export function parseTableSchema(json: string): TableTemplateSchema {
  try {
    return JSON.parse(json);
  } catch {
    return EMPTY_TABLE_SCHEMA;
  }
}
