"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { FileDown, Eye, Download } from "lucide-react";
import type { TableTemplateSchema, TableRowData } from "@/lib/table-schema";

interface StepData {
  stepType: string;
  status: string;
  approverName: string;
  approverPosition: string;
  actionAt: string | null;
}

export interface TablePdfProps {
  title: string;
  tableSchema: TableTemplateSchema;
  headerData: Record<string, string>;
  tableData: TableRowData[];
  submitter: { name: string; position: string };
  steps: StepData[];
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.slice(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

async function generatePdf(props: TablePdfProps): Promise<{ blob: Blob; dataUrl: string }> {
  const { title, tableSchema, headerData, tableData, submitter, steps } = props;
  const { default: jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  let fontBase64: string | null = null;
  try {
    const resp = await fetch("/fonts/NanumGothic-Regular.ttf");
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      fontBase64 = arrayBufferToBase64(buf);
    }
  } catch {}

  const pdfOrientation = tableSchema.orientation || "landscape";
  const doc = new jsPDF({
    orientation: pdfOrientation === "landscape" ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  if (fontBase64) {
    doc.addFileToVFS("NanumGothic.ttf", fontBase64);
    doc.addFont("NanumGothic.ttf", "NanumGothic", "normal");
    doc.setFont("NanumGothic");
  }

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Title
  doc.setFontSize(16);
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 12;

  // Approval stamps
  const stampW = 24;
  const stampH = 22;
  const totalStamps = steps.length + 1;
  const stampStartX = pageW - margin - totalStamps * stampW;
  const STEP_LABELS: Record<string, string> = { APPROVE: "승인", AGREE: "합의", NOTIFY: "참조" };
  const stampY = y;

  doc.setDrawColor(100);
  doc.rect(stampStartX, stampY, stampW, stampH);
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(submitter.position || "작성", stampStartX + stampW / 2, stampY + 5, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(submitter.name, stampStartX + stampW / 2, stampY + 12, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("작성자", stampStartX + stampW / 2, stampY + 18, { align: "center" });

  steps.forEach((step, i) => {
    const sx = stampStartX + (i + 1) * stampW;
    doc.setDrawColor(100);
    doc.rect(sx, stampY, stampW, stampH);
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(step.approverPosition || STEP_LABELS[step.stepType] || step.stepType, sx + stampW / 2, stampY + 5, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(step.approverName, sx + stampW / 2, stampY + 12, { align: "center" });
    doc.setFontSize(6);
    if (step.status === "APPROVED" && step.actionAt) {
      const d = new Date(step.actionAt);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      doc.setTextColor(0, 80, 180);
      doc.text(ds, sx + stampW / 2, stampY + 18, { align: "center" });
    } else if (step.status === "REJECTED") {
      doc.setTextColor(220, 50, 50);
      doc.text("반려", sx + stampW / 2, stampY + 18, { align: "center" });
    } else {
      doc.setTextColor(150);
      doc.text("대기", sx + stampW / 2, stampY + 18, { align: "center" });
    }
  });

  doc.setTextColor(0);
  y += stampH + 8;

  // Header fields
  if (tableSchema.headerFields.length > 0) {
    doc.setFontSize(9);
    const colWidth = (pageW - 2 * margin) / 4;
    let hx = margin;
    let hy = y;
    tableSchema.headerFields.forEach((hf, i) => {
      doc.setTextColor(80);
      doc.text(`${hf.label}:`, hx, hy);
      const labelW = doc.getTextWidth(`${hf.label}: `);
      doc.setTextColor(0);
      doc.text(` ${headerData[hf.id] || "-"}`, hx + labelW, hy);
      hx += colWidth;
      if ((i + 1) % 4 === 0) { hx = margin; hy += 6; }
    });
    y = hy + 8;
  }

  // Table
  const fontName = fontBase64 ? "NanumGothic" : "helvetica";
  const heads = [tableSchema.columns.map((c) => c.label)];
  const body = tableData.map((row) => tableSchema.columns.map((c) => row[c.id] || ""));

  autoTable(doc, {
    startY: y,
    head: heads,
    body,
    margin: { left: margin, right: margin },
    styles: { font: fontName, fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: "normal" },
    theme: "grid",
  });

  const blob = doc.output("blob");
  const dataUrl = doc.output("dataurlstring");
  return { blob, dataUrl };
}

// ── PDF 다운로드 버튼 ──
export function TableDocumentPdfButton(props: TablePdfProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { blob } = await generatePdf(props);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${props.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
      <FileDown className="mr-2 h-4 w-4" />
      {loading ? "생성중..." : "PDF 다운로드"}
    </Button>
  );
}

// ── PDF 미리보기 버튼 (Sheet 패널) ──
export function TableDocumentPdfPreview(props: TablePdfProps) {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (pdfUrl) return;
    setLoading(true);
    try {
      const { blob } = await generatePdf(props);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${props.title}.pdf`;
    a.click();
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="h-auto p-0 text-primary hover:underline" onClick={handleOpen}>
        <Eye className="mr-1 h-4 w-4" />
        미리보기
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader>
            <SheetTitle className="truncate">{props.title}</SheetTitle>
            <SheetDescription>PDF 문서 미리보기</SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              PDF 생성 중...
            </div>
          ) : pdfUrl ? (
            <>
              <iframe src={pdfUrl} className="flex-1 w-full rounded border min-h-[500px]" title={props.title} />
              <div className="flex gap-2 pt-3">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  다운로드
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
