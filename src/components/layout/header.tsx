"use client";

import { useSession } from "next-auth/react";
import { logoutAction } from "@/actions/auth-actions";
import { Bell, Search, LogOut, User, X } from "lucide-react";
import { MobileSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useGlobalFilter } from "@/lib/filter-context";
import { getYearOptions, type SiteCode } from "@/lib/sites";
import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MenuTreeNode } from "@/actions/menu-actions";

function flattenMenuTree(nodes: MenuTreeNode[]): MenuTreeNode[] {
  const result: MenuTreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0) {
      result.push(...flattenMenuTree(node.children));
    }
  }
  return result;
}

export function Header({
  menuTree,
  siteOptions,
}: {
  menuTree?: MenuTreeNode[];
  siteOptions?: { code: string; label: string }[];
}) {
  const { data: session } = useSession();
  const user = session?.user;
  const { site, year, setSite, setYear } = useGlobalFilter();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MenuTreeNode[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name.split("").slice(0, 2).join("")
    : "?";

  const yearOptions = getYearOptions();

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim() || !menuTree) {
        setSearchResults([]);
        setShowSearch(false);
        return;
      }
      const flat = flattenMenuTree(menuTree);
      const results = flat.filter((n) =>
        n.title.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results.slice(0, 8));
      setShowSearch(true);
    },
    [menuTree]
  );

  const getNodeHref = (node: MenuTreeNode): string => {
    if (node.moduleKey) return `/modules/${node.moduleKey}`;
    if (node.route) return node.route;
    return `/modules/_not_found`;
  };

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="flex h-14 items-center border-b bg-header-bg px-2 sm:px-4 gap-2 sm:gap-4">
      {/* Mobile menu button */}
      {menuTree && <MobileSidebar menuTree={menuTree} />}

      {/* Global Filters */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Select value={site} onValueChange={(v) => setSite(v as SiteCode)}>
          <SelectTrigger className="h-8 w-[80px] sm:w-[100px] border-white/20 bg-nav-hover text-header-fg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(siteOptions ?? [{ code: "ALL", label: "통합" }]).map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => setYear(Number(v))}
        >
          <SelectTrigger className="h-8 w-[76px] sm:w-[90px] border-white/20 bg-nav-hover text-header-fg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search - desktop */}
      <div className="relative hidden md:block flex-1 max-w-md" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="메뉴 검색..."
          className="h-8 pl-9 border-white/20 bg-nav-hover text-header-fg placeholder:text-white/40 text-xs"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchQuery && setShowSearch(true)}
          onBlur={() => setTimeout(() => setShowSearch(false), 200)}
        />
        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 py-1">
            {searchResults.map((node) => (
              <button
                key={node.id}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                onMouseDown={(e) => {
                  e.preventDefault();
                  router.push(getNodeHref(node));
                  setShowSearch(false);
                  setSearchQuery("");
                }}
              >
                <span className="text-xs text-gray-400 mr-2">{node.domain}</span>
                {node.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer for mobile */}
      <div className="flex-1 md:hidden" />

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
        {/* Mobile search toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-header-fg hover:bg-nav-hover"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
        >
          {mobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-header-fg hover:bg-nav-hover"
          asChild
        >
          <Link href="/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 text-header-fg hover:bg-nav-hover"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback className="text-[10px] bg-nav-active text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium sm:block text-header-fg">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>내 계정</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                프로필 설정
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute top-14 left-0 right-0 bg-header-bg border-b p-2 z-40 md:hidden">
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="메뉴 검색..."
              className="h-9 pl-9 border-white/20 bg-nav-hover text-header-fg placeholder:text-white/40 text-sm"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              autoFocus
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 py-1">
                {searchResults.map((node) => (
                  <button
                    key={node.id}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      router.push(getNodeHref(node));
                      setShowSearch(false);
                      setSearchQuery("");
                      setMobileSearchOpen(false);
                    }}
                  >
                    <span className="text-xs text-gray-400 mr-2">{node.domain}</span>
                    {node.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
