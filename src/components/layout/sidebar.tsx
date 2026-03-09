"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Globe,
  Wrench,
  Leaf,
  ShieldCheck,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRightIcon,
  Folder,
  Home,
  Factory,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { MenuTreeNode } from "@/actions/menu-actions";

const iconMap: Record<string, LucideIcon> = {
  Globe,
  Wrench,
  Leaf,
  ShieldCheck,
  Shield,
  Settings,
  Folder,
  Home,
  Factory,
};

function getIcon(name: string | null): LucideIcon | undefined {
  if (!name) return undefined;
  return iconMap[name];
}

const DOMAIN_SECTION_MAP: Record<string, string> = {
  COMMON: "common",
  PRODUCTION: "prod",
  ENV: "env",
  SAFETY: "safety",
};

const bottomItems = [
  { title: "관리자", href: "/admin", icon: Shield },
  { title: "설정", href: "/settings", icon: Settings },
];

function isNodeActive(node: MenuTreeNode, pathname: string): boolean {
  const href = getNodeHref(node);
  if (href && (pathname === href || pathname.startsWith(href + "/"))) {
    return true;
  }
  if (node.route && (pathname === node.route || pathname.startsWith(node.route + "/"))) {
    return true;
  }
  return node.children.some((child) => isNodeActive(child, pathname));
}

function getNodeHref(node: MenuTreeNode): string | null {
  if (node.moduleKey) return `/modules/${node.moduleKey}`;
  if (node.route) return node.route;
  return null;
}

/**
 * Sidebar nav tree - only shows top-level sections and their direct children (max depth=2).
 * Deeper navigation is done via card UI in the main content.
 */
function NavItem({
  node,
  pathname,
  collapsed,
  depth,
}: {
  node: MenuTreeNode;
  pathname: string;
  collapsed: boolean;
  depth: number;
}) {
  const isActive = isNodeActive(node, pathname);
  const Icon = getIcon(node.icon) || Folder;
  const hasChildren = node.children.length > 0;
  const href = getNodeHref(node);
  const [expanded, setExpanded] = useState(isActive);

  // Top-level (depth 0): clicking navigates to section page for card-based drill-down
  const sectionSlug = DOMAIN_SECTION_MAP[node.domain] || "common";

  if (collapsed) {
    return (
      <li>
        <Link
          href={href || `/section/${sectionSlug}`}
          className={cn(
            "flex items-center justify-center rounded-lg p-2.5 transition-colors",
            isActive
              ? "bg-nav-active text-white"
              : "text-nav-fg hover:bg-nav-hover hover:text-white"
          )}
          title={node.title}
        >
          <Icon className="h-5 w-5" />
        </Link>
      </li>
    );
  }

  // Depth 0: top-level section - title navigates, chevron toggles expand
  if (depth === 0) {
    const sectionHref = href || `/section/${sectionSlug}`;
    return (
      <li>
        <div
          className={cn(
            "flex w-full items-center rounded-lg text-sm transition-colors",
            isActive
              ? "bg-nav-hover text-white font-medium"
              : "text-nav-fg hover:bg-nav-hover hover:text-white"
          )}
        >
          <Link
            href={sectionHref}
            className="flex flex-1 items-center gap-3 px-3 py-2 min-w-0"
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1 text-left truncate">{node.title}</span>
          </Link>
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="shrink-0 p-1.5 mr-1 rounded hover:bg-white/10"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
          )}
        </div>
        {hasChildren && expanded && (
          <ul className="mt-0.5 space-y-0.5 ml-4 border-l border-white/10 pl-3">
            {node.children.map((child) => (
              <NavItem
                key={child.id}
                node={child}
                pathname={pathname}
                collapsed={false}
                depth={1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // Depth 1: show as clickable leaf. Clicking navigates to section card page for deeper drill-down.
  // If it has a direct route/module, link there; otherwise link to section card page
  const parentDomain = node.domain;
  const parentSlug = DOMAIN_SECTION_MAP[parentDomain] || "common";
  const leafHref = href || `/section/${parentSlug}/${node.slug}`;
  const isLeafActive = href
    ? pathname === href || pathname.startsWith(href + "/")
    : pathname === leafHref || pathname.startsWith(leafHref + "/");

  return (
    <li>
      <Link
        href={leafHref}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
          isLeafActive
            ? "text-white font-medium bg-nav-active/50"
            : "text-nav-fg hover:text-white hover:bg-nav-hover"
        )}
      >
        <span className="truncate">{node.title}</span>
      </Link>
    </li>
  );
}

export function Sidebar({ menuTree }: { menuTree: MenuTreeNode[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen flex-col bg-nav-bg transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand + Toggle */}
      <div className="flex h-14 items-center px-3 border-b border-white/10 gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-nav-active">
            <Factory className="h-4.5 w-4.5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-white truncate">
              생산기술본부
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-nav-fg hover:text-white hover:bg-nav-hover"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {menuTree.map((node) => (
            <NavItem
              key={node.id}
              node={node}
              pathname={pathname}
              collapsed={collapsed}
              depth={0}
            />
          ))}
        </ul>
      </nav>

      {/* Bottom items */}
      <div className="border-t border-white/10 p-2">
        <ul className="space-y-1">
          {bottomItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-nav-active text-white font-medium"
                      : "text-nav-fg hover:bg-nav-hover hover:text-white"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

export function MobileSidebar({ menuTree }: { menuTree: MenuTreeNode[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-8 w-8 text-header-fg hover:bg-nav-hover"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-72 p-0 bg-nav-bg border-none"
        >
          <SheetTitle className="sr-only">메뉴</SheetTitle>
          {/* Brand */}
          <div className="flex h-14 items-center px-3 border-b border-white/10 gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
              onClick={() => setOpen(false)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-nav-active">
                <Factory className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white truncate">
                생산기술본부
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {menuTree.map((node) => (
                <MobileNavItem
                  key={node.id}
                  node={node}
                  pathname={pathname}
                  depth={0}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          </nav>

          {/* Bottom items */}
          <div className="border-t border-white/10 p-2">
            <ul className="space-y-1">
              {bottomItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-nav-active text-white font-medium"
                          : "text-nav-fg hover:bg-nav-hover hover:text-white"
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MobileNavItem({
  node,
  pathname,
  depth,
  onNavigate,
}: {
  node: MenuTreeNode;
  pathname: string;
  depth: number;
  onNavigate: () => void;
}) {
  const isActive = isNodeActive(node, pathname);
  const Icon = getIcon(node.icon) || Folder;
  const hasChildren = node.children.length > 0;
  const href = getNodeHref(node);
  const [expanded, setExpanded] = useState(isActive);

  const sectionSlug = DOMAIN_SECTION_MAP[node.domain] || "common";

  if (depth === 0) {
    const sectionHref = href || `/section/${sectionSlug}`;
    return (
      <li>
        <div
          className={cn(
            "flex w-full items-center rounded-lg text-sm transition-colors",
            isActive
              ? "bg-nav-hover text-white font-medium"
              : "text-nav-fg hover:bg-nav-hover hover:text-white"
          )}
        >
          <Link
            href={sectionHref}
            onClick={onNavigate}
            className="flex flex-1 items-center gap-3 px-3 py-2 min-w-0"
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1 text-left truncate">{node.title}</span>
          </Link>
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="shrink-0 p-1.5 mr-1 rounded hover:bg-white/10"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
          )}
        </div>
        {hasChildren && expanded && (
          <ul className="mt-0.5 space-y-0.5 ml-4 border-l border-white/10 pl-3">
            {node.children.map((child) => (
              <MobileNavItem
                key={child.id}
                node={child}
                pathname={pathname}
                depth={1}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const parentDomain = node.domain;
  const parentSlug = DOMAIN_SECTION_MAP[parentDomain] || "common";
  const leafHref = href || `/section/${parentSlug}/${node.slug}`;
  const isLeafActive = href
    ? pathname === href || pathname.startsWith(href + "/")
    : pathname === leafHref || pathname.startsWith(leafHref + "/");

  return (
    <li>
      <Link
        href={leafHref}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
          isLeafActive
            ? "text-white font-medium bg-nav-active/50"
            : "text-nav-fg hover:text-white hover:bg-nav-hover"
        )}
      >
        <span className="truncate">{node.title}</span>
      </Link>
    </li>
  );
}
