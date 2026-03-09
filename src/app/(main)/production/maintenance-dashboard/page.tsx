import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { getMaintenanceDashboard, getEquipmentList } from "@/actions/equipment-actions";
import { MaintenanceDashboard } from "@/components/equipment/maintenance-dashboard";

const breadcrumbItems = [
  { label: "홈", href: "/dashboard" },
  { label: "생산기술", href: "/section/prod" },
  { label: "설비관리", href: "/section/prod/equipment-mgmt" },
  { label: "생산설비 유지보수", href: "/section/prod/equipment-mgmt/equipment-maintenance" },
  { label: "유지보수 현황" },
];

export default async function MaintenanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const site = params.site || "ALL";
  const year = params.year ? Number(params.year) : new Date().getFullYear();

  const [data, equipmentList] = await Promise.all([
    getMaintenanceDashboard({ siteCode: site, year }),
    getEquipmentList({ siteCode: site }),
  ]);

  const equipmentOptions = equipmentList.map((eq) => ({ id: eq.id, name: eq.name }));

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="mt-2 text-2xl font-bold">유지보수 현황</h1>
        <p className="text-muted-foreground">
          설비 유지보수 현황을 한눈에 파악합니다.
        </p>
      </div>
      <MaintenanceDashboard data={data} year={year} equipmentOptions={equipmentOptions} />
    </div>
  );
}
