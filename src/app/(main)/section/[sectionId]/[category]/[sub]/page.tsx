import { getMenuTree } from "@/actions/menu-actions";
import { SectionCardGrid } from "@/components/layout/section-card-grid";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { notFound, redirect } from "next/navigation";
import { getModuleRoute } from "@/lib/module-registry";
import type { MenuTreeNode } from "@/actions/menu-actions";

const SECTION_MAP: Record<string, { domain: string; title: string }> = {
  common: { domain: "COMMON", title: "공통" },
  prod: { domain: "PRODUCTION", title: "생산기술" },
  env: { domain: "ENV", title: "환경" },
  safety: { domain: "SAFETY", title: "안전" },
};

function findNodeBySlug(nodes: MenuTreeNode[], slug: string): MenuTreeNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = findNodeBySlug(node.children, slug);
    if (found) return found;
  }
  return null;
}

export default async function SubPage({
  params,
}: {
  params: Promise<{ sectionId: string; category: string; sub: string }>;
}) {
  const { sectionId, category, sub } = await params;
  const section = SECTION_MAP[sectionId];
  if (!section) notFound();

  const menuTree = await getMenuTree();
  const allSectionNodes = menuTree.filter((n) => n.domain === section.domain);

  // Find the sub node
  let subNode: MenuTreeNode | null = null;
  for (const root of allSectionNodes) {
    subNode = findNodeBySlug([root], sub);
    if (!subNode) subNode = findNodeBySlug(root.children, sub);
    if (subNode) break;
  }
  if (!subNode) notFound();

  // If the node has a module or route, redirect there
  if (subNode.moduleKey) {
    const route = getModuleRoute(subNode.moduleKey);
    if (route) redirect(route);
    redirect(`/modules/${subNode.moduleKey}`);
  }
  if (subNode.route) {
    redirect(subNode.route);
  }

  // If it has no children and no route, show "준비중"
  if (subNode.children.length === 0) {
    redirect(`/modules/_not_found`);
  }

  // Find category node for breadcrumb
  let categoryNode: MenuTreeNode | null = null;
  for (const root of allSectionNodes) {
    categoryNode = findNodeBySlug([root, ...root.children], category);
    if (categoryNode) break;
  }

  const breadcrumbItems = [
    { label: "홈", href: "/dashboard" },
    { label: section.title, href: `/section/${sectionId}` },
    ...(categoryNode ? [{ label: categoryNode.title, href: `/section/${sectionId}/${category}` }] : []),
    { label: subNode.title },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbItems} />
      <SectionCardGrid
        nodes={subNode.children}
        basePath={`/section/${sectionId}/${category}/${sub}`}
        title={subNode.title}
      />
    </div>
  );
}
