import { getTaskById, addTaskComment, updateTask, deleteTask } from "@/actions/task-actions";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS, TASK_PRIORITY } from "@/lib/constants";
import { format } from "date-fns";
import { Calendar, User, FolderKanban, Trash2 } from "lucide-react";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const task = await getTaskById(taskId);
  if (!task) notFound();

  const status = TASK_STATUS[task.status as keyof typeof TASK_STATUS];
  const priority = TASK_PRIORITY[task.priority as keyof typeof TASK_PRIORITY];

  async function handleUpdateStatus(formData: FormData) {
    "use server";
    await updateTask(taskId, { status: formData.get("status") as string });
  }

  async function handleAddComment(formData: FormData) {
    "use server";
    const content = formData.get("content") as string;
    if (content.trim()) {
      await addTaskComment(taskId, content);
    }
  }

  async function handleDelete() {
    "use server";
    await deleteTask(taskId);
    redirect("/tasks");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant={task.status === "DONE" ? "default" : "outline"}>
              {status?.label}
            </Badge>
            <Badge className={priority?.color} variant="secondary">
              {priority?.label}
            </Badge>
          </div>
        </div>
        <form action={handleDelete}>
          <Button variant="ghost" size="icon" type="submit" className="text-red-500 hover:text-red-600">
            <Trash2 className="h-5 w-5" />
          </Button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">설명</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{task.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                댓글 ({task.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.profileImage || undefined} />
                    <AvatarFallback className="text-xs">
                      {comment.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.author.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(comment.createdAt, "yyyy-MM-dd HH:mm")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}

              <form action={handleAddComment} className="flex gap-2">
                <Textarea
                  name="content"
                  placeholder="댓글을 입력하세요..."
                  className="min-h-[60px]"
                  required
                />
                <Button type="submit" size="sm">
                  등록
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <form action={handleUpdateStatus}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">상태</label>
                  <div className="flex gap-2">
                    <Select name="status" defaultValue={task.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">할 일</SelectItem>
                        <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
                        <SelectItem value="IN_REVIEW">검토 중</SelectItem>
                        <SelectItem value="DONE">완료</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" size="sm">변경</Button>
                  </div>
                </div>
              </form>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">담당자:</span>
                  <span>{task.assignee?.name || "미배정"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">프로젝트:</span>
                  <span>{task.project?.name || "없음"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">마감일:</span>
                  <span>{task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : "없음"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">작성자:</span>
                  <span>{task.creator.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {task.subtasks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">하위 업무</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 text-sm">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        sub.status === "DONE" ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <span className={sub.status === "DONE" ? "line-through text-muted-foreground" : ""}>
                      {sub.title}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
