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
import { getSiteLabel } from "@/lib/sites";
import { useHydrated } from "@/lib/client-only";
import { DocumentDeleteDialog } from "./document-delete-dialog";
import { DocumentSetCurrentButton } from "./document-set-current-button";
import { DocumentArchiveButton } from "./document-archive-button";

interface DocumentRow {
  id: string;
  moduleKey: string;
  title: string;
  extension: string;
  version: number;
  originalName: string;
  fileSize: number;
  status: string;
  isCurrent: boolean;
  siteCode: string;
  year: number;
  createdAt: string;
  createdBy: { name: string; position: string | null };
}

interface Props {
  documents: DocumentRow[];
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

function ClientOnlyText({
  value,
  fallback = "-",
}: {
  value: string;
  fallback?: string;
}) {
  const hydrated = useHydrated();
  return <>{hydrated ? value : fallback}</>;
}

function siteBadgeVariant(siteCode: string) {
  if (siteCode === "ALL") return "default" as const;
  if (siteCode === "HS") return "secondary" as const;
  return "outline" as const;
}

export function DocumentTable({
  documents,
  isAdmin,
  extensions,
  currentSite,
}: Props) {
  const [search, setSearch] = useState("");
  const [extensionFilter, setExtensionFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (!showArchived && doc.status === "ARCHIVED") return false;
      if (extensionFilter !== "all" && doc.extension !== extensionFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !doc.originalName.toLowerCase().includes(q) &&
          !doc.createdBy.name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [documents, search, extensionFilter, showArchived]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
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
            <SelectItem value="all">전체</SelectItem>
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

      {filtered.length === 0 ? (
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
                <th className="pb-3 pr-4 font-medium">다운로드</th>
                <th className="pb-3 pr-4 font-medium">최신본</th>
                <th className="pb-3 pr-4 font-medium">보관</th>
                {isAdmin && <th className="pb-3 font-medium">삭제</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const canDelete = currentSite === doc.siteCode;
                return (
                  <tr
                    key={doc.id}
                    className={`border-b last:border-0 ${doc.status === "ARCHIVED" ? "opacity-50" : ""}`}
                  >
                    <td className="py-3 pr-4">
                      <Badge
                        variant={siteBadgeVariant(doc.siteCode)}
                        className="text-xs"
                      >
                        {getSiteLabel(doc.siteCode)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {doc.year}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline">{doc.extension}</Badge>
                    </td>
                    <td
                      className="max-w-[200px] truncate py-3 pr-4"
                      title={doc.originalName}
                    >
                      {doc.originalName}
                    </td>
                    <td className="py-3 pr-4">
                      {doc.createdBy.name}
                      {doc.createdBy.position && (
                        <span className="ml-1 text-muted-foreground">
                          ({doc.createdBy.position})
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <ClientOnlyText value={formatDate(doc.createdAt)} />
                    </td>
                    <td className="py-3 pr-4">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Download className="h-4 w-4" /> 다운로드
                      </a>
                    </td>
                    <td className="py-3 pr-4">
                      <DocumentSetCurrentButton
                        documentId={doc.id}
                        isCurrent={doc.isCurrent}
                        isArchived={doc.status === "ARCHIVED"}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <DocumentArchiveButton
                        documentId={doc.id}
                        isArchived={doc.status === "ARCHIVED"}
                        originalName={doc.originalName}
                      />
                    </td>
                    {isAdmin && (
                      <td className="py-3">
                        {canDelete ? (
                          <DocumentDeleteDialog
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
