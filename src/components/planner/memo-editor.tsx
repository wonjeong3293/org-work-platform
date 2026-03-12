"use client";

import { useState, useTransition, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StickyNote, Save, Pin, PinOff } from "lucide-react";
import { upsertMemo } from "@/actions/planner-actions";

interface SerializedMemo {
  id: string;
  title: string | null;
  content: string;
  date: string;
  isPinned: boolean;
  userId: string;
}

interface Props {
  dateStr: string;
  memo: SerializedMemo | null;
  readOnly?: boolean;
}

export function MemoEditor({ dateStr, memo, readOnly }: Props) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(memo?.title || "");
  const [content, setContent] = useState(memo?.content || "");
  const [isPinned, setIsPinned] = useState(memo?.isPinned || false);
  const hasChanges = title !== (memo?.title || "") || content !== (memo?.content || "") || isPinned !== (memo?.isPinned || false);

  const handleSave = useCallback(() => {
    startTransition(async () => {
      await upsertMemo({
        date: dateStr,
        title: title || undefined,
        content,
        isPinned,
      });
    });
  }, [dateStr, title, content, isPinned]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            메모 / 일지
          </CardTitle>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? "고정 해제" : "고정"}
              >
                {isPinned ? (
                  <Pin className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              <Button
                size="sm"
                className="h-7"
                onClick={handleSave}
                disabled={isPending || !hasChanges}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                저장
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!readOnly ? (
          <>
            <Input
              placeholder="제목 (선택)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm font-medium"
              disabled={isPending}
            />
            <Textarea
              placeholder="오늘의 메모를 작성하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] text-sm resize-none"
              disabled={isPending}
            />
          </>
        ) : (
          <div className="space-y-2">
            {memo?.title && (
              <p className="font-medium text-sm">{memo.title}</p>
            )}
            {memo?.content ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {memo.content}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">작성된 메모가 없습니다.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
