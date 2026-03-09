"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { getSiteLabel } from "@/lib/sites";
import Link from "next/link";
import { TableDocumentPdfButton, TableDocumentPdfPreview } from "./table-document-pdf";
import type { TableTemplateSchema, TableRowData } from "@/lib/table-schema";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "임시저장", variant: "outline" },
  REQUESTED: { label: "결재요청", variant: "secondary" },
  IN_PROGRESS: { label: "결재중", variant: "secondary" },
  APPROVED: { label: "승인완료", variant: "default" },
  REJECTED: { label: "반려", variant: "destructive" },
};

interface StepData {
  stepType: string;
  status: string;
  approverName: string;
  approverPosition: string;
  actionAt: string | null;
}

interface ApprovalRow {
  id: string;
  title: string;
  status: string;
  siteCode: string;
  createdAt: string;
  submitter: { name: string; position: string };
  formTemplate: { name: string; formType: string } | null;
  isTable: boolean;
  tableSchema: TableTemplateSchema | null;
  headerData: Record<string, string>;
  tableData: TableRowData[];
  steps: StepData[];
}

interface Props {
  approvals: ApprovalRow[];
  moduleKey: string;
  qsSuffix: string;
}

export function DocApprovalTable({ approvals, moduleKey, qsSuffix }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return approvals.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.submitter.name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [approvals, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제목 또는 작성자 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="DRAFT">임시저장</SelectItem>
            <SelectItem value="REQUESTED">결재요청</SelectItem>
            <SelectItem value="IN_PROGRESS">결재중</SelectItem>
            <SelectItem value="APPROVED">승인완료</SelectItem>
            <SelectItem value="REJECTED">반려</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {search || statusFilter !== "ALL" ? "검색 결과가 없습니다." : "아직 작성된 문서가 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">사업장</th>
                <th className="pb-3 pr-4 font-medium">제목</th>
                <th className="pb-3 pr-4 font-medium">양식</th>
                <th className="pb-3 pr-4 font-medium">작성자</th>
                <th className="pb-3 pr-4 font-medium">상태</th>
                <th className="pb-3 pr-4 font-medium">작성일</th>
                <th className="pb-3 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const sc = STATUS_CONFIG[item.status] || { label: item.status, variant: "outline" as const };
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">{getSiteLabel(item.siteCode)}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Link href={`/documents/approval/${moduleKey}/${item.id}${qsSuffix}`} className="text-primary hover:underline font-medium">
                        {item.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {item.formTemplate?.name || "-"}
                    </td>
                    <td className="py-3 pr-4">
                      {item.submitter.name}
                      {item.submitter.position && <span className="ml-1 text-muted-foreground">({item.submitter.position})</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-3">
                      {item.isTable && item.tableSchema && item.status === "APPROVED" ? (
                        <div className="flex items-center gap-1">
                          <TableDocumentPdfPreview
                            title={item.title}
                            tableSchema={item.tableSchema}
                            headerData={item.headerData}
                            tableData={item.tableData}
                            submitter={item.submitter}
                            steps={item.steps}
                          />
                          <TableDocumentPdfButton
                            title={item.title}
                            tableSchema={item.tableSchema}
                            headerData={item.headerData}
                            tableData={item.tableData}
                            submitter={item.submitter}
                            steps={item.steps}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
