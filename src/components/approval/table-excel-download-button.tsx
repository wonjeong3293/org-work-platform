"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { TableTemplateSchema, TableRowData } from "@/lib/table-schema";
import { downloadTableExcel } from "./table-excel-handler";

interface Props {
  title: string;
  tableSchema: TableTemplateSchema;
  headerData: Record<string, string>;
  tableData: TableRowData[];
}

export function TableExcelDownloadButton({
  title,
  tableSchema,
  headerData,
  tableData,
}: Props) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => downloadTableExcel(tableSchema, tableData, headerData, title)}
    >
      <Download className="mr-1 h-4 w-4" />
      엑셀
    </Button>
  );
}
