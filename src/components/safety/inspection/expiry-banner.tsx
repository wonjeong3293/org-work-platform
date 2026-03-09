"use client";

import { AlertOctagon } from "lucide-react";

interface Props {
  expiredCount: number;
}

export function ExpiryBanner({ expiredCount }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <AlertOctagon className="h-5 w-5 shrink-0 text-red-600" />
      <div className="text-sm text-red-800">
        <span className="font-semibold">검사 기한 만료 장비 {expiredCount}건</span>이
        있습니다. 즉시 재검사를 진행해 주세요.
      </div>
    </div>
  );
}
