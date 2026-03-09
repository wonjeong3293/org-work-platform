"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./kanban-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

export function KanbanColumn({
  id,
  title,
  tasks,
}: {
  id: string;
  title: string;
  tasks: Task[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div className="flex w-64 sm:w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-lg border-2 border-dashed p-2 transition-colors",
          isOver ? "border-primary/50 bg-primary/5" : "border-transparent"
        )}
      >
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            업무 없음
          </p>
        )}
      </div>
    </div>
  );
}
