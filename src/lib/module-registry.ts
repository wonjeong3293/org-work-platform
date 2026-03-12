/**
 * 모듈 레지스트리
 *
 * module_key → 실제 라우트 매핑.
 * 새 기능 모듈을 개발하면 여기에 등록하고,
 * 관리자 화면에서 메뉴의 module_key를 지정하면 자동 연결된다.
 */

export interface ModuleDefinition {
  /** 모듈이 연결되는 실제 Next.js 라우트 */
  route: string;
  /** 모듈 표시 이름 (선택) */
  label?: string;
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  // 안전
  safety_policy: { route: "/safety/policy", label: "안전보건방침" },
  safety_goals: { route: "/safety/goals", label: "안전보건목표" },
  safety_inspection: { route: "/safety/inspection", label: "안전검사" },

  // 생산기술 - 설비관리
  equipment_master: { route: "/production/equipment-master", label: "설비 마스터" },
  maintenance_dashboard: { route: "/production/maintenance-dashboard", label: "유지보수 현황" },

  // 공통
  dashboard: { route: "/dashboard", label: "대시보드" },
  projects: { route: "/projects", label: "프로젝트" },
  planner: { route: "/planner", label: "워크플래너" },
  approvals: { route: "/approvals", label: "결재" },
  organization: { route: "/organization", label: "조직" },
};

/** module_key로 라우트를 조회. 없으면 null 반환 */
export function getModuleRoute(moduleKey: string): string | null {
  return MODULE_REGISTRY[moduleKey]?.route ?? null;
}

/** 등록된 모든 모듈 키 목록 */
export function getAvailableModuleKeys(): { key: string; label: string }[] {
  return Object.entries(MODULE_REGISTRY).map(([key, def]) => ({
    key,
    label: def.label ?? key,
  }));
}
