import { getTasks } from "@/actions/task-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Calendar } from "lucide-react";
import Link from "next/link";
import { TASK_STATUS, TASK_PRIORITY } from "@/lib/constants";
import { format } from "date-fns";

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">업무 목록</h1>
          <p className="text-sm text-muted-foreground">전체 업무를 확인합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/tasks/board">칸반 보드</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              새 업무
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        {tasks.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">
            아직 등록된 업무가 없습니다.
          </p>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => {
              const status = TASK_STATUS[task.status as keyof typeof TASK_STATUS];
              const priority = TASK_PRIORITY[task.priority as keyof typeof TASK_PRIORITY];
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <p className="font-medium truncate">{task.title}</p>
                      {task.labels.map(({ label }) => (
                        <span
                          key={label.id}
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{ backgroundColor: label.color + "20", color: label.color }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                      <span>{task.project?.name || "프로젝트 없음"}</span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(task.dueDate, "MM/dd")}
                        </span>
                      )}
                      <span>댓글 {task._count.comments}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Badge className={priority?.color} variant="secondary">
                      {priority?.label}
                    </Badge>
                    <Badge variant={task.status === "DONE" ? "default" : "outline"}>
                      {status?.label}
                    </Badge>
                    {task.assignee ? (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={task.assignee.profileImage || undefined} />
                        <AvatarFallback className="text-xs">
                          {task.assignee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-7 w-7 rounded-full border-2 border-dashed border-gray-300" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
