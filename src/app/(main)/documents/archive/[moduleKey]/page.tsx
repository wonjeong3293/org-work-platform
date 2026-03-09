import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDocuments,
  getCurrentDocument,
} from "@/actions/document-actions";
import {
  getMenuNodeByModuleKey,
} from "@/actions/menu-actions";
import { canCreateInScope, getScopeDisabledMessage } from "@/lib/scope";
import type { ScopeType } from "@/lib/scope";
import { DocumentTable } from "@/components/documents/document-table";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentActiveCard } from "@/components/documents/document-active-card";
import { AlertCircle } from "lucide-react";

export default async function DocumentArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleKey: string }>;
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = !!(session.user as Record<string, unknown>)?.isAdmin;
  const { moduleKey } = await params;
  const sp = await searchParams;
  const site = sp.site || "ALL";
  const year = Number(sp.year) || new Date().getFullYear();

  const menuNode = await getMenuNodeByModuleKey(moduleKey);
  const scopeType = (menuNode?.scopeType || "SITE_ONLY") as ScopeType;
  const canUpload = canCreateInScope(site, scopeType);
  const disabledMessage = getScopeDisabledMessage(site, scopeType);

  const [currentDoc, documents] = await Promise.all([
    getCurrentDocument(moduleKey, site),
    getDocuments(moduleKey, { siteCode: site, year, includeArchived: true }),
  ]);

  const extensions = [...new Set(documents.map((d) => d.extension))].sort();

  const serializedDocs = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    archivedAt: d.archivedAt?.toISOString() || null,
  }));

  const serializedCurrent = currentDoc
    ? {
        ...currentDoc,
        createdAt: currentDoc.createdAt.toISOString(),
        updatedAt: currentDoc.updatedAt.toISOString(),
        archivedAt: currentDoc.archivedAt?.toISOString() || null,
      }
    : null;

  const pageTitle = menuNode?.title || moduleKey;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground">문서를 관리합니다.</p>
      </div>

      {/* 현재 적용본 */}
      {serializedCurrent && (
        <DocumentActiveCard document={serializedCurrent} />
      )}

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
            <DocumentUpload
              moduleKey={moduleKey}
              siteCode={site}
              year={year}
              disabled={!canUpload}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DocumentTable
            documents={serializedDocs}
            isAdmin={isAdmin}
            extensions={extensions}
            currentSite={site}
            moduleKey={moduleKey}
          />
        </CardContent>
      </Card>
    </div>
  );
}
