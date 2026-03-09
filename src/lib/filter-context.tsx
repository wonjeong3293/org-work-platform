"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { SiteCode } from "./sites";

interface FilterContextValue {
  site: SiteCode;
  year: number;
  setSite: (site: SiteCode) => void;
  setYear: (year: number) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const DEFAULT_SITE: SiteCode = "ALL";
const DEFAULT_YEAR = new Date().getFullYear();

export function FilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const site = (searchParams.get("site") as SiteCode) || DEFAULT_SITE;
  const year = Number(searchParams.get("year")) || DEFAULT_YEAR;

  const buildUrl = useCallback(
    (newSite: SiteCode, newYear: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSite === DEFAULT_SITE) {
        params.delete("site");
      } else {
        params.set("site", newSite);
      }
      if (newYear === DEFAULT_YEAR) {
        params.delete("year");
      } else {
        params.set("year", String(newYear));
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams]
  );

  const setSite = useCallback(
    (newSite: SiteCode) => {
      router.push(buildUrl(newSite, year));
    },
    [router, buildUrl, year]
  );

  const setYear = useCallback(
    (newYear: number) => {
      router.push(buildUrl(site, newYear));
    },
    [router, buildUrl, site]
  );

  return (
    <FilterContext.Provider value={{ site, year, setSite, setYear }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useGlobalFilter() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useGlobalFilter must be used within FilterProvider");
  return ctx;
}
