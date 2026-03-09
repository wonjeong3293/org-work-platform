"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, AlertOctagon, Clock, CheckCircle } from "lucide-react";

interface Props {
  counts: {
    total: number;
    expired: number;
    urgent: number;
    warning: number;
    normal: number;
  };
}

export function StatusCards({ counts }: Props) {
  const cards = [
    {
      label: "전체 장비",
      value: counts.total,
      icon: ShieldCheck,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "기한 만료",
      value: counts.expired,
      icon: AlertOctagon,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      label: "긴급 (30일)",
      value: counts.urgent,
      icon: AlertTriangle,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      label: "주의 (90일)",
      value: counts.warning,
      icon: Clock,
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "정상",
      value: counts.normal,
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
