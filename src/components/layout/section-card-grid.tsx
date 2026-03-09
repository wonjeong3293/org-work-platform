"use client";

import Link from "next/link";
import {
  Globe,
  Wrench,
  Leaf,
  ShieldCheck,
  Shield,
  Settings,
  Folder,
  Home,
  Factory,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import type { MenuTreeNode } from "@/actions/menu-actions";

const iconMap: Record<string, LucideIcon> = {
  Globe, Wrench, Leaf, ShieldCheck, Shield, Settings, Folder, Home, Factory,
};

const CARD_COLORS = [
  { iconBg: "bg-blue-100 text-blue-700", accent: "from-blue-500 to-blue-600" },
  { iconBg: "bg-emerald-100 text-emerald-700", accent: "from-emerald-500 to-emerald-600" },
  { iconBg: "bg-orange-100 text-orange-700", accent: "from-orange-500 to-orange-600" },
  { iconBg: "bg-violet-100 text-violet-700", accent: "from-violet-500 to-violet-600" },
  { iconBg: "bg-rose-100 text-rose-700", accent: "from-rose-500 to-rose-600" },
  { iconBg: "bg-cyan-100 text-cyan-700", accent: "from-cyan-500 to-cyan-600" },
  { iconBg: "bg-amber-100 text-amber-700", accent: "from-amber-500 to-amber-600" },
  { iconBg: "bg-indigo-100 text-indigo-700", accent: "from-indigo-500 to-indigo-600" },
];

const COLOR_MAP: Record<string, { iconBg: string; accent: string }> = {
  blue: { iconBg: "bg-blue-100 text-blue-700", accent: "from-blue-500 to-blue-600" },
  emerald: { iconBg: "bg-emerald-100 text-emerald-700", accent: "from-emerald-500 to-emerald-600" },
  orange: { iconBg: "bg-orange-100 text-orange-700", accent: "from-orange-500 to-orange-600" },
  violet: { iconBg: "bg-violet-100 text-violet-700", accent: "from-violet-500 to-violet-600" },
  rose: { iconBg: "bg-rose-100 text-rose-700", accent: "from-rose-500 to-rose-600" },
  cyan: { iconBg: "bg-cyan-100 text-cyan-700", accent: "from-cyan-500 to-cyan-600" },
  amber: { iconBg: "bg-amber-100 text-amber-700", accent: "from-amber-500 to-amber-600" },
  indigo: { iconBg: "bg-indigo-100 text-indigo-700", accent: "from-indigo-500 to-indigo-600" },
  red: { iconBg: "bg-red-100 text-red-700", accent: "from-red-500 to-red-600" },
  green: { iconBg: "bg-green-100 text-green-700", accent: "from-green-500 to-green-600" },
  purple: { iconBg: "bg-purple-100 text-purple-700", accent: "from-purple-500 to-purple-600" },
  pink: { iconBg: "bg-pink-100 text-pink-700", accent: "from-pink-500 to-pink-600" },
  teal: { iconBg: "bg-teal-100 text-teal-700", accent: "from-teal-500 to-teal-600" },
  gray: { iconBg: "bg-gray-100 text-gray-700", accent: "from-gray-500 to-gray-600" },
};

function countChildren(node: MenuTreeNode): number {
  if (node.children.length === 0) return 0;
  return node.children.length;
}

function getNodeHref(node: MenuTreeNode, basePath: string): string {
  if (node.moduleKey) return `/modules/${node.moduleKey}`;
  if (node.route) return node.route;
  return `${basePath}/${node.slug}`;
}

export function SectionCardGrid({
  nodes,
  basePath,
  title,
  description,
}: {
  nodes: MenuTreeNode[];
  basePath: string;
  title: string;
  description?: string;
}) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Folder className="h-12 w-12 mb-3 opacity-40" />
        <p>하위 항목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {nodes.map((node, idx) => {
          const color = (node.color && COLOR_MAP[node.color]) || CARD_COLORS[idx % CARD_COLORS.length];
          const Icon = (node.icon ? iconMap[node.icon] : null) || Folder;
          const href = getNodeHref(node, basePath);
          const childCount = countChildren(node);

          return (
            <Link key={node.id} href={href}>
              <Card className="group border-0 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden h-full">
                <div className={`h-1.5 bg-gradient-to-r ${color.accent}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl p-2.5 ${color.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {childCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {childCount}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-3 font-semibold group-hover:text-primary transition-colors flex items-center gap-1">
                    {node.title}
                    <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  {node.children.length > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
                      {node.children.map((c) => c.title).join(" · ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
