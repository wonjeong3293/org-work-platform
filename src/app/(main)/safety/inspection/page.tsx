import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import {
  getSafetyInspectionList,
  getStatusCounts,
  getUpcomingDeadlines,
  getEquipmentTypes,
} from "@/actions/safety-inspection-actions";
import { getActiveSites } from "@/actions/site-actions";
import { InspectionDashboard } from "@/components/safety/inspection/inspection-dashboard";

const breadcrumbItems = [
  { label: "홈", href: "/dashboard" },
  { label: "안전", href: "/section/safety" },
  { label: "산업안전", href: "/section/safety/industrial-safety" },
  { label: "인허가 및 인증", href: "/section/safety/industrial-safety/license-cert" },
  { label: "안전검사" },
];

export default async function SafetyInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const site = params.site || "ALL";
  const year = Number(params.year) || new Date().getFullYear();

  const [items, statusCounts, upcomingDeadlines, equipmentTypes, sites] = await Promise.all([
    getSafetyInspectionList({ siteCode: site, year }),
    getStatusCounts(site, year),
    getUpcomingDeadlines(site, year),
    getEquipmentTypes(),
    getActiveSites().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">안전검사 대시보드</h1>
            <p className="text-sm text-muted-foreground">
              기준일: {new Date().toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
      </div>

      <InspectionDashboard
        initialItems={items}
        statusCounts={statusCounts}
        upcomingDeadlines={upcomingDeadlines}
        equipmentTypes={equipmentTypes}
        sites={sites.map((s) => ({ code: s.code, name: s.name }))}
        currentSite={site}
        currentYear={year}
      />
    </div>
  );
}
