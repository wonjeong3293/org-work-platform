import { getTasksByStatus } from "@/actions/task-actions";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { Button } from "@/components/ui/button";
import { Plus, List } from "lucide-react";
import Link from "next/link";

export default async function TaskBoardPage() {
  const tasksByStatus = await getTasksByStatus();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">칸반 보드</h1>
          <p className="text-sm text-muted-foreground">드래그 앤 드롭으로 업무 상태를 변경합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/tasks">
              <List className="mr-2 h-4 w-4" />
              목록 보기
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              새 업무
            </Link>
          </Button>
        </div>
      </div>

      <KanbanBoard initialTasks={tasksByStatus} />
    </div>
  );
}
