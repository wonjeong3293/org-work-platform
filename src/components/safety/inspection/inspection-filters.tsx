"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type { EquipmentTypeOption } from "@/actions/safety-inspection-actions";

const ALL_VALUE = "_all";

interface Props {
  equipmentTypes: EquipmentTypeOption[];
  locations: string[];
  filterEquipmentType: string;
  filterStatus: string;
  filterSearch: string;
  filterLocation: string;
  onEquipmentTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: ALL_VALUE, label: "전체 상태" },
  { value: "expired", label: "기한 만료" },
  { value: "urgent", label: "긴급" },
  { value: "warning", label: "주의" },
  { value: "normal", label: "정상" },
];

function toSelectValue(v: string) {
  return v || ALL_VALUE;
}
function fromSelectValue(v: string) {
  return v === ALL_VALUE ? "" : v;
}

export function InspectionFilters({
  equipmentTypes,
  locations,
  filterEquipmentType,
  filterStatus,
  filterSearch,
  filterLocation,
  onEquipmentTypeChange,
  onStatusChange,
  onSearchChange,
  onLocationChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={toSelectValue(filterLocation)}
        onValueChange={(v) => onLocationChange(fromSelectValue(v))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="공장 전체" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>공장 전체</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc} value={loc}>
              {loc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={toSelectValue(filterEquipmentType)}
        onValueChange={(v) => onEquipmentTypeChange(fromSelectValue(v))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="장비종류 전체" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>장비종류 전체</SelectItem>
          {equipmentTypes.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={toSelectValue(filterStatus)}
        onValueChange={(v) => onStatusChange(fromSelectValue(v))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="전체 상태" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="검색..."
          value={filterSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[180px] pl-8"
        />
      </div>
    </div>
  );
}
