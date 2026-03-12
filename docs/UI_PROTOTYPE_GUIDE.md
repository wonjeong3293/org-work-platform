# 조직 업무 플랫폼 - UI 프로토타입 개발 가이드

> 이 가이드는 UI(화면)만 개발하기 위한 가이드입니다.
> 서버 로직, DB, 인증 등은 메인 시스템 담당자가 구현합니다.

---

## 1. 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| 언어 | TypeScript |
| UI 컴포넌트 | shadcn/ui (Radix UI 기반) |
| 스타일링 | Tailwind CSS 4 |
| 아이콘 | Lucide React |
| 알림 (Toast) | Sonner |
| 차트 | Recharts |
| 리치텍스트 | Tiptap |
| 날짜 | date-fns |

---

## 2. 화면에서 사용할 UI 컴포넌트

shadcn/ui 컴포넌트만 사용합니다. 다른 UI 라이브러리(MUI, Ant Design 등)는 사용하지 마세요.

### 자주 쓰는 컴포넌트

```tsx
// 버튼
import { Button } from "@/components/ui/button";
<Button variant="default">기본</Button>
<Button variant="outline">아웃라인</Button>
<Button variant="ghost">고스트</Button>
<Button variant="destructive">삭제</Button>
<Button size="sm">작은 버튼</Button>
<Button size="icon"><Plus className="h-4 w-4" /></Button>

// 입력
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

// 선택
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 카드
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// 테이블
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// 배지
import { Badge } from "@/components/ui/badge";

// 다이얼로그 (모달)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// 탭
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 드롭다운 메뉴
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// 아이콘 (Lucide)
import { Plus, Search, Edit, Trash2, Download, Upload, Filter, MoreHorizontal, ChevronRight, Calendar, FileText, Users } from "lucide-react";
```

---

## 3. 페이지 레이아웃 패턴

### 목록 페이지

```tsx
export default function FeatureListPage() {
  // 실제 데이터는 나중에 서버에서 가져옴. 지금은 더미 데이터 사용.
  const items = DUMMY_DATA;

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">기능 이름</h1>
        <Button><Plus className="mr-2 h-4 w-4" />등록</Button>
      </div>

      {/* 필터/검색 영역 */}
      <div className="flex items-center gap-2">
        <Input placeholder="검색..." className="max-w-sm" />
        <Select>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="active">활성</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
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
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell><Badge variant="secondary">{item.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">상세</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### 대시보드 페이지

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">현황 대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체</CardDescription>
            <CardTitle className="text-3xl">128</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>진행 중</CardDescription>
            <CardTitle className="text-3xl text-blue-600">42</CardTitle>
          </CardHeader>
        </Card>
        {/* ... */}
      </div>

      {/* 차트 영역 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Recharts 차트 */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 등록/수정 폼

```tsx
export default function FeatureFormPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">항목 등록</h1>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" placeholder="제목을 입력하세요" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">구분</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">구분A</SelectItem>
                  <SelectItem value="B">구분B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea id="content" rows={5} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline">취소</Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 4. 더미 데이터 패턴

서버 로직 없이 UI만 만들 때는 더미 데이터를 사용하세요.

```tsx
// 파일 상단이나 별도 파일에 더미 데이터 정의
const DUMMY_DATA = [
  {
    id: "1",
    title: "2026년 1분기 법정교육",
    category: "법정교육",
    status: "진행 중",
    date: "2026-03-15",
    manager: "김철수",
  },
  {
    id: "2",
    title: "신입사원 안전교육",
    category: "자체교육",
    status: "완료",
    date: "2026-03-10",
    manager: "이영희",
  },
  // ...
];
```

---

## 5. 상태 색상 규칙

| 의미 | 색상 클래스 |
|------|-------------|
| 활성/완료/성공 | `bg-green-100 text-green-700` |
| 진행중/정보 | `bg-blue-100 text-blue-700` |
| 대기/보통 | `bg-yellow-100 text-yellow-700` |
| 경고/높음 | `bg-orange-100 text-orange-700` |
| 위험/긴급/반려 | `bg-red-100 text-red-700` |
| 기본/비활성 | `bg-gray-100 text-gray-700` |

```tsx
// 사용 예시
<Badge className="bg-blue-100 text-blue-700">진행 중</Badge>
<Badge className="bg-green-100 text-green-700">완료</Badge>
<Badge className="bg-red-100 text-red-700">긴급</Badge>
```

---

## 6. 반응형 규칙

```tsx
// 그리드: 모바일 1열 → 태블릿 2열 → 데스크톱 3~4열
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// 가로 배치: 모바일은 세로, 태블릿부터 가로
<div className="flex flex-col sm:flex-row gap-4">

// 여백: 화면 크기별 패딩
<div className="p-3 sm:p-4 md:p-6">
```

---

## 7. 테마 색상

```
메인 색상:  #1e3a5f (진한 네이비) → primary
배경 색상:  #F6F8FB (밝은 회색) → background
카드 배경:  #ffffff → card
```

Tailwind 클래스로 사용:
```tsx
<div className="bg-primary text-primary-foreground">메인 컬러</div>
<div className="bg-muted text-muted-foreground">보조 텍스트</div>
<div className="bg-card border rounded-lg">카드</div>
<div className="text-destructive">경고 텍스트</div>
```

---

## 8. 알림 (Toast)

`alert()` 대신 반드시 `toast`를 사용하세요.

```tsx
import { toast } from "sonner";

toast.success("저장되었습니다");
toast.error("오류가 발생했습니다");
toast.info("알림 메시지");
```

---

## 9. 완성 후 전달할 것

1. **주요 화면 캡쳐** — 각 페이지 스크린샷
2. **코드를 MD 파일로 정리** — 아래 형식:

```markdown
## 목록 페이지
\`\`\`tsx
// src/app/(main)/feature/page.tsx
코드 내용...
\`\`\`

## 등록 다이얼로그
\`\`\`tsx
// src/components/feature/create-dialog.tsx
코드 내용...
\`\`\`
```

3. **데이터 항목 정리** — 어떤 필드가 필요한지 목록

---

## 체크리스트

- [ ] shadcn/ui 컴포넌트만 사용
- [ ] Lucide React 아이콘만 사용
- [ ] 알림은 toast (sonner)
- [ ] alert() 사용 금지
- [ ] 다른 UI 라이브러리 추가 금지
- [ ] 상태 색상 규칙 준수
- [ ] 반응형 고려 (모바일~데스크톱)
- [ ] 한국어 텍스트 사용
- [ ] 더미 데이터로 화면 채우기
