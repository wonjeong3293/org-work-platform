"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";


import Link from "next/link";

interface TeamEvent {
  id: string;
  title: string;
  eventType: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string | null;
  user: {
    id: string;
    name: string;
    position: string | null;
    department: { name: string } | null;
  };
}

interface Department {
  id: string;
  name: string;
}

interface Props {
  events: TeamEvent[];
  departments: Department[];
  weekStart: string;
  weekEnd: string;
  scope: string;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

const EVENT_TYPE_COLORS: Record<string, string> = {
  TASK: "bg-blue-100 text-blue-800 border-blue-200",
  MEETING: "bg-purple-100 text-purple-800 border-purple-200",
  DEADLINE: "bg-red-100 text-red-800 border-red-200",
  PERSONAL: "bg-green-100 text-green-800 border-green-200",
};

export function TeamView({ events, departments, weekStart, weekEnd, scope }: Props) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Generate week days
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const s = new Date(weekStart);
    const e = new Date(weekEnd);
    const current = new Date(s);
    while (current <= e) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [weekStart, weekEnd]);

  // Group events by user
  const userEvents = useMemo(() => {
    const map = new Map<string, { user: TeamEvent["user"]; events: TeamEvent[] }>();

    const filtered = events.filter((ev) => {
      if (deptFilter !== "all" && ev.user.department?.name !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return ev.user.name.toLowerCase().includes(q) || ev.title.toLowerCase().includes(q);
      }
      return true;
    });

    for (const ev of filtered) {
      const existing = map.get(ev.user.id);
      if (existing) {
        existing.events.push(ev);
      } else {
        map.set(ev.user.id, { user: ev.user, events: [ev] });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const deptA = a.user.department?.name || "";
      const deptB = b.user.department?.name || "";
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      return a.user.name.localeCompare(b.user.name);
    });
  }, [events, search, deptFilter]);

  function getEventsForDay(userEvts: TeamEvent[], day: Date) {
    return userEvts.filter((ev) => {
      const evStart = new Date(ev.startDate);
      evStart.setHours(0, 0, 0, 0);
      const evEnd = ev.endDate ? new Date(ev.endDate) : evStart;
      evEnd.setHours(23, 59, 59, 999);
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      return dayStart >= evStart && dayStart <= evEnd;
    });
  }

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const formatDateParam = (d: Date) => d.toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름 또는 일정 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="부서" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 부서</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Week navigation */}
        <div className="flex items-center gap-1 ml-auto">
          <Link href={`/planner/team?week=${formatDateParam(prevWeek)}&scope=${scope}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {new Date(weekStart).getMonth() + 1}/{new Date(weekStart).getDate()} - {new Date(weekEnd).getMonth() + 1}/{new Date(weekEnd).getDate()}
          </span>
          <Link href={`/planner/team?week=${formatDateParam(nextWeek)}&scope=${scope}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Team grid */}
      {userEvents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>표시할 일정이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground min-w-[120px]">
                  이름
                </th>
                {weekDays.map((day, i) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSunday = day.getDay() === 0;
                  const isSaturday = day.getDay() === 6;
                  return (
                    <th
                      key={i}
                      className={cn(
                        "text-center p-2 font-medium min-w-[100px]",
                        isToday && "bg-primary/5",
                        isSunday && "text-red-500",
                        isSaturday && "text-blue-500",
                      )}
                    >
                      <div>{WEEKDAYS[i]}</div>
                      <div className={cn("text-xs", isToday ? "font-bold" : "text-muted-foreground")}>
                        {day.getMonth() + 1}/{day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {userEvents.map(({ user, events: userEvts }) => (
                <tr key={user.id} className="border-b hover:bg-muted/30">
                  <td className="p-2">
                    <Link href={`/planner/user/${user.id}`} className="hover:underline">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.department?.name}
                        {user.position && ` · ${user.position}`}
                      </div>
                    </Link>
                  </td>
                  {weekDays.map((day, i) => {
                    const dayEvts = getEventsForDay(userEvts, day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <td
                        key={i}
                        className={cn(
                          "p-1 align-top",
                          isToday && "bg-primary/5",
                        )}
                      >
                        <div className="space-y-0.5">
                          {dayEvts.slice(0, 3).map((ev) => (
                            <div
                              key={ev.id}
                              className={cn(
                                "truncate rounded px-1 py-0.5 text-[10px] leading-tight border",
                                EVENT_TYPE_COLORS[ev.eventType] || "bg-gray-100",
                                ev.status === "DONE" && "opacity-50 line-through",
                              )}
                              title={ev.title}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvts.length > 3 && (
                            <span className="text-[10px] text-muted-foreground pl-1">
                              +{dayEvts.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
