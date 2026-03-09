"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { updateTaskStatus } from "@/actions/task-actions";
import { TASK_STATUS } from "@/lib/constants";

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  sortOrder: number;
  dueDate: Date | null;
  assignee: { id: string; name: string; profileImage: string | null } | null;
  project: { id: string; name: string } | null;
  _count: { subtasks: number; comments: number };
};

type TasksByStatus = Record<string, Task[]>;

const columns = [
  { id: "TODO", ...TASK_STATUS.TODO },
  { id: "IN_PROGRESS", ...TASK_STATUS.IN_PROGRESS },
  { id: "IN_REVIEW", ...TASK_STATUS.IN_REVIEW },
  { id: "DONE", ...TASK_STATUS.DONE },
];

export function KanbanBoard({ initialTasks }: { initialTasks: TasksByStatus }) {
  const [tasks, setTasks] = useState<TasksByStatus>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const taskId = active.id as string;
    for (const column of Object.values(tasks)) {
      const task = column.find((t) => t.id === taskId);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overColumn = over.id as string;

    // Find which column the task came from
    let sourceColumn = "";
    for (const [status, taskList] of Object.entries(tasks)) {
      if (taskList.find((t) => t.id === taskId)) {
        sourceColumn = status;
        break;
      }
    }

    if (!sourceColumn || !columns.find((c) => c.id === overColumn)) return;
    if (sourceColumn === overColumn) return;

    // Move task to new column
    const task = tasks[sourceColumn].find((t) => t.id === taskId)!;
    const newTasks = { ...tasks };
    newTasks[sourceColumn] = newTasks[sourceColumn].filter((t) => t.id !== taskId);
    const updatedTask = { ...task, status: overColumn };
    newTasks[overColumn] = [...newTasks[overColumn], updatedTask];
    setTasks(newTasks);

    // Persist to server
    const newSortOrder = newTasks[overColumn].length;
    await updateTaskStatus(taskId, overColumn, newSortOrder);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.label}
            tasks={tasks[column.id] || []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
