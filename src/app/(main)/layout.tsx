import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { FilterProvider } from "@/lib/filter-context";
import { getMenuTree } from "@/actions/menu-actions";
import { getActiveSites } from "@/actions/site-actions";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuTree, dbSites] = await Promise.all([
    getMenuTree(),
    getActiveSites().catch(() => []),
  ]);

  // Build site options: "통합" + DB sites
  const siteOptions = [
    { code: "ALL", label: "통합" },
    ...dbSites.map((s) => ({ code: s.code, label: s.name })),
  ];

  return (
    <Suspense>
      <FilterProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar menuTree={menuTree} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header menuTree={menuTree} siteOptions={siteOptions} />
            <main className="flex-1 overflow-y-auto bg-background p-3 sm:p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </FilterProvider>
    </Suspense>
  );
}
