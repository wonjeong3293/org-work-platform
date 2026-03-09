import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMenuNodes, getMenuTree } from "@/actions/menu-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MenuCreateButton, MenuEditButton, MenuDeleteButton, MenuReorderButtons } from "@/components/admin/menu-form";
import type { MenuTreeNode } from "@/actions/menu-actions";
import { getScopeTypeLabel } from "@/lib/scope";

const PAGE_TYPE_LABELS: Record<string, string> = {
  NONE: "-",
  DOCUMENT_ARCHIVE: "문서보관",
  DOCUMENT_APPROVAL: "문서결재",
};

const DOMAIN_LABELS: Record<string, string> = {
  COMMON: "공통",
  PRODUCTION: "생산기술",
  ENV: "환경",
  SAFETY: "안전",
};

function flattenTree(nodes: MenuTreeNode[], depth = 0): { node: MenuTreeNode; depth: number }[] {
  const result: { node: MenuTreeNode; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

export default async function AdminMenusPage() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    redirect("/dashboard");
  }

  const [allNodes, menuTree] = await Promise.all([
    getMenuNodes(),
    getMenuTree(),
  ]);

  const flatItems = flattenTree(menuTree);

  // allNodes를 MenuNodeFlat 형태로 변환 (menu-form에서 사용)
  const nodesForForm = allNodes.map((n) => ({
    ...n,
    route: n.route,
    icon: n.icon,
    parentId: n.parentId,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">메뉴 관리</h1>
          <p className="text-sm text-muted-foreground">좌측 네비게이션 메뉴를 관리합니다.</p>
        </div>
        <MenuCreateButton allNodes={nodesForForm} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">메뉴 트리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">제목</th>
                  <th className="pb-3 pr-4 font-medium">도메인</th>
                  <th className="pb-3 pr-4 font-medium">타입</th>
                  <th className="pb-3 pr-4 font-medium">모듈 키</th>
                  <th className="pb-3 pr-4 font-medium">스코프</th>
                  <th className="pb-3 pr-4 font-medium">페이지</th>
                  <th className="pb-3 pr-4 font-medium">순서</th>
                  <th className="pb-3 font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {flatItems.map(({ node, depth }) => {
                  const flatNode = allNodes.find((n) => n.id === node.id);
                  if (!flatNode) return null;
                  return (
                    <tr key={node.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <span style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center gap-1">
                          {depth > 0 && <span className="text-gray-300">└</span>}
                          {node.title}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{DOMAIN_LABELS[node.domain] || node.domain}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={node.type === "PAGE" ? "default" : "secondary"}>
                          {node.type === "PAGE" ? "페이지" : "폴더"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {node.moduleKey ? (
                          <Badge variant="outline" className="font-mono text-xs">{node.moduleKey}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {getScopeTypeLabel(node.scopeType)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {node.pageType && node.pageType !== "NONE" ? (
                          <Badge variant="outline" className="text-xs">
                            {PAGE_TYPE_LABELS[node.pageType] || node.pageType}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">{node.sortOrder}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-0.5">
                          <MenuReorderButtons nodeId={node.id} />
                          <MenuEditButton node={flatNode} allNodes={nodesForForm} />
                          <MenuDeleteButton node={flatNode} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
