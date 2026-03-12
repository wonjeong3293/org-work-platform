import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getEvents,
  getEventsByDate,
  getChecklists,
  getMemo,
} from "@/actions/planner-actions";
import { PlannerPageClient } from "@/components/planner/planner-page-client";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const selectedDate = sp.date ? new Date(sp.date + "T00:00:00") : new Date();
  const y = selectedDate.getFullYear();
  const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const d = String(selectedDate.getDate()).padStart(2, "0");
  const selectedDateStr = `${y}-${m}-${d}`;
  const isAdmin = !!(session.user as Record<string, unknown>)?.isAdmin;

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);

  const [monthEvents, dailyEvents, dailyChecklists, dailyMemo] = await Promise.all([
    getEvents({ startDate: monthStart, endDate: monthEnd }),
    getEventsByDate(selectedDate),
    getChecklists({ date: selectedDate, includeCompleted: true }),
    getMemo(selectedDate),
  ]);

  // Serialize Date objects for client component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj));

  return (
    <PlannerPageClient
      initialEvents={serialize(monthEvents)}
      dailyEvents={serialize(dailyEvents)}
      dailyChecklists={serialize(dailyChecklists)}
      dailyMemo={dailyMemo ? serialize(dailyMemo) : null}
      selectedDateStr={selectedDateStr}
      isAdmin={isAdmin}
    />
  );
}
