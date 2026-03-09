"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createApproval, getApprovalTemplates } from "@/actions/approval-actions";
import { searchUsers } from "@/actions/user-actions";
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
import { Badge } from "@/components/ui/badge";
import { X, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type Template = { id: string; name: string; category: string; description: string | null };
type Approver = { userId: string; name: string; position: string | null; type: string };
type SearchResult = { id: string; name: string; email: string; position: string | null; department: { name: string } | null };

export default function NewApprovalPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    getApprovalTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 1) {
      searchUsers(searchQuery).then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  function addApprover(user: SearchResult) {
    if (approvers.find((a) => a.userId === user.id)) return;
    setApprovers([
      ...approvers,
      { userId: user.id, name: user.name, position: user.position, type: "APPROVE" },
    ]);
    setSearchQuery("");
    setShowSearch(false);
  }

  function removeApprover(userId: string) {
    setApprovers(approvers.filter((a) => a.userId !== userId));
  }

  function updateApproverType(userId: string, type: string) {
    setApprovers(
      approvers.map((a) => (a.userId === userId ? { ...a, type } : a))
    );
  }

  async function handleSubmit(formData: FormData) {
    if (approvers.length === 0) {
      toast.error("결재선을 지정해주세요");
      return;
    }

    try {
      await createApproval({
        title: formData.get("title") as string,
        content: formData.get("content") as string,
        templateId: selectedTemplate || undefined,
        urgency: formData.get("urgency") as string,
        approvers: approvers.map((a) => ({ userId: a.userId, type: a.type })),
      });
      toast.success("결재가 상신되었습니다");
      router.push("/approvals/sent");
    } catch {
      toast.error("결재 상신에 실패했습니다");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">새 결재</h1>

      <form action={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">문서 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>양식</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="양식 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      [{t.category}] {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" name="title" placeholder="결재 제목" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="결재 내용을 입력하세요"
                className="min-h-[200px]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>긴급도</Label>
              <Select name="urgency" defaultValue="NORMAL">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">일반</SelectItem>
                  <SelectItem value="URGENT">긴급</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">결재선</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvers.map((approver, idx) => (
              <div key={approver.userId} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{approver.name}</p>
                  <p className="text-xs text-muted-foreground">{approver.position || ""}</p>
                </div>
                <Select
                  value={approver.type}
                  onValueChange={(val) => updateApproverType(approver.userId, val)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVE">승인</SelectItem>
                    <SelectItem value="REVIEW">검토</SelectItem>
                    <SelectItem value="NOTIFY">통보</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeApprover(approver.userId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="결재자 검색 (이름 또는 이메일)"
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearch(true);
                    }}
                    onFocus={() => setShowSearch(true)}
                  />
                </div>
              </div>
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                      onClick={() => addApprover(user)}
                    >
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground">{user.position}</span>
                      <span className="text-muted-foreground">{user.department?.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit">상신</Button>
        </div>
      </form>
    </div>
  );
}
