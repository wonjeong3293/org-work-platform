import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getEvents,
  getEventsByDate,
  getChecklists,
  getMemo,
} from "@/actions/planner-actions";
import { PlannerPageClient } from "@/components/planner/planner-page-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serialize = (obj: any) => JSON.parse(JSON.stringify(obj));

export default async function UserPlannerPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { userId } = await params;
  const sp = await searchParams;
  const selectedDate = sp.date ? new Date(sp.date + "T00:00:00") : new Date();
  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const isAdmin = !!(session.user as Record<string, unknown>)?.isAdmin;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, position: true, department: { select: { name: true } } },
  });

  if (!targetUser) redirect("/planner");

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);

  try {
    const [monthEvents, dailyEvents, dailyChecklists, dailyMemo] = await Promise.all([
      getEvents({ userId, startDate: monthStart, endDate: monthEnd }),
      getEventsByDate(selectedDate, userId),
      getChecklists({ userId, date: selectedDate, includeCompleted: true }),
      getMemo(selectedDate, userId),
    ]);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/planner/team">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">
              {targetUser.name}
              {targetUser.position && (
                <span className="text-muted-foreground font-normal ml-1">
                  {targetUser.position}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {targetUser.department?.name || "부서 미지정"} · 플래너 조회
            </p>
          </div>
        </div>

        <PlannerPageClient
          initialEvents={serialize(monthEvents)}
          dailyEvents={serialize(dailyEvents)}
          dailyChecklists={serialize(dailyChecklists)}
          dailyMemo={dailyMemo ? serialize(dailyMemo) : null}
          selectedDateStr={selectedDateStr}
          isAdmin={isAdmin}
        />
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/planner/team">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{targetUser.name}님의 플래너</h1>
          </div>
        </div>
        <div className="py-12 text-center text-muted-foreground">
          <p>이 사용자의 플래너에 대한 접근 권한이 없습니다.</p>
        </div>
      </div>
    );
  }
}
