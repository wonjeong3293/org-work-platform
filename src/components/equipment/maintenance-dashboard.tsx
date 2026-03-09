"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wrench, DollarSign, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { createHistoryCard } from "@/actions/equipment-actions";
import type { MaintenanceDashboardData } from "@/actions/equipment-actions";

const PIE_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const CARD_TYPE_MAP: Record<string, string> = {
  INSPECTION: "점검",
  REPAIR: "수리",
  REPLACEMENT: "교체",
  OTHER: "기타",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("ko-KR");
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

// ── 수동 등록 다이얼로그 ──

function AddMaintenanceDialog({
  open,
  onOpenChange,
  equipmentOptions,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipmentOptions: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [equipmentId, setEquipmentId] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!equipmentId) {
      toast.error("설비를 선택하세요.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const costStr = fd.get("repairCost") as string;
      await createHistoryCard(equipmentId, {
        title: (fd.get("title") as string),
        cardType: "REPAIR",
        performedAt: (fd.get("performedAt") as string) || undefined,
        performedBy: (fd.get("performedBy") as string) || undefined,
        vendor: (fd.get("vendor") as string) || undefined,
        repairCost: costStr ? Number(costStr) || null : null,
        repairDetail: (fd.get("title") as string) || undefined,
      });
      toast.success("유지보수 내역이 등록되었습니다.");
      onOpenChange(false);
      setEquipmentId("");
      onDone();
    } catch {
      toast.error("등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>유지보수 내역 수동 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">설비 *</Label>
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="설비 선택" />
              </SelectTrigger>
              <SelectContent>
                {equipmentOptions.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">이력 (수리내역) *</Label>
            <Input name="title" required className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">날짜</Label>
              <Input name="performedAt" type="date" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">업체</Label>
              <Input name="vendor" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">금액 (원)</Label>
              <Input name="repairCost" type="number" className="h-8 text-sm" placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">담당</Label>
              <Input name="performedBy" className="h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Dashboard ──

interface MaintenanceDashboardProps {
  data: MaintenanceDashboardData;
  year: number;
  equipmentOptions: { id: string; name: string }[];
}

export function MaintenanceDashboard({ data, year, equipmentOptions }: MaintenanceDashboardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const monthlyData = data.monthlyStats.map((s) => ({
    name: `${String(s.month).padStart(2, "0")}월`,
    수리건수: s.repairCount,
    수리비용: s.repairCost,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-blue-100 p-3">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">총 수리 건수 (YTD {year})</p>
              <p className="text-3xl font-bold">{data.totalRepairCount}<span className="text-base font-normal text-muted-foreground ml-1">건</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">총 정비 비용 (YTD {year})</p>
              <p className="text-3xl font-bold">{formatCurrency(data.totalRepairCost)}<span className="text-base font-normal text-muted-foreground ml-1">원</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-amber-100 p-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">최다 점검 설비</p>
              <p className="text-2xl font-bold">{data.mostRepaired || "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">월별 수리 건수 및 비용 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "수리비용" ? [`${formatCurrency(Number(value))}원`, name] : [value, name]
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="수리건수" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="수리비용" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">설비별 점검 비중</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byEquipment.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                데이터가 없습니다.
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byEquipment.map((e) => ({ name: e.equipmentName, value: e.count }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {data.byEquipment.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}건`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">상세 유지보수 내역</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Total {data.recentCards.length}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              수동 등록
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentCards.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">데이터가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">날짜</th>
                    <th className="pb-3 pr-4 font-medium">설비명</th>
                    <th className="pb-3 pr-4 font-medium">유형</th>
                    <th className="pb-3 pr-4 font-medium">수리내역</th>
                    <th className="pb-3 pr-4 font-medium">업체</th>
                    <th className="pb-3 pr-4 font-medium text-right">금액 (원)</th>
                    <th className="pb-3 font-medium">담당</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCards.map((card) => (
                    <tr key={card.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">{formatDate(card.performedAt)}</td>
                      <td className="py-3 pr-4 font-medium">{card.equipmentName}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {CARD_TYPE_MAP[card.cardType] || card.cardType}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{card.repairDetail || "-"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{card.vendor || "-"}</td>
                      <td className="py-3 pr-4 text-right">
                        {card.repairCost != null ? formatCurrency(card.repairCost) : "-"}
                      </td>
                      <td className="py-3 text-muted-foreground">{card.performedBy || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수동 등록 다이얼로그 */}
      <AddMaintenanceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        equipmentOptions={equipmentOptions}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
