"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import type {
  SafetyInspectionListItem,
  EquipmentTypeOption,
} from "@/actions/safety-inspection-actions";
import { deleteSafetyInspectionItem } from "@/actions/safety-inspection-actions";
import {
  getInspectionStatus,
  formatDDay,
  formatDate,
} from "@/lib/safety-inspection-utils";
import { InspectionFormDialog } from "./inspection-form-dialog";
import { InspectionDetailDialog } from "./inspection-detail-dialog";
import { toast } from "sonner";

interface Props {
  items: SafetyInspectionListItem[];
  equipmentTypes: EquipmentTypeOption[];
  sites: Array<{ code: string; name: string }>;
  currentSite: string;
  currentYear: number;
}

export function InspectionTable({
  items,
  equipmentTypes,
  sites,
  currentSite,
  currentYear,
}: Props) {
  const [editItem, setEditItem] = useState<SafetyInspectionListItem | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  const handleDelete = async (item: SafetyInspectionListItem) => {
    if (!confirm(`"${item.code}" 장비를 삭제하시겠습니까?`)) return;
    try {
      await deleteSafetyInspectionItem(item.id);
      toast.success("삭제되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">장비 목록</CardTitle>
          <Badge variant="outline" className="text-xs">
            총 {items.length}건
          </Badge>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              등록된 장비가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">공장</TableHead>
                    <TableHead className="whitespace-nowrap">장비종류</TableHead>
                    <TableHead className="whitespace-nowrap">관리번호</TableHead>
                    <TableHead className="whitespace-nowrap">형식(규격)</TableHead>
                    <TableHead className="whitespace-nowrap">설치장소</TableHead>
                    <TableHead className="whitespace-nowrap">용량</TableHead>
                    <TableHead className="whitespace-nowrap">전 검사일</TableHead>
                    <TableHead className="whitespace-nowrap">기간만료</TableHead>
                    <TableHead className="whitespace-nowrap">D-Day</TableHead>
                    <TableHead className="whitespace-nowrap">상태</TableHead>
                    <TableHead className="whitespace-nowrap text-center">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const info = getInspectionStatus(item.expiryDate);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">{item.location}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.equipmentTypeName}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{item.code}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.spec || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.location}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.capacity || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(item.lastInspectionDate)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(item.expiryDate)}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatDDay(info.dDay)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={info.badgeVariant}>{info.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDetailItemId(item.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditItem(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수정 다이얼로그 */}
      {editItem && (
        <InspectionFormDialog
          open={!!editItem}
          onOpenChange={(open) => !open && setEditItem(null)}
          equipmentTypes={equipmentTypes}
          sites={sites}
          currentSite={currentSite}
          currentYear={currentYear}
          editData={editItem}
        />
      )}

      {/* 상세 다이얼로그 */}
      {detailItemId && (
        <InspectionDetailDialog
          open={!!detailItemId}
          onOpenChange={(open) => !open && setDetailItemId(null)}
          itemId={detailItemId}
        />
      )}
    </>
  );
}
