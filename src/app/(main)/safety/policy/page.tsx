import { PolicyArchivePage } from "@/components/safety/policy-archive-page";
import type { PolicyArchivePageConfig } from "@/components/safety/policy-archive-page";

const config: PolicyArchivePageConfig = {
  moduleKey: "safety_policy",
  category: "POLICY",
  title: "안전보건방침",
  description:
    "안전보건방침 문서를 관리합니다. PPT, PDF, DOC 등 다양한 형식을 지원합니다.",
  breadcrumbItems: [
    { label: "홈", href: "/dashboard" },
    { label: "안전", href: "/section/safety" },
    { label: "산업안전", href: "/section/safety/industrial-safety" },
    { label: "안전보건운영", href: "/section/safety/industrial-safety/safety-health-operation" },
    { label: "안전보건방침" },
  ],
  pptCardTitle: "방침 PPT (현재 적용본)",
};

export default async function SafetyPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  return <PolicyArchivePage config={config} searchParams={searchParams} />;
}
