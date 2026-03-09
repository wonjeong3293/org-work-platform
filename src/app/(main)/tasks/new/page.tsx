"use client";

import { useRouter } from "next/navigation";
import { createTask } from "@/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewTaskPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    try {
      await createTask({
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        priority: (formData.get("priority") as string) || "MEDIUM",
        dueDate: (formData.get("dueDate") as string) || undefined,
      });
      toast.success("업무가 생성되었습니다");
      router.push("/tasks");
    } catch {
      toast.error("업무 생성에 실패했습니다");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>새 업무</CardTitle>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">업무명</Label>
              <Input id="title" name="title" placeholder="업무 제목" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea id="description" name="description" placeholder="업무 설명 (선택)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">우선순위</Label>
                <Select name="priority" defaultValue="MEDIUM">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">낮음</SelectItem>
                    <SelectItem value="MEDIUM">보통</SelectItem>
                    <SelectItem value="HIGH">높음</SelectItem>
                    <SelectItem value="URGENT">긴급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">마감일</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
              <Button type="submit">생성</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
