"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  eventType: string;
  status: string;
  startDate: string;
  endDate: string | null;
}

interface Props {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onCreateEvent?: (date: Date) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  TASK: "bg-blue-500",
  MEETING: "bg-purple-500",
  DEADLINE: "bg-red-500",
  PERSONAL: "bg-green-500",
};

export function CalendarView({ events, selectedDate, onDateSelect, onCreateEvent }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = new Date(event.startDate).toDateString();
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const goToPrev = useCallback(() => setViewDate(new Date(year, month - 1, 1)), [year, month]);
  const goToNext = useCallback(() => setViewDate(new Date(year, month + 1, 1)), [year, month]);
  const goToToday = useCallback(() => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(today);
  }, [onDateSelect]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {year}년 {month + 1}월
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            오늘
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-t border-l">
        {calendarDays.map(({ date, isCurrentMonth }, idx) => {
          const dayEvents = eventsByDate.get(date.toDateString()) || [];
          const isSelected = isSameDay(date, selectedDate);
          const today = isToday(date);
          const isSunday = date.getDay() === 0;
          const isSaturday = date.getDay() === 6;

          return (
            <button
              key={idx}
              onClick={() => onDateSelect(date)}
              className={cn(
                "relative min-h-[80px] border-r border-b p-1 text-left transition-colors hover:bg-muted/50",
                !isCurrentMonth && "bg-muted/20",
                isSelected && "bg-primary/5 ring-1 ring-primary ring-inset",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  today && "bg-primary text-primary-foreground font-bold",
                  !today && !isCurrentMonth && "text-muted-foreground/50",
                  !today && isCurrentMonth && isSunday && "text-red-500",
                  !today && isCurrentMonth && isSaturday && "text-blue-500",
                )}
              >
                {date.getDate()}
              </span>

              {/* Event dots */}
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className={cn(
                      "truncate rounded px-1 text-[10px] leading-4 text-white",
                      EVENT_TYPE_COLORS[ev.eventType] || "bg-blue-500",
                      ev.status === "DONE" && "opacity-50 line-through",
                    )}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>

              {/* Quick add on hover */}
              {onCreateEvent && isCurrentMonth && (
                <div
                  className="absolute right-1 top-1 hidden group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateEvent(date);
                  }}
                >
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(EVENT_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={cn("h-2.5 w-2.5 rounded-sm", color)} />
            <span>{{ TASK: "업무", MEETING: "회의", DEADLINE: "마감", PERSONAL: "개인" }[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
