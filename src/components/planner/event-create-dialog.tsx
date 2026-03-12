"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { createEvent } from "@/actions/planner-actions";
import { PLANNER_EVENT_TYPE, PLANNER_PRIORITY } from "@/lib/constants";

interface Props {
  defaultDate?: Date;
  trigger?: React.ReactNode;
}

export function EventCreateDialog({ defaultDate, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("TASK");
  const [priority, setPriority] = useState("MEDIUM");
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(
    () => (defaultDate || new Date()).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        priority,
        allDay,
        startDate,
        endDate: endDate || undefined,
      });
      setOpen(false);
      resetForm();
    });
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventType("TASK");
    setPriority("MEDIUM");
    setAllDay(true);
    setEndDate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            일정 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>새 일정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>유형</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PLANNER_EVENT_TYPE).map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>우선순위</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PLANNER_PRIORITY).map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">종료일 (선택)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="allDay"
              checked={allDay}
              onCheckedChange={(v) => setAllDay(v === true)}
            />
            <Label htmlFor="allDay" className="text-sm font-normal">
              종일 일정
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">설명 (선택)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="상세 설명..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "저장 중..." : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
