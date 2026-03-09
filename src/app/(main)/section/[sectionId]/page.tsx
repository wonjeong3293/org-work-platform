import { getMenuTree } from "@/actions/menu-actions";
import { SectionCardGrid } from "@/components/layout/section-card-grid";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { notFound } from "next/navigation";

const SECTION_MAP: Record<string, { domain: string; title: string; description: string }> = {
  common: { domain: "COMMON", title: "공통", description: "공통 업무 및 관리 기능" },
  prod: { domain: "PRODUCTION", title: "생산기술", description: "생산기술 관련 업무를 관리합니다" },
  env: { domain: "ENV", title: "환경", description: "환경 관련 업무를 관리합니다" },
  safety: { domain: "SAFETY", title: "안전", description: "안전 관련 업무를 관리합니다" },
};

export default async function SectionPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const section = SECTION_MAP[sectionId];
  if (!section) notFound();

  const menuTree = await getMenuTree();

  // Find top-level nodes matching this domain
  const sectionNodes = menuTree.filter((n) => n.domain === section.domain);

  // If only one top-level node, show its children directly
  const displayNodes =
    sectionNodes.length === 1 && sectionNodes[0].children.length > 0
      ? sectionNodes[0].children
      : sectionNodes;

  const breadcrumbItems = [
    { label: "홈", href: "/dashboard" },
    { label: section.title },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbItems} />
      <SectionCardGrid
        nodes={displayNodes}
        basePath={`/section/${sectionId}`}
        title={section.title}
        description={section.description}
      />
    </div>
  );
}
