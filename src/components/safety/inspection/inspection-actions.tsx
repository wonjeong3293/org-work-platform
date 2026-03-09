"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, Calendar } from "lucide-react";
import type {
  SafetyInspectionListItem,
  EquipmentTypeOption,
} from "@/actions/safety-inspection-actions";
import { InspectionFormDialog } from "./inspection-form-dialog";
import { ExcelUploadDialog } from "./excel-upload-dialog";
import { excelDownload } from "./excel-handler";

interface Props {
  equipmentTypes: EquipmentTypeOption[];
  sites: Array<{ code: string; name: string }>;
  currentSite: string;
  currentYear: number;
  items: SafetyInspectionListItem[];
}

export function InspectionActions({
  equipmentTypes,
  sites,
  currentSite,
  currentYear,
  items,
}: Props) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploadDialog(true)}
        >
          <Upload className="mr-1 h-4 w-4" />
          엑셀 업로드
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => excelDownload(items)}
        >
          <Download className="mr-1 h-4 w-4" />
          엑셀 다운로드
        </Button>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          장비 추가
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" title="캘린더">
          <Calendar className="h-4 w-4" />
        </Button>
      </div>

      {showAddDialog && (
        <InspectionFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          equipmentTypes={equipmentTypes}
          sites={sites}
          currentSite={currentSite}
          currentYear={currentYear}
        />
      )}

      {showUploadDialog && (
        <ExcelUploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          currentSite={currentSite}
          currentYear={currentYear}
        />
      )}
    </>
  );
}
