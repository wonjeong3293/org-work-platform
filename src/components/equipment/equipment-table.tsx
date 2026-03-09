"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronRight } from "lucide-react";
import { getSiteLabel } from "@/lib/sites";
import { EquipmentDetailDrawer } from "./equipment-detail-drawer";
import type { EquipmentListItem } from "@/actions/equipment-actions";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  ACTIVE: { label: "가동중", variant: "default" },
  INACTIVE: { label: "비가동", variant: "secondary" },
  MAINTENANCE: { label: "점검중", variant: "outline" },
  DISPOSED: { label: "폐기", variant: "destructive" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

function siteBadgeVariant(siteCode: string) {
  if (siteCode === "ALL") return "default" as const;
  if (siteCode === "HS") return "secondary" as const;
  return "outline" as const;
}

interface EquipmentTableProps {
  initialData: EquipmentListItem[];
}

export function EquipmentTable({ initialData }: EquipmentTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialData.filter((eq) => {
      if (statusFilter !== "all" && eq.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          eq.name.toLowerCase().includes(q) ||
          eq.location.toLowerCase().includes(q) ||
          (eq.model?.toLowerCase().includes(q) ?? false) ||
          (eq.manufacturer?.toLowerCase().includes(q) ?? false) ||
          (eq.serialNumber?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      return true;
    });
  }, [initialData, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="설비명, 위치, 모델명 검색..."
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
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="ACTIVE">가동중</SelectItem>
            <SelectItem value="INACTIVE">비가동</SelectItem>
            <SelectItem value="MAINTENANCE">점검중</SelectItem>
            <SelectItem value="DISPOSED">폐기</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {search || statusFilter !== "all"
            ? "검색 결과가 없습니다."
            : "등록된 설비가 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">사업장</th>
                <th className="pb-3 pr-4 font-medium">설비명</th>
                <th className="pb-3 pr-4 font-medium">위치</th>
                <th className="pb-3 pr-4 font-medium">모델명</th>
                <th className="pb-3 pr-4 font-medium">최종 점검일</th>
                <th className="pb-3 pr-4 font-medium">차기 검사일</th>
                <th className="pb-3 pr-4 font-medium">상태</th>
                <th className="pb-3 font-medium">상세</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((eq) => {
                const statusInfo = STATUS_MAP[eq.status] || { label: eq.status, variant: "default" as const };
                return (
                  <tr
                    key={eq.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedId(eq.id)}
                  >
                    <td className="py-3 pr-4">
                      <Badge variant={siteBadgeVariant(eq.siteCode)} className="text-xs">
                        {getSiteLabel(eq.siteCode)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium">{eq.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{eq.location}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{eq.model || "-"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(eq.lastInspection)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(eq.nextInspection)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(eq.id);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 Drawer */}
      <EquipmentDetailDrawer
        equipmentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
