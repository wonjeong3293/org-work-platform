import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFormTemplates } from "@/actions/form-template-actions";
import { FormTemplateCreateButton, FormTemplateEditButton, FormTemplateDeleteButton } from "@/components/admin/form-template-form";
import { ExcelImportButton } from "@/components/admin/excel-import-button";
import { getMenuNodes } from "@/actions/menu-actions";

const FORM_TYPE_LABELS: Record<string, string> = {
  FORM: "일반 결재문서",
  TABLE: "정형 테이블",
  FILE: "파일 업로드",
  SUMMARY: "요약 문서",
};

export default async function AdminFormsPage() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) redirect("/dashboard");

  const [templates, menuNodes] = await Promise.all([
    getFormTemplates(),
    getMenuNodes(),
  ]);

  const menuOptions = menuNodes
    .filter((n) => n.moduleKey)
    .map((n) => ({ id: n.id, title: n.title, moduleKey: n.moduleKey, domain: n.domain }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">양식 관리</h1>
          <p className="text-sm text-muted-foreground">문서결재형 페이지에서 사용할 양식을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <ExcelImportButton menuOptions={menuOptions} />
          <FormTemplateCreateButton menuOptions={menuOptions} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">양식 목록</CardTitle></CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">등록된 양식이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">양식명</th>
                    <th className="pb-3 pr-4 font-medium">유형</th>
                    <th className="pb-3 pr-4 font-medium">연결 메뉴</th>
                    <th className="pb-3 pr-4 font-medium">사업장</th>
                    <th className="pb-3 pr-4 font-medium">필드</th>
                    <th className="pb-3 pr-4 font-medium">상태</th>
                    <th className="pb-3 font-medium">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{t.name}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{FORM_TYPE_LABELS[t.formType] || t.formType}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {t.menuNode ? (
                          <Badge variant="secondary" className="text-xs">{t.menuNode.title}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs">{t.allowedSites}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {t.formType === "TABLE"
                          ? (() => { try { const ts = JSON.parse(t.tableSchema); return `${ts.columns?.length || 0}열`; } catch { return "0열"; } })()
                          : (() => { try { return JSON.parse(t.formSchema).length; } catch { return 0; } })()
                        }
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "활성" : "비활성"}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <FormTemplateEditButton template={t} menuOptions={menuOptions} />
                          <FormTemplateDeleteButton templateId={t.id} templateName={t.name} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
