import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMenuNodeByModuleKey } from "@/actions/menu-actions";
import { getFormTemplatesByModuleKey } from "@/actions/form-template-actions";
import { getAllUsersForAdmin } from "@/actions/user-actions";
import { DocApprovalForm } from "@/components/approval/doc-approval-form";

export default async function NewDocApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleKey: string }>;
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { moduleKey } = await params;
  const sp = await searchParams;
  const site = sp.site || "ALL";
  const year = Number(sp.year) || new Date().getFullYear();

  const menuNode = await getMenuNodeByModuleKey(moduleKey);
  const templates = await getFormTemplatesByModuleKey(moduleKey);
  const users = await getAllUsersForAdmin();

  const pageTitle = menuNode?.title || moduleKey;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{pageTitle} - 새 문서 작성</h1>
      </div>
      <DocApprovalForm
        moduleKey={moduleKey}
        siteCode={site}
        year={year}
        templates={templates.map((t) => ({ id: t.id, name: t.name, formType: t.formType, formSchema: t.formSchema, tableSchema: t.tableSchema, defaultApprovers: t.defaultApprovers }))}
        users={users.map((u) => ({ id: u.id, name: u.name, position: u.position }))}
      />
    </div>
  );
}
