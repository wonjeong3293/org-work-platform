"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Calendar,
  Edit3,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  createChecklist,
  deleteChecklist,
  toggleChecklist,
} from "@/actions/planner-actions";
import { PLANNER_EVENT_TYPE, PLANNER_STATUS, PLANNER_PRIORITY } from "@/lib/constants";

interface SerializedEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  status: string;
  priority: string;
  color: string | null;
  allDay: boolean;
  startDate: string;
  endDate: string | null;
  sortOrder: number;
  userId: string;
  checklists: SerializedChecklist[];
}

interface SerializedChecklist {
  id: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  dueDate: string | null;
  userId: string;
  eventId: string | null;
}

interface Props {
  dateStr: string;
  events: SerializedEvent[];
  checklists: SerializedChecklist[];
  readOnly?: boolean;
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export function DailyDetail({ dateStr, events, checklists, readOnly }: Props) {
  const [isPending, startTransition] = useTransition();
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newCheckTitle, setNewCheckTitle] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleCreateEvent = () => {
    if (!newEventTitle.trim()) return;
    startTransition(async () => {
      await createEvent({
        title: newEventTitle.trim(),
        startDate: dateStr,
        allDay: true,
      });
      setNewEventTitle("");
    });
  };

  const handleCreateChecklist = () => {
    if (!newCheckTitle.trim()) return;
    startTransition(async () => {
      await createChecklist({
        title: newCheckTitle.trim(),
        dueDate: dateStr,
      });
      setNewCheckTitle("");
    });
  };

  const handleToggleCheck = (id: string) => {
    startTransition(async () => {
      await toggleChecklist(id);
    });
  };

  const handleDeleteEvent = (id: string) => {
    startTransition(async () => {
      await deleteEvent(id);
    });
  };

  const handleDeleteChecklist = (id: string) => {
    startTransition(async () => {
      await deleteChecklist(id);
    });
  };

  const handleUpdateEventStatus = (id: string, status: string) => {
    startTransition(async () => {
      await updateEvent(id, { status });
    });
  };

  const handleStartEdit = (event: SerializedEvent) => {
    setEditingEventId(event.id);
    setEditTitle(event.title);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    startTransition(async () => {
      await updateEvent(id, { title: editTitle.trim() });
      setEditingEventId(null);
    });
  };

  const completedCount = checklists.filter((c) => c.isCompleted).length;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">{formatDateLabel(dateStr)}</h3>

      {/* Events */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              일정
              <Badge variant="secondary" className="text-xs">
                {events.length}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className={cn(
                "flex items-center gap-2 rounded-md border p-2 text-sm",
                event.status === "DONE" && "opacity-60",
              )}
            >
              {!readOnly && (
                <Select
                  value={event.status}
                  onValueChange={(v) => handleUpdateEventStatus(event.id, v)}
                >
                  <SelectTrigger className="h-6 w-6 border-0 p-0 [&>svg]:hidden">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full border-2",
                        event.status === "DONE"
                          ? "bg-green-500 border-green-500"
                          : event.status === "IN_PROGRESS"
                            ? "border-blue-500"
                            : "border-gray-300",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PLANNER_STATUS).map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex-1 min-w-0">
                {editingEventId === event.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-6 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(event.id);
                        if (e.key === "Escape") setEditingEventId(null);
                      }}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSaveEdit(event.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingEventId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      "truncate block",
                      event.status === "DONE" && "line-through text-muted-foreground",
                    )}
                  >
                    {event.title}
                  </span>
                )}
              </div>

              <Badge variant="outline" className={cn("text-[10px] shrink-0", PRIORITY_COLORS[event.priority])}>
                {PLANNER_PRIORITY[event.priority as keyof typeof PLANNER_PRIORITY]?.label || event.priority}
              </Badge>

              <Badge variant="outline" className="text-[10px] shrink-0">
                {PLANNER_EVENT_TYPE[event.eventType as keyof typeof PLANNER_EVENT_TYPE]?.label || event.eventType}
              </Badge>

              {!readOnly && editingEventId !== event.id && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleStartEdit(event)}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {!readOnly && (
            <div className="flex gap-2">
              <Input
                placeholder="새 일정 추가..."
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateEvent()}
                className="h-8 text-sm"
                disabled={isPending}
              />
              <Button size="sm" className="h-8 shrink-0" onClick={handleCreateEvent} disabled={isPending || !newEventTitle.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklists */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4" />
              체크리스트
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{checklists.length}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {checklists.map((item) => (
            <div key={item.id} className="flex items-center gap-2 group">
              {!readOnly && (
                <Checkbox
                  checked={item.isCompleted}
                  onCheckedChange={() => handleToggleCheck(item.id)}
                  disabled={isPending}
                />
              )}
              <span
                className={cn(
                  "flex-1 text-sm",
                  item.isCompleted && "line-through text-muted-foreground",
                )}
              >
                {item.title}
              </span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => handleDeleteChecklist(item.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {!readOnly && (
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="새 체크리스트 추가..."
                value={newCheckTitle}
                onChange={(e) => setNewCheckTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateChecklist()}
                className="h-8 text-sm"
                disabled={isPending}
              />
              <Button size="sm" className="h-8 shrink-0" onClick={handleCreateChecklist} disabled={isPending || !newCheckTitle.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
