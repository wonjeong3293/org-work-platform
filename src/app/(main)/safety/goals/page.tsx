import { PolicyArchivePage } from "@/components/safety/policy-archive-page";
import type { PolicyArchivePageConfig } from "@/components/safety/policy-archive-page";

const config: PolicyArchivePageConfig = {
  moduleKey: "safety_goals",
  category: "GOALS",
  title: "안전보건목표",
  description:
    "안전보건목표 문서를 관리합니다. PPT, PDF, DOC 등 다양한 형식을 지원합니다.",
  breadcrumbItems: [
    { label: "홈", href: "/dashboard" },
    { label: "안전", href: "/section/safety" },
    { label: "산업안전", href: "/section/safety/industrial-safety" },
    { label: "안전보건운영", href: "/section/safety/industrial-safety/safety-health-operation" },
    { label: "안전보건목표" },
  ],
  pptCardTitle: "목표 PPT (현재 적용본)",
};

export default async function SafetyGoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  return <PolicyArchivePage config={config} searchParams={searchParams} />;
}
