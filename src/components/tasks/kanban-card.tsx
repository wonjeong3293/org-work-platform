"use client";

import { useDraggable } from "@dnd-kit/core";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: Date | null;
  assignee: { id: string; name: string; profileImage: string | null } | null;
  project: { id: string; name: string } | null;
  _count: { subtasks: number; comments: number };
};

export function KanbanCard({
  task,
  isOverlay = false,
}: {
  task: Task;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  const priority = TASK_PRIORITY[task.priority as keyof typeof TASK_PRIORITY];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
        isOverlay && "rotate-3 shadow-lg"
      )}
    >
      <Link href={`/tasks/${task.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">{task.title}</p>
            <Badge className={cn("shrink-0 text-xs", priority?.color)} variant="secondary">
              {priority?.label}
            </Badge>
          </div>

          {task.project && (
            <p className="text-xs text-muted-foreground">{task.project.name}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(task.dueDate, "MM/dd")}
                </span>
              )}
              {task._count.comments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {task._count.comments}
                </span>
              )}
            </div>
            {task.assignee && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.profileImage || undefined} />
                <AvatarFallback className="text-[10px]">
                  {task.assignee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
