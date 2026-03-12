"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarView } from "./calendar-view";
import { DailyDetail } from "./daily-detail";
import { MemoEditor } from "./memo-editor";
import { EventCreateDialog } from "./event-create-dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, Building2 } from "lucide-react";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  initialEvents: any[];
  dailyEvents: any[];
  dailyChecklists: any[];
  dailyMemo: any | null;
  selectedDateStr: string;
  isAdmin: boolean;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function PlannerPageClient({
  initialEvents,
  dailyEvents,
  dailyChecklists,
  dailyMemo,
  selectedDateStr,
  isAdmin,
}: Props) {
  const router = useRouter();
  const selectedDate = new Date(selectedDateStr + "T00:00:00");

  const handleDateSelect = useCallback(
    (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      router.push(`/planner?date=${dateStr}`);
      router.refresh();
    },
    [router],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">워크 플래너</h1>
          <p className="text-sm text-muted-foreground">개인 일정, 할 일, 메모를 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <EventCreateDialog defaultDate={selectedDate} />
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Link href="/planner">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                내 플래너
              </Button>
            </Link>
            <Link href="/planner/team">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Users className="h-3.5 w-3.5" />
                팀 뷰
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/planner/team?scope=all">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  전체 뷰
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <CalendarView
            events={initialEvents}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {/* Daily sidebar */}
        <div className="space-y-4">
          <DailyDetail
            dateStr={selectedDateStr}
            events={dailyEvents}
            checklists={dailyChecklists}
          />
          <MemoEditor dateStr={selectedDateStr} memo={dailyMemo} />
        </div>
      </div>
    </div>
  );
}
