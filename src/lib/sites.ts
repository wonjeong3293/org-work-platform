// Static fallback sites (used in client components)
export const SITES = [
  { code: "ALL", label: "통합" },
  { code: "HS", label: "화성" },
  { code: "PT", label: "평택" },
] as const;

export type SiteCode = string;

export function getSiteLabel(code: string): string {
  const found = SITES.find((s) => s.code === code);
  return found?.label ?? code;
}

export function getYearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= 2020; y--) {
    years.push(y);
  }
  return years;
}
