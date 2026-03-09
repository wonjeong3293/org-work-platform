"use client";

import { useRouter } from "next/navigation";
import { createProject } from "@/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewProjectPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    try {
      await createProject({
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || undefined,
        startDate: (formData.get("startDate") as string) || undefined,
        endDate: (formData.get("endDate") as string) || undefined,
      });
      toast.success("프로젝트가 생성되었습니다");
      router.push("/projects");
    } catch {
      toast.error("프로젝트 생성에 실패했습니다");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>새 프로젝트</CardTitle>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">프로젝트명</Label>
              <Input id="name" name="name" placeholder="프로젝트 이름" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea id="description" name="description" placeholder="프로젝트 설명 (선택)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">시작일</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">종료일</Label>
                <Input id="endDate" name="endDate" type="date" />
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
