/**
 * 엑셀 파일 → 정형 테이블 양식 초안(TableTemplateSchema) 변환
 *
 * 브라우저에서 실행 (클라이언트 사이드).
 * xlsx 라이브러리로 엑셀을 파싱한 뒤 구조를 분석하여 초안을 생성한다.
 */

import * as XLSX from "xlsx";
import type { TableTemplateSchema, HeaderField, TableColumn } from "./table-schema";

export interface ExcelDraft {
  title: string;
  description: string;
  tableSchema: TableTemplateSchema;
  /** 병합 셀 정보 (참고용) */
  mergeInfo: string[];
  /** 분석 리포트 */
  analysisNotes: string[];
}

/** 날짜 관련 키워드 */
const DATE_KEYWORDS = ["일", "일자", "일시", "날짜", "date"];
/** 숫자 관련 키워드 */
const NUMBER_KEYWORDS = ["온도", "습도", "수치", "값", "횟수", "수량", "금액"];
/** 상단 헤더 필드 후보 키워드 */
const HEADER_FIELD_KEYWORDS = [
  "점검일", "측정일", "작성일", "일자", "일시", "날짜",
  "점검자", "측정자", "작성자", "담당자", "확인자",
  "온도", "습도", "기온", "날씨",
  "사업장", "공장", "현장", "부서",
  "비고", "특이사항",
];

function guessHeaderFieldType(label: string): HeaderField["type"] {
  const l = label.toLowerCase();
  if (DATE_KEYWORDS.some((k) => l.includes(k))) return "date";
  if (NUMBER_KEYWORDS.some((k) => l.includes(k))) return "number";
  return "text";
}

function guessColumnType(label: string, sampleValues: string[]): TableColumn["type"] {
  const l = label.toLowerCase();
  const filledValues = sampleValues.filter(Boolean);
  const uniqueVals = [...new Set(filledValues)];
  const allNumeric = filledValues.length > 0 && filledValues.every((v) => !isNaN(Number(v)));

  // 기준, 표준 등 변하지 않는 값이면 readonly
  if (l.includes("기준") || l.includes("표준") || l.includes("규격")) {
    return "readonly";
  }

  // 판정, 결과, 상태 같은 컬럼이 소수 반복값(2~3종)이면 select
  const isJudgmentCol = l.includes("판정") || l.includes("결과") || l.includes("상태") || l.includes("합격") || l.includes("여부");
  if (isJudgmentCol && uniqueVals.length >= 1 && uniqueVals.length <= 4) {
    return "select";
  }
  // 반복값이 매우 적고 (2~3종) + 비숫자 → select
  if (!allNumeric && uniqueVals.length >= 1 && uniqueVals.length <= 3 && filledValues.length >= 3) {
    return "select";
  }

  // 숫자 컬럼: 레이블에 차/값/측정 포함 또는 실제 데이터가 숫자
  if (allNumeric && filledValues.length > 0) return "number";
  if (l.includes("차") || l.includes("값") || l.includes("측정") || NUMBER_KEYWORDS.some((k) => l.includes(k))) {
    if (allNumeric) return "number";
  }

  return "text";
}

function makeId(prefix: string, idx: number): string {
  return `${prefix}_${idx}`;
}

/**
 * 엑셀 ArrayBuffer를 읽어 양식 초안을 생성
 */
export function parseExcelToFormDraft(buffer: ArrayBuffer, fileName: string): ExcelDraft {
  const workbook = XLSX.read(buffer, { type: "array", cellStyles: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const notes: string[] = [];
  const mergeInfo: string[] = [];

  // 병합 셀 정보 수집
  if (sheet["!merges"]) {
    for (const merge of sheet["!merges"]) {
      const from = XLSX.utils.encode_cell(merge.s);
      const to = XLSX.utils.encode_cell(merge.e);
      mergeInfo.push(`${from}:${to}`);
    }
    notes.push(`병합 셀 ${mergeInfo.length}개 감지됨 (참고용으로 기록)`);
  }

  // 전체 데이터를 2D 배열로 변환
  const raw: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: true,
  });

  if (raw.length === 0) {
    return {
      title: fileName.replace(/\.xlsx?$/i, ""),
      description: "",
      tableSchema: {
        headerFields: [],
        columns: [],
        defaultRows: [],
        orientation: "landscape",
      },
      mergeInfo,
      analysisNotes: ["빈 시트입니다."],
    };
  }

  // ===== 1. 문서 제목 추출 =====
  let title = "";
  let titleRowEnd = 0;

  for (let r = 0; r < Math.min(5, raw.length); r++) {
    const row = raw[r];
    const nonEmpty = row.filter((c) => c !== null && String(c).trim() !== "");
    // 제목: 1~2개 셀만 있고 다른 셀이 비어있는 행
    if (nonEmpty.length >= 1 && nonEmpty.length <= 2) {
      const text = String(nonEmpty[0]).trim();
      if (text.length >= 3 && text.length <= 50) {
        title = text;
        titleRowEnd = r + 1;
        notes.push(`제목 추출: "${title}" (행 ${r + 1})`);
        break;
      }
    }
  }

  if (!title) {
    title = fileName.replace(/\.xlsx?$/i, "");
    notes.push(`제목을 자동 감지하지 못해 파일명을 사용: "${title}"`);
  }

  // ===== 2. 상단 헤더 필드 추출 =====
  const headerFields: HeaderField[] = [];
  let headerRowEnd = titleRowEnd;

  // 제목 행 이후부터 "키: 값" 형태의 행을 찾음
  for (let r = titleRowEnd; r < Math.min(titleRowEnd + 10, raw.length); r++) {
    const row = raw[r];
    if (!row) continue;

    const cells = row.map((c) => (c !== null ? String(c).trim() : ""));
    const nonEmpty = cells.filter(Boolean);

    // 빈 행 건너뛰기
    if (nonEmpty.length === 0) continue;

    // 셀이 너무 많으면 테이블 헤더로 간주 → 중단
    if (nonEmpty.length >= 6) break;

    // "키: 값" 패턴 또는 키워드 매칭 방식으로 헤더 필드 추출
    // 인접 셀 쌍(키-값) 패턴도 인식: [키][값][키][값] 같은 구조
    let foundHeaderInRow = false;
    for (let c = 0; c < cells.length; c++) {
      const cellText = cells[c];
      if (!cellText) continue;

      // "키: 값" 형태 (콜론 포함)
      if (cellText.includes(":") || cellText.includes("：")) {
        const parts = cellText.split(/[:：]/).map((s) => s.trim());
        if (parts[0]) {
          headerFields.push({
            id: makeId("hf", headerFields.length),
            label: parts[0],
            type: guessHeaderFieldType(parts[0]),
            defaultValue: parts[1] || undefined,
            half: true,
          });
          foundHeaderInRow = true;
          notes.push(`상단 필드 추출: "${parts[0]}" (행 ${r + 1})`);
        }
        continue;
      }

      // 키워드 매칭
      const isHeaderKeyword = HEADER_FIELD_KEYWORDS.some((kw) => cellText.includes(kw));
      // 짧은 레이블(1~6자) + 옆에 값이 있는 경우도 헤더 필드로 인식
      const isShortLabel = cellText.length >= 1 && cellText.length <= 8 && c < cells.length - 1 && cells[c + 1];
      if (isHeaderKeyword || isShortLabel) {
        const nextCell = cells[c + 1] || "";
        // 옆 셀이 긴 레이블이면(또 다른 키) 건너뛰기
        const nextIsAlsoLabel = nextCell.length <= 4 && HEADER_FIELD_KEYWORDS.some((kw) => nextCell.includes(kw));
        if (nextIsAlsoLabel && !isHeaderKeyword) continue;

        headerFields.push({
          id: makeId("hf", headerFields.length),
          label: cellText,
          type: guessHeaderFieldType(cellText),
          defaultValue: nextCell || undefined,
          half: true,
        });
        foundHeaderInRow = true;
        notes.push(`상단 필드 추출: "${cellText}" = "${nextCell}" (행 ${r + 1})`);
        c++; // 다음 셀은 값이므로 건너뛰기
      }
    }

    if (foundHeaderInRow) {
      headerRowEnd = r + 1;
    }
  }

  // ===== 3. 테이블 컬럼 추출 =====
  // 헤더 필드 이후 행들에서 가장 셀이 많은 행을 테이블 헤더로 간주
  let tableHeaderRow = -1;
  let maxCols = 0;

  for (let r = headerRowEnd; r < Math.min(headerRowEnd + 10, raw.length); r++) {
    const row = raw[r];
    if (!row) continue;
    const nonEmpty = row.filter((c) => c !== null && String(c).trim() !== "");
    if (nonEmpty.length >= 3 && nonEmpty.length > maxCols) {
      maxCols = nonEmpty.length;
      tableHeaderRow = r;
    }
  }

  const columns: TableColumn[] = [];
  const colIndices: number[] = [];

  if (tableHeaderRow >= 0) {
    const headerRow = raw[tableHeaderRow];
    for (let c = 0; c < headerRow.length; c++) {
      const val = headerRow[c];
      if (val === null || String(val).trim() === "") continue;
      const label = String(val).trim();
      colIndices.push(c);

      // 데이터 행에서 샘플값 수집
      const sampleValues: string[] = [];
      for (let r = tableHeaderRow + 1; r < Math.min(tableHeaderRow + 20, raw.length); r++) {
        if (raw[r] && raw[r][c] !== null && raw[r][c] !== undefined) {
          sampleValues.push(String(raw[r][c]).trim());
        }
      }

      const colType = guessColumnType(label, sampleValues);
      const col: TableColumn = {
        id: makeId("col", columns.length),
        label,
        type: colType,
      };

      // select 타입이면 options 추출
      if (colType === "select") {
        col.options = [...new Set(sampleValues.filter(Boolean))];
        notes.push(`컬럼 "${label}": 선택값 감지 → ${col.options.join(", ")}`);
      }

      // readonly 타입이면 기본값 설정
      if (colType === "readonly" && sampleValues.length > 0) {
        const uniqueDefaults = [...new Set(sampleValues.filter(Boolean))];
        if (uniqueDefaults.length === 1) {
          col.defaultValue = uniqueDefaults[0];
        }
      }

      columns.push(col);
      notes.push(`컬럼 추출: "${label}" → ${colType} (열 ${c + 1}, 행 ${tableHeaderRow + 1})`);
    }
  }

  // ===== 4. 기본 행 데이터 추출 =====
  const defaultRows: Record<string, string>[] = [];

  if (tableHeaderRow >= 0 && columns.length > 0) {
    for (let r = tableHeaderRow + 1; r < Math.min(tableHeaderRow + 30, raw.length); r++) {
      const row = raw[r];
      if (!row) continue;

      const rowData: Record<string, string> = {};
      let hasData = false;

      for (let ci = 0; ci < colIndices.length; ci++) {
        const cellIdx = colIndices[ci];
        const val = row[cellIdx];
        const colId = columns[ci]?.id;
        if (!colId) continue;
        if (val !== null && val !== undefined && String(val).trim() !== "") {
          rowData[colId] = String(val).trim();
          hasData = true;
        } else {
          rowData[colId] = "";
        }
      }

      if (hasData) {
        defaultRows.push(rowData);
      }
    }
    notes.push(`기본 행 ${defaultRows.length}개 추출`);
  }

  // ===== 5. 방향 추정 =====
  const orientation = columns.length >= 6 ? "landscape" : "portrait";
  notes.push(`PDF 방향: ${orientation} (컬럼 ${columns.length}개 기준)`);

  return {
    title,
    description: `${fileName}에서 자동 생성된 양식 초안`,
    tableSchema: {
      headerFields,
      columns,
      defaultRows,
      orientation,
    },
    mergeInfo,
    analysisNotes: notes,
  };
}
