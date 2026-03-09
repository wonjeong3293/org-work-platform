import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PolicyActiveCard } from "@/components/safety/policy-active-card";
import { PolicyDocumentTable } from "@/components/safety/policy-document-table";
import { PolicyUpload } from "@/components/safety/policy-upload";
import { getCurrentByType, getPolicyDocuments } from "@/actions/policy-actions";
import { getMenuScopeType } from "@/actions/menu-actions";
import { canCreateInScope, getScopeDisabledMessage } from "@/lib/scope";
import type { ScopeType } from "@/lib/scope";
import { AlertCircle } from "lucide-react";

export interface PolicyArchivePageConfig {
  /** 메뉴 모듈 키 (e.g. "safety_policy", "safety_goals") */
  moduleKey: string;
  /** DB category 값 (e.g. "POLICY", "GOALS") */
  category: string;
  /** 페이지 제목 (e.g. "안전보건방침", "안전보건목표") */
  title: string;
  /** 페이지 설명 */
  description: string;
  /** 브레드크럼 항목 */
  breadcrumbItems: { label: string; href?: string }[];
  /** PPT 카드 제목 (e.g. "방침 PPT (현재 적용본)", "목표 PPT (현재 적용본)") */
  pptCardTitle: string;
}

interface Props {
  config: PolicyArchivePageConfig;
  searchParams: Promise<{ site?: string; year?: string }>;
}

export async function PolicyArchivePage({ config, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = !!(session.user as Record<string, unknown>)?.isAdmin;
  const params = await searchParams;
  const site = params.site || "ALL";
  const year = Number(params.year) || new Date().getFullYear();

  const scopeType = await getMenuScopeType(config.moduleKey) as ScopeType;
  const canUpload = canCreateInScope(site, scopeType);
  const disabledMessage = getScopeDisabledMessage(site, scopeType);

  const [currentPdf, currentPpt, documents] = await Promise.all([
    getCurrentByType("SIGNED_PDF", site, config.category),
    getCurrentByType("POLICY_PPT", site, config.category),
    getPolicyDocuments({ siteCode: site, year, includeArchived: true, category: config.category }),
  ]);

  const extensions = [...new Set(documents.map((d) => d.extension))].sort();

  const serializedDocs = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  const serializedPdf = currentPdf
    ? { ...currentPdf, createdAt: currentPdf.createdAt.toISOString() }
    : null;
  const serializedPpt = currentPpt
    ? { ...currentPpt, createdAt: currentPpt.createdAt.toISOString() }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={config.breadcrumbItems} />
        <h1 className="mt-2 text-2xl font-bold">{config.title}</h1>
        <p className="text-muted-foreground">{config.description}</p>
      </div>

      {/* 현재 적용본 카드 - 좌: 서명본 PDF, 우: PPT */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PolicyActiveCard
          title="서명본 PDF (현재 적용본)"
          document={serializedPdf}
        />
        <PolicyActiveCard
          title={config.pptCardTitle}
          document={serializedPpt}
        />
      </div>

      {/* 업로드 이력 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">업로드 이력</CardTitle>
          <div className="flex items-center gap-2">
            {disabledMessage && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {disabledMessage}
              </div>
            )}
            <PolicyUpload
              label="파일 업로드"
              variant="outline"
              size="sm"
              disabled={!canUpload}
              siteCode={site}
              year={year}
              category={config.category}
            />
          </div>
        </CardHeader>
        <CardContent>
          <PolicyDocumentTable
            initialDocuments={serializedDocs}
            isAdmin={isAdmin}
            extensions={extensions}
            currentSite={site}
          />
        </CardContent>
      </Card>
    </div>
  );
}
