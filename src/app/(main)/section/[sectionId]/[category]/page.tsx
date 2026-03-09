import { getMenuTree } from "@/actions/menu-actions";
import { SectionCardGrid } from "@/components/layout/section-card-grid";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { notFound } from "next/navigation";
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ sectionId: string; category: string }>;
}) {
  const { sectionId, category } = await params;
  const section = SECTION_MAP[sectionId];
  if (!section) notFound();

  const menuTree = await getMenuTree();
  const allSectionNodes = menuTree.filter((n) => n.domain === section.domain);

  // Look for the category node in this section's tree
  let categoryNode: MenuTreeNode | null = null;
  for (const root of allSectionNodes) {
    categoryNode = findNodeBySlug([root, ...root.children], category);
    if (categoryNode) break;
  }
  if (!categoryNode) notFound();

  const breadcrumbItems = [
    { label: "홈", href: "/dashboard" },
    { label: section.title, href: `/section/${sectionId}` },
    { label: categoryNode.title },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbItems} />
      <SectionCardGrid
        nodes={categoryNode.children}
        basePath={`/section/${sectionId}/${category}`}
        title={categoryNode.title}
      />
    </div>
  );
}
