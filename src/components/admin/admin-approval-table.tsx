"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Search, CheckSquare } from "lucide-react";
import { deleteDocApproval, deleteDocApprovalBulk } from "@/actions/doc-approval-actions";
import { getSiteLabel } from "@/lib/sites";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "임시저장", variant: "outline" },
  REQUESTED: { label: "결재요청", variant: "secondary" },
  IN_PROGRESS: { label: "결재중", variant: "secondary" },
  APPROVED: { label: "승인완료", variant: "default" },
  REJECTED: { label: "반려", variant: "destructive" },
};

interface ApprovalRow {
  id: string;
  moduleKey: string;
  title: string;
  status: string;
  siteCode: string;
  year: number;
  createdAt: string;
  submitter: { name: string; position: string | null };
  formTemplate: { name: string; formType: string } | null;
  stepCount: number;
}

interface Props {
  approvals: ApprovalRow[];
}

export function AdminApprovalTable({ approvals }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const filtered = approvals.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.submitter.name.toLowerCase().includes(q) || item.moduleKey.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 결재문서를 삭제하시겠습니까?\n삭제하면 복구할 수 없습니다.`)) return;
    setLoading(true);
    try {
      await deleteDocApproval(id);
      toast.success("삭제되었습니다.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}건의 결재문서를 모두 삭제하시겠습니까?\n삭제하면 복구할 수 없습니다.`)) return;
    setLoading(true);
    try {
      await deleteDocApprovalBulk(Array.from(selected));
      toast.success(`${selected.size}건이 삭제되었습니다.`);
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 필터 + 일괄 삭제 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="제목, 작성자, 모듈키 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="DRAFT">임시저장</SelectItem>
            <SelectItem value="REQUESTED">결재요청</SelectItem>
            <SelectItem value="IN_PROGRESS">결재중</SelectItem>
            <SelectItem value="APPROVED">승인완료</SelectItem>
            <SelectItem value="REJECTED">반려</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={loading}>
            <Trash2 className="mr-1 h-4 w-4" />
            선택 삭제 ({selected.size}건)
          </Button>
        )}
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">결재 문서가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-2 font-medium w-10">
                  <button type="button" onClick={toggleAll} className="hover:text-foreground">
                    <CheckSquare className={`h-4 w-4 ${selected.size === filtered.length && filtered.length > 0 ? "text-primary" : ""}`} />
                  </button>
                </th>
                <th className="pb-3 pr-4 font-medium">모듈</th>
                <th className="pb-3 pr-4 font-medium">사업장</th>
                <th className="pb-3 pr-4 font-medium">제목</th>
                <th className="pb-3 pr-4 font-medium">양식</th>
                <th className="pb-3 pr-4 font-medium">작성자</th>
                <th className="pb-3 pr-4 font-medium">상태</th>
                <th className="pb-3 pr-4 font-medium">작성일</th>
                <th className="pb-3 font-medium">삭제</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const sc = STATUS_CONFIG[item.status] || { label: item.status, variant: "outline" as const };
                const isChecked = selected.has(item.id);
                return (
                  <tr key={item.id} className={`border-b last:border-0 ${isChecked ? "bg-blue-50" : "hover:bg-muted/50"}`}>
                    <td className="py-3 pr-2">
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(item.id)} className="rounded" />
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">{item.moduleKey}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">{getSiteLabel(item.siteCode)}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium max-w-[200px] truncate">{item.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.formTemplate?.name || "-"}</td>
                    <td className="py-3 pr-4">
                      {item.submitter.name}
                      {item.submitter.position && <span className="ml-1 text-muted-foreground">({item.submitter.position})</span>}
                    </td>
                    <td className="py-3 pr-4"><Badge variant={sc.variant}>{sc.label}</Badge></td>
                    <td className="py-3 pr-4 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</td>
                    <td className="py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(item.id, item.title)} disabled={loading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
