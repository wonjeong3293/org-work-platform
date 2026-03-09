"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import type { SafetyInspectionListItem } from "@/actions/safety-inspection-actions";
import { buildExpiryTimeline } from "@/lib/safety-inspection-utils";

interface Props {
  items: SafetyInspectionListItem[];
}

export function ExpiryTimeline({ items }: Props) {
  const timeline = buildExpiryTimeline(
    items.map((i) => ({ expiryDate: i.expiryDate })),
    12,
  );
  const maxCount = Math.max(...timeline.map((t) => t.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          검사 만료 타임라인
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-32">
          {timeline.map((entry) => {
            const heightPercent = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
            const isCurrentMonth =
              entry.year === new Date().getFullYear() &&
              entry.month === new Date().getMonth() + 1;

            return (
              <div
                key={entry.label}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {entry.count > 0 ? entry.count : ""}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${
                    isCurrentMonth
                      ? "bg-blue-500"
                      : entry.count > 0
                        ? "bg-blue-300"
                        : "bg-gray-100"
                  }`}
                  style={{
                    height: `${Math.max(heightPercent, entry.count > 0 ? 8 : 4)}%`,
                    minHeight: entry.count > 0 ? "8px" : "4px",
                  }}
                />
                <span
                  className={`text-[10px] ${
                    isCurrentMonth
                      ? "font-bold text-blue-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {entry.month}월
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
