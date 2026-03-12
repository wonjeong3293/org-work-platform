"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { PolicyPreviewButton } from "./policy-preview";
import { PolicyArchiveButton } from "./policy-archive-button";
import { PolicyDeleteDialog } from "./policy-delete-dialog";
import { PolicySetCurrentButton } from "./policy-set-current-button";
import { getSiteLabel } from "@/lib/sites";
import { useHydrated } from "@/lib/client-only";

interface PolicyDocument {
  id: string;
  extension: string;
  version: number;
  originalName: string;
  fileSize: number;
  isArchived: boolean;
  isCurrent: boolean;
  policyType: string;
  siteCode: string;
  year: number;
  createdAt: string;
  uploadedBy: { name: string; position: string | null };
}

interface PolicyDocumentTableProps {
  initialDocuments: PolicyDocument[];
  isAdmin: boolean;
  extensions: string[];
  currentSite: string;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function extensionVariant(ext: string) {
  if (ext === "pdf") return "outline" as const;
  if (ext === "pptx" || ext === "ppt") return "secondary" as const;
  return "default" as const;
}

function siteBadgeVariant(siteCode: string) {
  if (siteCode === "ALL") return "default" as const;
  if (siteCode === "HS") return "secondary" as const;
  return "outline" as const;
}

function ClientOnlyText({ value, fallback = "-" }: { value: string; fallback?: string }) {
  const hydrated = useHydrated();
  return <>{hydrated ? value : fallback}</>;
}

export function PolicyDocumentTable({
  initialDocuments,
  isAdmin,
  extensions,
  currentSite,
}: PolicyDocumentTableProps) {
  const [search, setSearch] = useState("");
  const [extensionFilter, setExtensionFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  const filteredDocs = useMemo(() => {
    return initialDocuments.filter((doc) => {
      if (!showArchived && doc.isArchived) return false;
      if (extensionFilter !== "all" && doc.extension !== extensionFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = doc.originalName.toLowerCase().includes(q);
        const uploaderMatch = doc.uploadedBy.name.toLowerCase().includes(q);
        if (!nameMatch && !uploaderMatch) return false;
      }
      return true;
    });
  }, [initialDocuments, search, extensionFilter, showArchived]);

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="파일명 또는 업로더 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={extensionFilter} onValueChange={setExtensionFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="확장자" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 확장자</SelectItem>
            {extensions.map((ext) => (
              <SelectItem key={ext} value={ext}>
                {ext}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded"
          />
          보관 문서 표시
        </label>
      </div>

      {/* 테이블 */}
      {filteredDocs.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {search || extensionFilter !== "all"
            ? "검색 결과가 없습니다."
            : "아직 업로드된 문서가 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">사업장</th>
                <th className="pb-3 pr-4 font-medium">연도</th>
                <th className="pb-3 pr-4 font-medium">확장자</th>
                <th className="pb-3 pr-4 font-medium">파일명</th>
                <th className="pb-3 pr-4 font-medium">업로더</th>
                <th className="pb-3 pr-4 font-medium">업로드일</th>
                <th className="pb-3 pr-4 font-medium">미리보기</th>
                <th className="pb-3 pr-4 font-medium">다운로드</th>
                <th className="pb-3 pr-4 font-medium">최신본</th>
                <th className="pb-3 pr-4 font-medium">보관</th>
                {isAdmin && (
                  <th className="pb-3 font-medium">삭제</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => {
                const canDelete = currentSite === doc.siteCode;
                return (
                  <tr
                    key={doc.id}
                    className={`border-b last:border-0 ${doc.isArchived ? "opacity-50" : ""}`}
                  >
                    <td className="py-3 pr-4">
                      <Badge variant={siteBadgeVariant(doc.siteCode)} className="text-xs">
                        {getSiteLabel(doc.siteCode)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {doc.year}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={extensionVariant(doc.extension)}>
                        {doc.extension}
                      </Badge>
                    </td>
                    <td
                      className="max-w-[200px] truncate py-3 pr-4"
                      title={doc.originalName}
                    >
                      {doc.originalName}
                    </td>
                    <td className="py-3 pr-4">
                      {doc.uploadedBy.name}
                      {doc.uploadedBy.position && (
                        <span className="ml-1 text-muted-foreground">
                          ({doc.uploadedBy.position})
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <ClientOnlyText value={formatDate(doc.createdAt)} />
                    </td>
                    <td className="py-3 pr-4">
                      {doc.extension === "pdf" ? (
                        <PolicyPreviewButton
                          id={doc.id}
                          extension={doc.extension}
                          originalName={doc.originalName}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <a
                        href={`/api/safety/policy/download/${doc.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        다운로드
                      </a>
                    </td>
                    <td className="py-3 pr-4">
                      <PolicySetCurrentButton
                        documentId={doc.id}
                        isCurrent={doc.isCurrent}
                        isArchived={doc.isArchived}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <PolicyArchiveButton
                        documentId={doc.id}
                        isArchived={doc.isArchived}
                        originalName={doc.originalName}
                      />
                    </td>
                    {isAdmin && (
                      <td className="py-3">
                        {canDelete ? (
                          <PolicyDeleteDialog
                            documentId={doc.id}
                            originalName={doc.originalName}
                          />
                        ) : (
                          <span
                            className="text-xs text-muted-foreground"
                            title={`${getSiteLabel(doc.siteCode)}에서만 삭제 가능`}
                          >
                            -
                          </span>
                        )}
                      </td>
                    )}
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
