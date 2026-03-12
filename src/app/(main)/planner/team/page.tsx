import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTeamEvents } from "@/actions/planner-actions";
import { prisma } from "@/lib/prisma";
import { TeamView } from "@/components/planner/team-view";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

export default async function TeamPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; scope?: string; dept?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const scope = sp.scope || "team";

  // Week calculation
  const baseDate = sp.week ? new Date(sp.week) : new Date();
  const dayOfWeek = baseDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const events = await getTeamEvents({
    startDate: weekStart,
    endDate: weekEnd,
    departmentId: sp.dept,
  });

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  const serializedEvents = events.map((e) => ({
    ...e,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString() || null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {scope === "all" ? "전체 플래너" : "팀 플래너"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {scope === "all" ? "전체 조직원의 일정을 조회합니다." : "팀원의 일정을 조회합니다."}
          </p>
        </div>
        <Link href="/planner">
          <Button variant="outline" size="sm" className="gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            내 플래너
          </Button>
        </Link>
      </div>

      <TeamView
        events={serializedEvents}
        departments={departments}
        weekStart={weekStart.toISOString()}
        weekEnd={weekEnd.toISOString()}
        scope={scope}
      />
    </div>
  );
}
