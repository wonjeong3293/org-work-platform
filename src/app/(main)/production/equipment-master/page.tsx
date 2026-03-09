import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { getEquipmentList, getEquipmentStatusCounts } from "@/actions/equipment-actions";
import { EquipmentTable } from "@/components/equipment/equipment-table";
import { EquipmentCreateDialog } from "@/components/equipment/equipment-create-dialog";

const breadcrumbItems = [
  { label: "홈", href: "/dashboard" },
  { label: "생산기술", href: "/section/prod" },
  { label: "설비관리", href: "/section/prod/equipment-mgmt" },
  { label: "생산설비 유지보수", href: "/section/prod/equipment-mgmt/equipment-maintenance" },
  { label: "설비 마스터" },
];

export default async function EquipmentMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const site = params.site || "ALL";

  const [equipmentList, statusCounts] = await Promise.all([
    getEquipmentList({ siteCode: site }),
    getEquipmentStatusCounts(site),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="mt-2 text-2xl font-bold">설비 마스터</h1>
          <p className="text-muted-foreground">
            생산설비 현황을 조회하고 관리합니다.
          </p>
        </div>
        <EquipmentCreateDialog />
      </div>

      {/* 상태 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-100 p-2">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">전체</p>
              <p className="text-2xl font-bold">{statusCounts.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">가동중</p>
              <p className="text-2xl font-bold">{statusCounts.ACTIVE}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">점검중</p>
              <p className="text-2xl font-bold">{statusCounts.MAINTENANCE}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-red-100 p-2">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">비가동/폐기</p>
              <p className="text-2xl font-bold">
                {(statusCounts.INACTIVE || 0) + (statusCounts.DISPOSED || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 설비 목록 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">설비 목록</CardTitle>
          <Badge variant="outline" className="text-xs">
            총 {equipmentList.length}건
          </Badge>
        </CardHeader>
        <CardContent>
          <EquipmentTable initialData={equipmentList} />
        </CardContent>
      </Card>
    </div>
  );
}
