import { redirect } from "next/navigation";
import { getModuleRoute } from "@/lib/module-registry";
import { getMenuNodeByModuleKey } from "@/actions/menu-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

function buildRedirectUrl(path: string, sp: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (sp.site) params.set("site", sp.site);
  if (sp.year) params.set("year", sp.year);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleKey: string }>;
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  const { moduleKey } = await params;
  const sp = await searchParams;
  const route = getModuleRoute(moduleKey);

  // 등록된 모듈이면 해당 페이지로 리다이렉트
  if (route) {
    redirect(buildRedirectUrl(route, sp));
  }

  // DB에서 pageType 확인 후 동적 라우팅
  const menuNode = await getMenuNodeByModuleKey(moduleKey);
  if (menuNode?.pageType === "DOCUMENT_ARCHIVE") {
    redirect(buildRedirectUrl(`/documents/archive/${moduleKey}`, sp));
  }
  if (menuNode?.pageType === "DOCUMENT_APPROVAL") {
    redirect(buildRedirectUrl(`/documents/approval/${moduleKey}`, sp));
  }
  if (menuNode?.pageType === "EQUIPMENT_MASTER") {
    redirect(buildRedirectUrl(`/production/equipment-master`, sp));
  }
  if (menuNode?.pageType === "DATA_DASHBOARD") {
    const route = getModuleRoute(moduleKey);
    if (route) redirect(buildRedirectUrl(route, sp));
  }

  // 미등록 모듈 → 준비중 페이지
  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
          <Construction className="h-16 w-16 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-xl font-semibold">준비중</h2>
            <p className="mt-2 text-muted-foreground">
              이 기능은 아직 개발되지 않았습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
