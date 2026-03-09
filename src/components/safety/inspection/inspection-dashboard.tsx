"use client";

import { useState } from "react";
import type {
  SafetyInspectionListItem,
  EquipmentTypeOption,
} from "@/actions/safety-inspection-actions";
import { StatusCards } from "./status-cards";
import { ExpiryBanner } from "./expiry-banner";
import { UpcomingDeadlines } from "./upcoming-deadlines";
import { ExpiryTimeline } from "./expiry-timeline";
import { InspectionFilters } from "./inspection-filters";
import { InspectionTable } from "./inspection-table";
import { InspectionActions } from "./inspection-actions";
import { getInspectionStatus } from "@/lib/safety-inspection-utils";

interface Props {
  initialItems: SafetyInspectionListItem[];
  statusCounts: {
    total: number;
    expired: number;
    urgent: number;
    warning: number;
    normal: number;
  };
  upcomingDeadlines: SafetyInspectionListItem[];
  equipmentTypes: EquipmentTypeOption[];
  sites: Array<{ code: string; name: string }>;
  currentSite: string;
  currentYear: number;
}

export function InspectionDashboard({
  initialItems,
  statusCounts,
  upcomingDeadlines,
  equipmentTypes,
  sites,
  currentSite,
  currentYear,
}: Props) {
  const [filterEquipmentType, setFilterEquipmentType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // 클라이언트 필터
  const filteredItems = initialItems.filter((item) => {
    if (filterEquipmentType && item.equipmentTypeId !== filterEquipmentType) return false;
    if (filterLocation && item.location !== filterLocation) return false;
    if (filterStatus) {
      const info = getInspectionStatus(item.expiryDate);
      if (info.status !== filterStatus) return false;
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const matchesSearch =
        item.code.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.spec?.toLowerCase().includes(q) ?? false) ||
        item.equipmentTypeName.toLowerCase().includes(q) ||
        (item.certNo?.toLowerCase().includes(q) ?? false);
      if (!matchesSearch) return false;
    }
    return true;
  });

  // 고유 설치장소 추출
  const locations = Array.from(new Set(initialItems.map((i) => i.location))).sort();

  return (
    <div className="space-y-6">
      {/* 상단 요약 카드 */}
      <StatusCards counts={statusCounts} />

      {/* 만료 알림 배너 */}
      {statusCounts.expired > 0 && (
        <ExpiryBanner expiredCount={statusCounts.expired} />
      )}

      {/* 다가오는 마감 + 타임라인 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingDeadlines items={upcomingDeadlines} />
        <ExpiryTimeline items={initialItems} />
      </div>

      {/* 필터 + 액션 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <InspectionFilters
          equipmentTypes={equipmentTypes}
          locations={locations}
          filterEquipmentType={filterEquipmentType}
          filterStatus={filterStatus}
          filterSearch={filterSearch}
          filterLocation={filterLocation}
          onEquipmentTypeChange={setFilterEquipmentType}
          onStatusChange={setFilterStatus}
          onSearchChange={setFilterSearch}
          onLocationChange={setFilterLocation}
        />
        <InspectionActions
          equipmentTypes={equipmentTypes}
          sites={sites}
          currentSite={currentSite}
          currentYear={currentYear}
          items={filteredItems}
        />
      </div>

      {/* 테이블 */}
      <InspectionTable
        items={filteredItems}
        equipmentTypes={equipmentTypes}
        sites={sites}
        currentSite={currentSite}
        currentYear={currentYear}
      />
    </div>
  );
}
