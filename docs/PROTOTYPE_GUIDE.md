# 조직 업무 플랫폼 - 프로토타입 개발 가이드

> 이 파일을 프로토타입 프로젝트의 `CLAUDE.md`로 사용하세요.
> Claude Code가 자동으로 참고하여 메인 시스템과 호환되는 코드를 생성합니다.

---

## 1. 기술 스택 (반드시 동일하게 사용)

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.x |
| 언어 | TypeScript | 5.x |
| UI 컴포넌트 | shadcn/ui (Radix UI 기반) | 최신 |
| 스타일링 | Tailwind CSS | 4.x |
| 아이콘 | Lucide React | 0.576+ |
| DB ORM | Prisma | 6.x |
| 인증 | NextAuth.js (Credentials + JWT) | 5.0-beta |
| 폼 | React Hook Form + Zod | RHF 7.x, Zod 4.x |
| 알림 (Toast) | Sonner | 2.x |
| 테이블 | TanStack React Table | 8.x |
| 차트 | Recharts | 3.x |
| 리치텍스트 | Tiptap | 3.x |
| 드래그앤드롭 | @dnd-kit | 6.x |
| 엑셀 | xlsx | 0.18.x |
| PDF | jsPDF + jsPDF-autotable | 4.x, 5.x |
| 날짜 | date-fns | 4.x |

---

## 2. 프로젝트 구조

```
src/
├── app/(main)/           # 메인 레이아웃 하위 페이지 (사이드바+헤더 포함)
│   └── [feature]/        # 기능별 폴더
│       ├── page.tsx      # 메인 페이지 (서버 컴포넌트)
│       └── [id]/
│           └── page.tsx  # 상세 페이지
├── actions/              # 서버 액션 (비즈니스 로직)
│   └── [feature]-actions.ts
├── components/
│   ├── ui/               # shadcn/ui 공통 컴포넌트 (수정 금지)
│   └── [feature]/        # 기능별 클라이언트 컴포넌트
├── lib/
│   ├── constants.ts      # 상수, Enum, 상태 정의
│   ├── module-registry.ts # 모듈 라우트 매핑
│   ├── filter-context.tsx # 전역 사업장/연도 필터
│   ├── prisma.ts         # Prisma 클라이언트 싱글톤
│   ├── auth.ts           # NextAuth 인스턴스
│   ├── sites.ts          # 사업장 코드 정의
│   └── utils.ts          # cn() 유틸리티
└── types/                # TypeScript 타입 정의
```

---

## 3. 핵심 패턴

### 3-1. 페이지 (서버 컴포넌트)

```tsx
// src/app/(main)/[feature]/page.tsx
import { getItems } from "@/actions/feature-actions";
import { FeatureList } from "@/components/feature/feature-list";

export default async function FeaturePage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const items = await getItems(sp.site, sp.year ? Number(sp.year) : undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">기능 이름</h1>
      </div>
      <FeatureList items={items} />
    </div>
  );
}
```

**규칙:**
- 페이지는 기본적으로 `async` 서버 컴포넌트
- `searchParams`와 `params`는 `Promise`로 받아서 `await` (Next.js 16 패턴)
- 데이터는 서버에서 fetch → 클라이언트 컴포넌트에 props로 전달

### 3-2. 서버 액션

```tsx
// src/actions/feature-actions.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 조회
export async function getItems(site?: string, year?: number) {
  const where: Record<string, unknown> = {};
  if (site && site !== "ALL") where.siteCode = site;
  if (year) where.year = year;

  return prisma.item.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// 생성
export async function createItem(data: { title: string; siteCode: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("인증이 필요합니다");

  const item = await prisma.item.create({
    data: {
      ...data,
      createdById: session.user.id,
    },
  });

  revalidatePath("/feature");
  return item;
}

// 수정
export async function updateItem(id: string, data: { title: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("인증이 필요합니다");

  const updated = await prisma.item.update({
    where: { id },
    data,
  });

  revalidatePath("/feature");
  return updated;
}

// 삭제
export async function deleteItem(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("인증이 필요합니다");

  await prisma.item.delete({ where: { id } });
  revalidatePath("/feature");
}
```

**규칙:**
- 파일 최상단에 반드시 `"use server"` 선언
- 변경 작업은 항상 `auth()` 인증 체크
- 변경 후 `revalidatePath()`로 캐시 갱신
- 에러 메시지는 한국어

### 3-3. 클라이언트 컴포넌트

```tsx
// src/components/feature/feature-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createItem } from "@/actions/feature-actions";

export function FeatureForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createItem({
        title: formData.get("title") as string,
        siteCode: formData.get("siteCode") as string,
      });
      toast.success("등록되었습니다");
      router.push("/feature");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 항목 등록</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

**규칙:**
- 파일 최상단에 `"use client"` 선언
- 알림은 반드시 `toast` (sonner) 사용 — `alert()` 금지
- `router.push()` 또는 `router.refresh()`로 이동/갱신

### 3-4. 테이블 컴포넌트

```tsx
"use client";

import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  title: string;
  status: string;
}

export function FeatureTable({ items }: { items: Item[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                데이터가 없습니다
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">상세</Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 3-5. 다이얼로그 (모달)

```tsx
"use client";

import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function CreateDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />추가</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 항목</DialogTitle>
        </DialogHeader>
        {/* 폼 내용 */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. 전역 필터 (사업장/연도)

시스템은 헤더에서 **사업장(site)**과 **연도(year)**를 선택할 수 있는 전역 필터를 제공합니다.

```tsx
// 클라이언트 컴포넌트에서 사용
"use client";
import { useGlobalFilter } from "@/lib/filter-context";

export function MyComponent() {
  const { site, year } = useGlobalFilter();
  // site: "ALL" | "HS" | "PT" | ...
  // year: 2026 (현재 연도)
}
```

```tsx
// 서버 컴포넌트 페이지에서는 searchParams로 접근
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const site = sp.site || "ALL";
  const year = sp.year ? Number(sp.year) : new Date().getFullYear();
}
```

**사업장 코드:**
- `ALL`: 통합 (전체)
- `HS`: 화성
- `PT`: 평택

---

## 5. 상수 정의 패턴

상태, 유형 등은 `src/lib/constants.ts`에 정의합니다. 하드코딩 금지.

```tsx
// 정의 패턴
export const FEATURE_STATUS = {
  ACTIVE: { value: "ACTIVE", label: "활성", color: "bg-green-100 text-green-700" },
  INACTIVE: { value: "INACTIVE", label: "비활성", color: "bg-gray-100 text-gray-700" },
} as const;

// 사용
import { FEATURE_STATUS } from "@/lib/constants";

<Badge className={FEATURE_STATUS.ACTIVE.color}>
  {FEATURE_STATUS.ACTIVE.label}
</Badge>
```

**기존 상수:**
- `PLANNER_EVENT_TYPE`: TASK, MEETING, DEADLINE, PERSONAL
- `PLANNER_STATUS`: TODO, IN_PROGRESS, DONE, CANCELLED
- `PLANNER_PRIORITY`: LOW, MEDIUM, HIGH, URGENT
- `PROJECT_STATUS`: ACTIVE, COMPLETED, ARCHIVED, ON_HOLD
- `APPROVAL_STATUS`: DRAFT, PENDING, IN_PROGRESS, APPROVED, REJECTED, WITHDRAWN
- `DOC_APPROVAL_TYPE`: FILE, FORM, TABLE
- `POSITIONS`: 사원~사장 직급 배열

---

## 6. Prisma 모델 컨벤션

```prisma
model Feature {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      String   @default("ACTIVE")
  siteCode    String?                        // 사업장 필터용
  year        Int?                           // 연도 필터용

  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**규칙:**
- ID는 `cuid()` 사용
- 날짜는 `createdAt` + `updatedAt` 패턴
- Enum은 DB에 String으로 저장, constants.ts에서 관리
- 사업장/연도 필터가 필요하면 `siteCode`, `year` 필드 추가
- 작성자 추적은 `createdById` → `User` 관계

---

## 7. UI 컴포넌트 사용법

### 사용 가능한 shadcn/ui 컴포넌트

| 컴포넌트 | import 경로 |
|----------|-------------|
| Button | `@/components/ui/button` |
| Input | `@/components/ui/input` |
| Textarea | `@/components/ui/textarea` |
| Label | `@/components/ui/label` |
| Select | `@/components/ui/select` |
| Checkbox | `@/components/ui/checkbox` |
| Switch | `@/components/ui/switch` |
| Card | `@/components/ui/card` |
| Table | `@/components/ui/table` |
| Dialog | `@/components/ui/dialog` |
| Drawer | `@/components/ui/drawer` |
| AlertDialog | `@/components/ui/alert-dialog` |
| Tabs | `@/components/ui/tabs` |
| Badge | `@/components/ui/badge` |
| Avatar | `@/components/ui/avatar` |
| Tooltip | `@/components/ui/tooltip` |
| DropdownMenu | `@/components/ui/dropdown-menu` |
| Command | `@/components/ui/command` |
| Popover | `@/components/ui/popover` |
| ScrollArea | `@/components/ui/scroll-area` |
| Sheet | `@/components/ui/sheet` |

### cn() 유틸리티

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "px-4 py-2 rounded-lg",
  isActive && "bg-primary text-primary-foreground",
  disabled && "opacity-50 cursor-not-allowed"
)} />
```

### Button variants

```tsx
<Button variant="default">기본</Button>
<Button variant="secondary">보조</Button>
<Button variant="outline">아웃라인</Button>
<Button variant="ghost">고스트</Button>
<Button variant="destructive">삭제</Button>
<Button size="sm">작은</Button>
<Button size="icon"><Plus className="h-4 w-4" /></Button>
```

---

## 8. 인증 패턴

```tsx
// 서버 액션에서
import { auth } from "@/lib/auth";

const session = await auth();
if (!session?.user?.id) throw new Error("인증이 필요합니다");

// session.user 구조:
// {
//   id: string
//   email: string
//   name: string
//   position?: string
//   isAdmin: boolean
//   department?: { id: string; name: string }
//   role?: { id: string; name: string; displayName: string }
// }
```

---

## 9. 파일 업로드 패턴

```tsx
// API 라우트: src/app/(main)/api/upload/route.ts
// 업로드 디렉토리: /uploads/[feature]/
// 파일명: timestamp-originalname

import { useDropzone } from "react-dropzone";

const { getRootProps, getInputProps } = useDropzone({
  accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg"] },
  maxSize: 10 * 1024 * 1024, // 10MB
  onDrop: (files) => handleUpload(files),
});
```

---

## 10. 테마 색상

```
Primary:    #1e3a5f (진한 네이비)
Background: #F6F8FB (밝은 회색-파랑)
Card:       #ffffff
Sidebar:    #0F1B2D (다크 네이비)
Header:     #0B1526 (더 진한 네이비)

상태 색상 패턴:
- 성공/활성:  bg-green-100 text-green-700
- 진행중:     bg-blue-100 text-blue-700
- 경고/높음:  bg-orange-100 text-orange-700
- 위험/긴급:  bg-red-100 text-red-700
- 기본/낮음:  bg-gray-100 text-gray-700
```

---

## 11. 반응형 패턴

```tsx
// 그리드
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// 레이아웃
<div className="flex flex-col sm:flex-row gap-4">

// 패딩
<div className="p-3 sm:p-4 md:p-6">

// 숨김/표시
<span className="hidden sm:inline">긴 텍스트</span>
<span className="sm:hidden">짧은</span>
```

---

## 12. 모듈 등록

새 기능은 `src/lib/module-registry.ts`에 등록합니다:

```tsx
export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  // ... 기존 모듈
  my_feature: { route: "/my-feature", label: "내 기능" },
};
```

---

## 13. 체크리스트

### 프로토타입 개발 시 필수 확인

- [ ] shadcn/ui 컴포넌트만 사용 (커스텀 UI 컴포넌트 새로 만들지 않기)
- [ ] 서버 액션 패턴 준수 (`"use server"`, auth 체크, revalidatePath)
- [ ] 클라이언트 컴포넌트에 `"use client"` 선언
- [ ] 알림은 `toast` (sonner) 사용 — `alert()` 절대 금지
- [ ] 상태/유형 값은 constants.ts 패턴으로 정의
- [ ] 에러 메시지는 한국어
- [ ] 사업장/연도 필터가 필요하면 searchParams 또는 useGlobalFilter 사용
- [ ] Prisma 모델 ID는 cuid(), createdAt/updatedAt 포함
- [ ] import 경로는 `@/` 절대경로 사용

### 하지 말 것

- 새로운 UI 라이브러리 추가 (MUI, Ant Design 등)
- `alert()`, `confirm()`, `prompt()` 사용
- 상태값 하드코딩 (매직 스트링)
- `console.log` 남기기
- 클라이언트에서 직접 DB 접근
- `fetch`로 API 호출 대신 서버 액션 사용
- `any` 타입 사용
