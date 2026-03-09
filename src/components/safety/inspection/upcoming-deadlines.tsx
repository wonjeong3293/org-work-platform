"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { SafetyInspectionListItem } from "@/actions/safety-inspection-actions";
import { getInspectionStatus, formatDDay, formatDate } from "@/lib/safety-inspection-utils";

interface Props {
  items: SafetyInspectionListItem[];
}

export function UpcomingDeadlines({ items }: Props) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            다가오는 마감
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">등록된 장비가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          다가오는 마감
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const info = getInspectionStatus(item.expiryDate);
          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.equipmentTypeName}</span>
                  <span className="text-sm text-muted-foreground">{item.code}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.location} · 만료: {formatDate(item.expiryDate)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={info.badgeVariant}>
                  {formatDDay(info.dDay)}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
