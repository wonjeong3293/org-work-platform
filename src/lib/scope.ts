export type ScopeType = "GLOBAL_ONLY" | "SITE_ONLY" | "BOTH";

export const SCOPE_TYPE_OPTIONS = [
  { value: "GLOBAL_ONLY", label: "통합 전용" },
  { value: "SITE_ONLY", label: "사업장 전용" },
  { value: "BOTH", label: "통합+사업장" },
] as const;

export function getScopeTypeLabel(scopeType: string): string {
  const found = SCOPE_TYPE_OPTIONS.find((s) => s.value === scopeType);
  return found?.label ?? scopeType;
}

/**
 * 현재 site와 모듈의 scopeType에 따라 입력/업로드 가능 여부를 반환
 */
export function canCreateInScope(site: string, scopeType: ScopeType): boolean {
  switch (scopeType) {
    case "GLOBAL_ONLY":
      return site === "ALL";
    case "SITE_ONLY":
      return site !== "ALL";
    case "BOTH":
      return true;
    default:
      return false;
  }
}

/**
 * scopeType에 따른 입력 불가 안내 메시지
 */
export function getScopeDisabledMessage(site: string, scopeType: ScopeType): string | null {
  if (canCreateInScope(site, scopeType)) return null;
  switch (scopeType) {
    case "GLOBAL_ONLY":
      return "이 모듈은 통합(ALL)에서만 등록할 수 있습니다.";
    case "SITE_ONLY":
      return "통합에서는 등록할 수 없습니다. 사업장을 선택하세요.";
    default:
      return null;
  }
}

/**
 * 현재 site에서 해당 문서를 삭제할 수 있는지 (origin site 기반)
 */
export function canDeleteInScope(currentSite: string, documentSiteCode: string): boolean {
  return currentSite === documentSiteCode;
}
