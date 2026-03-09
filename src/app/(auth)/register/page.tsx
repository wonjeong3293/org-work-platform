"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    undefined
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
        <CardDescription>새 계정을 만들어 시작하세요</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              name="name"
              placeholder="홍길동"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="8자 이상 입력하세요"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employeeNumber">사번 (선택)</Label>
            <Input
              id="employeeNumber"
              name="employeeNumber"
              placeholder="EMP006"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "가입 중..." : "회원가입"}
          </Button>
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
