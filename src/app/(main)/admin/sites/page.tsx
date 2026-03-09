import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSites } from "@/actions/site-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteCreateButton, SiteEditButton, SiteDeleteButton } from "@/components/admin/site-form";

export default async function AdminSitesPage() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    redirect("/dashboard");
  }

  const sites = await getSites();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">사업장 관리</h1>
          <p className="text-sm text-muted-foreground">
            사업장(사이트) 등록 및 관리 ({sites.length}개)
          </p>
        </div>
        <SiteCreateButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">사업장 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">코드</th>
                  <th className="pb-3 pr-4 font-medium">사업장명</th>
                  <th className="pb-3 pr-4 font-medium">상태</th>
                  <th className="pb-3 pr-4 font-medium">순서</th>
                  <th className="pb-3 font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id} className={`border-b last:border-0 ${!site.isActive ? "opacity-50" : ""}`}>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="font-mono">{site.code}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium">{site.name}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={site.isActive ? "default" : "secondary"}>
                        {site.isActive ? "활성" : "비활성"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{site.sortOrder}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <SiteEditButton site={site} />
                        <SiteDeleteButton site={site} />
                      </div>
                    </td>
                  </tr>
                ))}
                {sites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      등록된 사업장이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
