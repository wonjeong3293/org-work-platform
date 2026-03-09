"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TableTemplateSchema, TableRowData } from "@/lib/table-schema";

interface Props {
  tableSchema: TableTemplateSchema;
  headerData: Record<string, string>;
  tableData: TableRowData[];
}

export function TableDocumentView({ tableSchema, headerData, tableData }: Props) {
  return (
    <div className="space-y-4">
      {/* 상단 필드 */}
      {tableSchema.headerFields.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">문서 정보</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {tableSchema.headerFields.map((hf) => (
                <div key={hf.id} className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{hf.label}</span>
                  <span className="text-sm">{headerData[hf.id] || "-"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 테이블 본문 */}
      {tableSchema.columns.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">측정 데이터</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-center text-xs font-medium w-10">#</th>
                    {tableSchema.columns.map((col) => (
                      <th key={col.id} className="px-3 py-2 text-left text-xs font-medium" style={col.width ? { width: `${col.width}px` } : undefined}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.length === 0 ? (
                    <tr><td colSpan={tableSchema.columns.length + 1} className="py-6 text-center text-muted-foreground">데이터 없음</td></tr>
                  ) : (
                    tableData.map((row, ri) => (
                      <tr key={ri} className="border-b last:border-0">
                        <td className="px-3 py-2 text-center text-xs text-muted-foreground">{ri + 1}</td>
                        {tableSchema.columns.map((col) => (
                          <td key={col.id} className="px-3 py-2">{row[col.id] || "-"}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
