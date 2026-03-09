"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck } from "lucide-react";
import Link from "next/link";
import { TableDocumentPdfButton, TableDocumentPdfPreview } from "./table-document-pdf";
import type { TableTemplateSchema, TableRowData } from "@/lib/table-schema";

interface StepData {
  stepType: string;
  status: string;
  approverName: string;
  approverPosition: string;
  actionAt: string | null;
}

interface Props {
  data: {
    id: string;
    title: string;
    createdAt: string;
    submitter: { name: string; position: string };
    isTable: boolean;
    tableSchema: TableTemplateSchema | null;
    headerData: Record<string, string>;
    tableData: TableRowData[];
    steps: StepData[];
  };
  moduleKey: string;
  qsSuffix: string;
}

export function LatestApprovedCard({ data, moduleKey, qsSuffix }: Props) {
  const pdfProps = data.isTable && data.tableSchema ? {
    title: data.title,
    tableSchema: data.tableSchema,
    headerData: data.headerData,
    tableData: data.tableData,
    submitter: data.submitter,
    steps: data.steps,
  } : null;

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <FileCheck className="h-8 w-8 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">최근 승인 문서</p>
            <p className="font-semibold">{data.title}</p>
            <p className="text-xs text-muted-foreground">
              {data.submitter.name}
              {data.submitter.position && ` (${data.submitter.position})`}
              {" · "}
              {new Date(data.createdAt).toLocaleDateString("ko-KR")}
            </p>
            {pdfProps && (
              <div className="flex gap-3 mt-1">
                <TableDocumentPdfPreview {...pdfProps} />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">승인완료</Badge>
          {pdfProps && <TableDocumentPdfButton {...pdfProps} />}
          <Link href={`/documents/approval/${moduleKey}/${data.id}${qsSuffix}`}>
            <Button variant="outline" size="sm">보기</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
