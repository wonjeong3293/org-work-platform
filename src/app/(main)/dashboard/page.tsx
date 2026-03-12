import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMenuTree } from "@/actions/menu-actions";
import Link from "next/link";
import {
  Wrench,
  Leaf,
  ShieldCheck,
  Globe,
  CheckSquare,
  Clock,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SECTION_CARDS = [
  {
    key: "prod",
    domain: "PRODUCTION",
    title: "생산기술",
    description: "생산기술 관련 업무를 관리합니다",
    icon: Wrench,
    gradient: "from-blue-500 to-blue-700",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    key: "env",
    domain: "ENV",
    title: "환경",
    description: "환경 관련 업무를 관리합니다",
    icon: Leaf,
    gradient: "from-emerald-500 to-emerald-700",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "safety",
    domain: "SAFETY",
    title: "안전",
    description: "안전 관련 업무를 관리합니다",
    icon: ShieldCheck,
    gradient: "from-orange-500 to-orange-700",
    iconBg: "bg-orange-100 text-orange-700",
  },
  {
    key: "common",
    domain: "COMMON",
    title: "공통",
    description: "공통 업무 및 관리 기능",
    icon: Globe,
    gradient: "from-violet-500 to-violet-700",
    iconBg: "bg-violet-100 text-violet-700",
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const menuTree = await getMenuTree();

  const [todoCount, inProgressCount, pendingApprovals, recentEvents] =
    await Promise.all([
      prisma.plannerEvent.count({
        where: { userId: userId!, status: "TODO" },
      }),
      prisma.plannerEvent.count({
        where: { userId: userId!, status: "IN_PROGRESS" },
      }),
      prisma.approvalStep.count({
        where: {
          approverId: userId,
          status: "PENDING",
          request: { status: { in: ["PENDING", "IN_PROGRESS"] } },
        },
      }),
      prisma.plannerEvent.findMany({
        where: { userId: userId! },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

  // Count menu items per section
  const sectionCounts: Record<string, number> = {};
  for (const node of menuTree) {
    const count = countLeafNodes(node);
    sectionCounts[node.domain] = (sectionCounts[node.domain] || 0) + count;
  }

  const stats = [
    { title: "할 일", value: todoCount, icon: CheckSquare, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "진행 중", value: inProgressCount, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "결재 대기", value: pendingApprovals, icon: FileCheck, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "긴급 업무", value: todoCount + inProgressCount, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          안녕하세요, {session?.user?.name}님
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          생산기술본부 통합 업무 포털입니다.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5">
              <div className={`rounded-xl p-2.5 sm:p-3 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">업무 섹션</h2>
        <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-4">
          {SECTION_CARDS.map((sec) => {
            const count = sectionCounts[sec.domain] || 0;
            return (
              <Link key={sec.key} href={`/section/${sec.key}`}>
                <Card className="group border-0 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${sec.gradient}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`rounded-xl p-3 ${sec.iconBg}`}>
                        <sec.icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {count}개 모듈
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold group-hover:text-primary transition-colors">
                      {sec.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sec.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Events */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">최근 일정</CardTitle>
            <Link href="/planner" className="text-sm text-primary hover:underline">
              플래너 열기 →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              아직 등록된 일정이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(event.startDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      event.status === "DONE"
                        ? "default"
                        : event.status === "IN_PROGRESS"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {event.status === "TODO"
                      ? "할 일"
                      : event.status === "IN_PROGRESS"
                      ? "진행 중"
                      : event.status === "DONE"
                      ? "완료"
                      : "취소"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function countLeafNodes(node: { children: { children: unknown[] }[] }): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce(
    (sum, child) => sum + countLeafNodes(child as typeof node),
    0
  );
}
