# 문서관리 + 양식관리 + 전자결재 구현 계획

> 작성일: 2026-03-06

---

## 1. 현재 상태 분석

### 재사용 가능한 기존 자산
| 항목 | 현재 상태 | 재사용 방법 |
|------|-----------|-------------|
| MenuNode 모델 | moduleKey, scopeType 있음 | `pageType` 필드 추가 |
| PolicyDocument 시스템 | safety_policy 전용 | 범용 Document 모델로 확장 |
| 결재 워크플로우 | ApprovalRequest/Step 작동 중 | 문서결재형에 연동 |
| ApprovalTemplate.formSchema | DB 필드 존재, UI 미구현 | 양식 렌더러 구현 |
| FilterProvider (site/year) | 전역 필터 작동 중 | 그대로 사용 |
| scopeType 시스템 | GLOBAL_ONLY/SITE_ONLY/BOTH | 그대로 사용 |
| 파일 업로드 패턴 | PolicyUpload + API 라우트 | 범용화 |
| shadcn/ui 컴포넌트 | Dialog, Table, Form 등 | 그대로 사용 |

### 신규 구현 필요
| 항목 | 설명 |
|------|------|
| pageType on MenuNode | 문서보관형 / 문서결재형 구분 |
| FormTemplate 모델 | 양식 정의 (JSON schema) |
| Document 모델 | 범용 문서 (모듈별 분리) |
| DocumentApproval 모델 | 문서 + 결재 연결 |
| 양식 빌더 UI | 관리자 양식 설계 도구 |
| 양식 렌더러 | JSON schema → 폼 렌더링 |
| 범용 문서보관 페이지 | moduleKey 기반 동적 렌더링 |
| 문서결재 페이지 | 양식 작성 + 결재 연동 |

---

## 2. 데이터 모델 설계

### 2-1. MenuNode 확장

```prisma
model MenuNode {
  // 기존 필드 유지
  id        String     @id @default(cuid())
  parentId  String?
  title     String
  slug      String     @unique
  domain    String
  type      String     // FOLDER | PAGE
  route     String?
  icon      String?
  sortOrder Int        @default(0)
  isActive  Boolean    @default(true)
  moduleKey String?
  scopeType String     @default("SITE_ONLY")

  // === 신규 필드 ===
  pageType  String     @default("NONE")
  // 값: NONE | DOCUMENT_ARCHIVE | DOCUMENT_APPROVAL
  // NONE: 기존 방식 (카드/폴더)
  // DOCUMENT_ARCHIVE: 문서보관형
  // DOCUMENT_APPROVAL: 문서결재형
}
```

### 2-2. FormTemplate (양식 관리)

```prisma
model FormTemplate {
  id             String   @id @default(cuid())
  name           String                          // 양식명
  description    String?                         // 설명
  formType       String   @default("FORM")       // FORM | FILE | SUMMARY
  formSchema     String   @default("[]")         // JSON: 필드 정의 배열
  menuNodeId     String?                         // 연결된 메뉴 (nullable)
  menuNode       MenuNode? @relation(fields: [menuNodeId], references: [id])
  defaultApprovers String? @default("[]")        // JSON: 기본 결재라인
  allowedSites   String   @default("ALL")        // ALL | HS,PT (콤마 구분)
  isActive       Boolean  @default(true)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

#### formSchema JSON 구조
```json
[
  {
    "id": "field_1",
    "type": "text",           // text|number|date|checkbox|select|file|photo|table
    "label": "점검 항목",
    "required": true,
    "placeholder": "입력하세요",
    "options": []              // select용
  },
  {
    "id": "field_2",
    "type": "table",
    "label": "점검 결과",
    "columns": [
      { "id": "col_1", "label": "항목", "type": "text" },
      { "id": "col_2", "label": "결과", "type": "select", "options": ["양호","불량"] },
      { "id": "col_3", "label": "비고", "type": "text" }
    ],
    "defaultRows": 3
  }
]
```

### 2-3. Document (범용 문서)

```prisma
model Document {
  id            String    @id @default(cuid())
  moduleKey     String                          // 연결 모듈 (예: safety_policy)
  title         String                          // 문서 제목
  status        String    @default("ACTIVE")    // ACTIVE | ARCHIVED | DELETED
  siteCode      String    @default("ALL")
  year          Int       @default(2026)
  isCurrent     Boolean   @default(false)       // 문서보관형: 최신본 여부

  // 파일 정보
  originalName  String
  storagePath   String
  fileSize      Int
  mimeType      String
  extension     String
  version       Int       @default(1)

  // 메타데이터
  createdById   String
  createdBy     User      @relation("DocumentCreator", fields: [createdById], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 결재 연결 (문서결재형에서 사용)
  approvalId    String?   @unique
  approval      DocumentApproval? @relation(fields: [approvalId], references: [id])

  logs          DocumentLog[]
}
```

### 2-4. DocumentApproval (문서결재)

```prisma
model DocumentApproval {
  id              String    @id @default(cuid())
  moduleKey       String                           // 연결 모듈
  formTemplateId  String?                          // 사용된 양식
  formTemplate    FormTemplate? @relation(fields: [formTemplateId], references: [id])
  title           String                           // 결재 제목
  formData        String    @default("{}")          // JSON: 양식 입력값
  status          String    @default("DRAFT")
  // DRAFT | REQUESTED | IN_PROGRESS | APPROVED | REJECTED

  siteCode        String    @default("ALL")
  year            Int       @default(2026)

  submitterId     String
  submitter       User      @relation("ApprovalSubmitter2", fields: [submitterId], references: [id])
  submittedAt     DateTime?
  completedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // 첨부 문서 (역방향)
  document        Document?

  // 결재 단계
  steps           DocumentApprovalStep[]
}
```

### 2-5. DocumentApprovalStep (결재 단계)

```prisma
model DocumentApprovalStep {
  id          String    @id @default(cuid())
  approvalId  String
  approval    DocumentApproval @relation(fields: [approvalId], references: [id], onDelete: Cascade)
  stepOrder   Int
  stepType    String    @default("APPROVE")    // APPROVE | AGREE | NOTIFY
  status      String    @default("PENDING")    // PENDING | APPROVED | REJECTED | SKIPPED
  comment     String?
  actionAt    DateTime?
  createdAt   DateTime  @default(now())

  approverId  String
  approver    User      @relation("DocApprovalApprover", fields: [approverId], references: [id])

  @@unique([approvalId, stepOrder])
}
```

### 2-6. DocumentLog (감사 로그)

```prisma
model DocumentLog {
  id            String    @id @default(cuid())
  documentId    String?
  document      Document? @relation(fields: [documentId], references: [id], onDelete: SetNull)
  action        String    // UPLOAD | SET_CURRENT | ARCHIVE | DELETE | RESTORE
  performedById String
  performedBy   User      @relation("DocLogPerformer", fields: [performedById], references: [id])
  detail        String?
  createdAt     DateTime  @default(now())
}
```

### 2-7. 전체 ER 관계도

```
MenuNode (pageType, moduleKey)
  │
  ├── pageType=DOCUMENT_ARCHIVE
  │     └── Document[] (moduleKey 매칭)
  │           └── DocumentLog[]
  │
  └── pageType=DOCUMENT_APPROVAL
        └── FormTemplate[] (menuNodeId 연결)
              └── DocumentApproval[] (formTemplateId)
                    ├── DocumentApprovalStep[]
                    └── Document? (첨부파일)

User
  ├── Document (createdBy)
  ├── DocumentApproval (submitter)
  ├── DocumentApprovalStep (approver)
  └── DocumentLog (performedBy)
```

---

## 3. 관리자 UI 구조

### 3-1. 메뉴관리 개선 (`/admin/menus`)

```
메뉴 생성/수정 다이얼로그
┌─────────────────────────────────────┐
│ 기본 정보                            │
│  제목: [____________]                │
│  Slug: [____________]                │
│  도메인: [공통 ▼]  타입: [페이지 ▼]    │
│  아이콘: [Shield ▼] 상위메뉴: [안전 ▼] │
│                                     │
│ 페이지 설정                          │
│  페이지 타입: [문서결재형 ▼]           │
│  스코프 타입: [사업장 전용 ▼]          │
│                                     │
│ 경로 설정                            │
│  모듈 키: [____________]             │
│  경로:   [____________]             │
│  정렬순서: [0]                       │
│                                     │
│            [수정]                    │
└─────────────────────────────────────┘
```

**pageType 선택지:**
| 값 | 라벨 | 설명 |
|----|------|------|
| `NONE` | 기본 (폴더/카드) | 기존 방식 |
| `DOCUMENT_ARCHIVE` | 문서보관형 | 파일 업로드/버전관리 |
| `DOCUMENT_APPROVAL` | 문서결재형 | 양식 작성 + 결재 |

### 3-2. 양식관리 (신규: `/admin/forms`)

```
양식 관리 페이지
┌─────────────────────────────────────────────────────┐
│ 양식 관리                              [양식 추가]    │
├─────────────────────────────────────────────────────┤
│ 양식명      │ 유형  │ 연결 메뉴    │ 사업장 │ 상태  │ 작업 │
│ 안전점검표  │ FORM  │ 안전점검     │ ALL   │ 활성  │ [편집] │
│ 작업허가서  │ FILE  │ 작업허가     │ HS,PT │ 활성  │ [편집] │
│ 월간보고    │ FORM  │ 안전보고     │ ALL   │ 활성  │ [편집] │
└─────────────────────────────────────────────────────┘
```

**양식 생성/편집 다이얼로그:**
```
┌──────────────────────────────────────────────────┐
│ 양식 생성                                         │
│                                                  │
│ 양식명:     [안전점검표_________]                   │
│ 양식 유형:  [FORM ▼]                              │
│ 연결 메뉴:  [안전 > 산업안전 > 안전점검 ▼]          │
│ 사업장:     [ALL ▼]                               │
│                                                  │
│ 기본 결재라인:                                     │
│  1. [승인 ▼] [홍길동 (팀장) ▼]                     │
│  2. [승인 ▼] [김영희 (부장) ▼]                     │
│  [+ 결재자 추가]                                   │
│                                                  │
│ ─── 양식 필드 설계 ──────────────────              │
│                                                  │
│  [+ 텍스트] [+ 숫자] [+ 날짜] [+ 체크박스]          │
│  [+ 드롭다운] [+ 파일첨부] [+ 사진] [+ 표]         │
│                                                  │
│  ┌ 필드 1: 점검일자 [날짜] ──────── [삭제] ┐       │
│  │ 라벨: [점검일자]  필수: [v]              │       │
│  └─────────────────────────────────────────┘       │
│  ┌ 필드 2: 점검 결과 [표] ───────── [삭제] ┐       │
│  │ 열: [항목] [결과] [비고]   [+ 열추가]    │       │
│  │ 기본 행 수: [5]                         │       │
│  └─────────────────────────────────────────┘       │
│                                                  │
│                  [저장]                            │
└──────────────────────────────────────────────────┘
```

---

## 4. 페이지 구조 설계

### 4-1. 문서보관형 페이지

**라우트:** `/documents/archive/[moduleKey]`

```
┌──────────────────────────────────────────────────────┐
│ [상단 헤더: 사업장 ▼ | 연도 ▼ | 검색...]              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  브레드크럼: 안전 > 산업안전 > 안전보건운영 > 안전보건방침  │
│  안전보건방침                                          │
│  안전보건방침 문서를 관리합니다.                          │
│                                                      │
│  ┌─────────────────┐  ┌─────────────────┐            │
│  │ 서명본 PDF       │  │ 방침 PPT        │            │
│  │ (현재 적용본)     │  │ (현재 적용본)    │            │
│  │ 파일명.pdf       │  │ 파일명.pptx     │            │
│  │ [미리보기][다운로드]│  │ [다운로드]      │            │
│  └─────────────────┘  └─────────────────┘            │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 업로드 이력                    [파일 업로드]     │  │
│  │ (비활성 시: "통합에서는 등록 불가")               │  │
│  ├────────────────────────────────────────────────┤  │
│  │ 사업장│연도│확장자│파일명│업로더│업로드일│...│삭제 │  │
│  │ [화성]│2026│ pdf │xxx  │홍길동│03-05  │   │ [x] │  │
│  │ [통합]│2026│pptx │yyy  │김영희│03-04  │   │  -  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**기존 안전보건방침(`/safety/policy`)을 이 구조로 마이그레이션하거나, 새 범용 페이지에서 moduleKey=safety_policy일 때 동일하게 동작하도록 구현.**

### 4-2. 문서결재형 페이지

**라우트:** `/documents/approval/[moduleKey]`

#### 문서 목록 화면
```
┌──────────────────────────────────────────────────────┐
│ [상단 헤더: 사업장 ▼ | 연도 ▼ | 검색...]              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  브레드크럼: 안전 > 산업안전 > 안전점검                   │
│  안전점검                              [새 문서 작성]   │
│                                                      │
│  ┌─── 탭 ──────────────────────────────────────┐     │
│  │ [전체] [임시저장] [결재중] [승인완료] [반려]    │     │
│  ├─────────────────────────────────────────────┤     │
│  │ 사업장│제목        │양식명    │작성자│상태  │일자   │     │
│  │ [화성]│3월 점검결과 │안전점검표│홍길동│승인완료│03-05│     │
│  │ [평택]│2월 점검결과 │안전점검표│김영희│결재중 │02-28│     │
│  │ [화성]│특별점검     │안전점검표│박철수│임시저장│03-06│     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

#### 문서 작성/상세 화면
```
┌──────────────────────────────────────────────────────┐
│  안전점검표 작성                                      │
│                                                      │
│  ┌─── 결재칸 (우측 상단) ──────────────────────┐     │
│  │  ┌────────┐ ┌────────┐ ┌────────┐          │     │
│  │  │ 작성자  │ │  팀장   │ │  부장   │          │     │
│  │  │ 박철수  │ │ 홍길동  │ │ 김영희  │          │     │
│  │  │03-06   │ │ 대기    │ │ 대기    │          │     │
│  │  └────────┘ └────────┘ └────────┘          │     │
│  └─────────────────────────────────────────────┘     │
│                                                      │
│  사업장: [화성 ▼]                                     │
│  제목:  [3월 안전점검 결과___________]                  │
│                                                      │
│  ─── 양식 필드 (FormRenderer) ─────────               │
│                                                      │
│  점검일자: [2026-03-06]                               │
│  점검자:   [박철수_____]                               │
│                                                      │
│  점검 결과:                                           │
│  ┌──────────┬─────────┬──────────┐                   │
│  │ 항목      │ 결과     │ 비고     │                   │
│  ├──────────┼─────────┼──────────┤                   │
│  │ 소화기    │ [양호 ▼] │ [_____]  │                   │
│  │ 비상구    │ [양호 ▼] │ [_____]  │                   │
│  │ 전기설비  │ [불량 ▼] │ [수리요청]│                   │
│  ├──────────┼─────────┼──────────┤                   │
│  │ [+ 행 추가]                    │                   │
│  └──────────┴─────────┴──────────┘                   │
│                                                      │
│  첨부파일: [파일 추가]                                 │
│    - 점검사진1.jpg (2.1MB) [x]                        │
│                                                      │
│  ─── 결재라인 설정 ────────────────                    │
│  1. [승인 ▼] [홍길동 (팀장) ▼]           [x]          │
│  2. [승인 ▼] [김영희 (부장) ▼]           [x]          │
│  [+ 결재자 추가]                                      │
│                                                      │
│  [임시저장]  [결재요청]                                 │
│                                                      │
│  ─── 결재 의견 ──────────────────                     │
│  홍길동(팀장) 03-06 10:32 [승인] "확인했습니다"         │
│  김영희(부장) - [대기중]                               │
└──────────────────────────────────────────────────────┘
```

---

## 5. API 및 Server Action 구조

### 5-1. 문서보관형 API

```
Server Actions (src/actions/document-actions.ts)
├── getDocuments(moduleKey, { siteCode, year, search, includeArchived })
├── getDocumentById(id)
├── getCurrentDocument(moduleKey, siteCode)
├── setCurrentDocument(id)
├── archiveDocument(id)
├── restoreDocument(id)
├── deleteDocument(id, confirmName)
└── (감사 로그 자동 기록)

API Route (src/app/api/documents/upload/route.ts)
├── POST: 파일 업로드 (moduleKey, siteCode, year, file)
└── 버전 자동 증분, isCurrent 설정

API Route (src/app/api/documents/[id]/download/route.ts)
└── GET: 파일 다운로드

API Route (src/app/api/documents/[id]/preview/route.ts)
└── GET: PDF 미리보기
```

### 5-2. 문서결재형 API

```
Server Actions (src/actions/doc-approval-actions.ts)
├── getDocApprovals(moduleKey, { siteCode, year, status, search })
├── getDocApprovalById(id)
├── createDocApproval({ moduleKey, formTemplateId, title, formData, siteCode, year })
├── updateDocApproval(id, { title, formData })      // 임시저장 상태에서만
├── submitDocApproval(id, approvers[])                // 결재요청
├── processDocApproval(id, action, comment)           // 승인/반려
├── addDocApprovalComment(id, comment)                // 의견
└── withdrawDocApproval(id)                           // 회수
```

### 5-3. 양식관리 API

```
Server Actions (src/actions/form-template-actions.ts)
├── getFormTemplates({ menuNodeId?, isActive? })
├── getFormTemplateById(id)
├── createFormTemplate({ name, formType, formSchema, menuNodeId, defaultApprovers, allowedSites })
├── updateFormTemplate(id, data)
├── deleteFormTemplate(id)
└── getFormTemplatesByMenu(menuNodeId)       // 특정 메뉴에 연결된 양식 목록
```

---

## 6. 컴포넌트 구조

### 6-1. 신규 컴포넌트

```
src/components/
├── documents/
│   ├── document-table.tsx          # 범용 문서 테이블 (PolicyDocumentTable 기반)
│   ├── document-upload.tsx         # 범용 업로드 버튼
│   ├── document-active-card.tsx    # 현재 적용본 카드
│   ├── document-delete-dialog.tsx  # 삭제 확인
│   └── document-archive-button.tsx # 보관 버튼
│
├── approval/
│   ├── approval-list.tsx           # 문서결재 목록 (탭별 필터)
│   ├── approval-form.tsx           # 문서결재 작성 폼
│   ├── approval-stamp.tsx          # 결재칸 UI (직책/이름/날짜)
│   ├── approval-line-editor.tsx    # 결재라인 편집기
│   ├── approval-action-buttons.tsx # 승인/반려/의견 버튼
│   └── approval-comment-list.tsx   # 결재 의견 이력
│
├── form-builder/
│   ├── form-builder.tsx            # 양식 설계 (관리자용)
│   ├── form-renderer.tsx           # 양식 렌더링 (사용자용)
│   ├── field-config-panel.tsx      # 필드 설정 패널
│   └── fields/
│       ├── text-field.tsx
│       ├── number-field.tsx
│       ├── date-field.tsx
│       ├── checkbox-field.tsx
│       ├── select-field.tsx
│       ├── file-field.tsx
│       ├── photo-field.tsx
│       └── table-field.tsx         # 동적 테이블 (행/열 추가삭제)
│
└── admin/
    ├── form-template-form.tsx      # 양식 생성/수정 폼
    └── (기존 menu-form.tsx 확장)
```

### 6-2. 페이지 라우트

```
src/app/(main)/
├── documents/
│   ├── archive/[moduleKey]/page.tsx    # 문서보관형 범용 페이지
│   └── approval/[moduleKey]/
│       ├── page.tsx                    # 문서결재 목록
│       ├── new/page.tsx               # 새 문서 작성
│       └── [id]/page.tsx              # 문서 상세/결재 처리
│
├── admin/
│   ├── menus/page.tsx                 # (기존, pageType 추가)
│   └── forms/page.tsx                 # 양식관리 (신규)
│
└── (기존 safety/policy 유지)
```

---

## 7. 모듈 라우팅 확장

### module-registry.ts 변경

```typescript
export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  // 기존
  safety_policy: { route: "/safety/policy", label: "안전보건방침" },
  dashboard:     { route: "/dashboard", label: "대시보드" },
  projects:      { route: "/projects", label: "프로젝트" },
  tasks:         { route: "/tasks", label: "업무관리" },
  approvals:     { route: "/approvals", label: "결재" },
  organization:  { route: "/organization", label: "조직" },
};
```

**변경:** moduleKey가 MODULE_REGISTRY에 없는 경우,
MenuNode.pageType을 조회하여 동적 라우팅:

```typescript
// /modules/[moduleKey]/page.tsx 변경 로직
const registryRoute = getModuleRoute(moduleKey);
if (registryRoute) {
  redirect(registryRoute);
}

// 레지스트리에 없으면 DB에서 pageType 조회
const menuNode = await getMenuNodeByModuleKey(moduleKey);
if (menuNode?.pageType === "DOCUMENT_ARCHIVE") {
  redirect(`/documents/archive/${moduleKey}`);
}
if (menuNode?.pageType === "DOCUMENT_APPROVAL") {
  redirect(`/documents/approval/${moduleKey}`);
}

// 그 외: 준비중 페이지
```

---

## 8. 결재칸 UI 상세

### 컴포넌트: ApprovalStamp

```
┌────────┬────────┬────────┐
│ 작성    │ 검토    │ 승인    │   ← stepType 라벨 또는 직책
├────────┼────────┼────────┤
│        │        │        │
│ 박철수  │ 홍길동  │ 김영희  │   ← 이름 (굵게)
│        │        │        │
├────────┼────────┼────────┤
│ 03-06  │ 03-06  │ 대기    │   ← 날짜 또는 상태
│ 09:00  │ 10:32  │        │
└────────┴────────┴────────┘
```

**상태별 표시:**
- 승인 완료: 날짜/시간 (파란색)
- 반려: "반려" (빨간색) + 날짜
- 대기: "대기" (회색)
- 건너뜀: "건너뜀" (연한 회색)

---

## 9. 구현 단계 (Phase)

### Phase 1: 기반 구조 (DB + 메뉴 확장)
**예상 작업:**
1. Prisma 스키마 확장 (MenuNode.pageType, FormTemplate, Document, DocumentApproval, DocumentApprovalStep, DocumentLog)
2. `npx prisma db push`
3. MenuNode에 pageType 필드 추가 → 메뉴폼/관리페이지 반영
4. `/modules/[moduleKey]` 동적 라우팅 로직 변경

**결과:** 메뉴에서 pageType 선택 가능, 라우팅 분기 작동

### Phase 2: 문서보관형 범용화
**예상 작업:**
1. Document 모델용 server actions (document-actions.ts)
2. 범용 업로드 API 라우트
3. 범용 문서 테이블/업로드/삭제 컴포넌트
4. `/documents/archive/[moduleKey]` 페이지
5. 기존 safety_policy와 호환 (또는 마이그레이션)

**결과:** 메뉴에서 문서보관형 설정 시 자동으로 문서관리 페이지 생성

### Phase 3: 양식관리
**예상 작업:**
1. FormTemplate server actions
2. `/admin/forms` 양식 관리 페이지
3. 양식 빌더 UI (필드 추가/삭제/설정)
4. 양식 렌더러 컴포넌트 (JSON → 폼)
5. 테이블 필드 구현 (행/열 동적 추가삭제)

**결과:** 관리자가 웹에서 양식을 설계하고 메뉴에 연결 가능

### Phase 4: 문서결재형 페이지
**예상 작업:**
1. DocumentApproval server actions
2. `/documents/approval/[moduleKey]` 목록 페이지
3. `/documents/approval/[moduleKey]/new` 작성 페이지
4. `/documents/approval/[moduleKey]/[id]` 상세/결재 페이지
5. 결재칸 UI (ApprovalStamp)
6. 결재라인 편집기
7. 결재 처리 (승인/반려/의견)
8. 문서 상태 관리 (임시저장 → 결재요청 → 결재중 → 승인/반려)

**결과:** 양식 작성 + 결재 워크플로우 완성

### Phase 5: 통합/마무리
**예상 작업:**
1. 기존 ApprovalRequest와 DocumentApproval 관계 정리
2. 대시보드에 결재 대기 건수 통합
3. site/year 필터 전체 적용 확인
4. 권한 체크 (관리자/작성자/결재자)
5. 기존 safety_policy 마이그레이션 (선택)

---

## 10. 기존 안전보건방침 호환 전략

### 옵션 A: 그대로 유지 (권장, 1차)
- `/safety/policy` 기존 경로 유지
- PolicyDocument 모델 그대로 사용
- 새로운 문서보관형 메뉴는 Document 모델 사용
- MODULE_REGISTRY에서 safety_policy는 기존 라우트 유지

### 옵션 B: 마이그레이션 (2차)
- PolicyDocument → Document로 데이터 이전
- `/safety/policy` → `/documents/archive/safety_policy` 리다이렉트
- 코드 통합으로 유지보수 부담 감소

**1차 버전에서는 옵션 A를 권장.** 기존 기능이 깨지지 않으면서 새 구조를 검증한 후, 안정화되면 옵션 B로 마이그레이션.

---

## 11. 파일 변경 목록 (예상)

### 수정 파일
| 파일 | 변경 내용 |
|------|-----------|
| `prisma/schema.prisma` | 5개 모델 추가, MenuNode.pageType 추가, User 관계 추가 |
| `src/actions/menu-actions.ts` | pageType 필드 CRUD 반영 |
| `src/components/admin/menu-form.tsx` | pageType 셀렉트 추가 |
| `src/app/(main)/admin/menus/page.tsx` | pageType 컬럼 표시 |
| `src/lib/module-registry.ts` | 동적 라우팅 로직 |
| `src/app/(main)/modules/[moduleKey]/page.tsx` | pageType 기반 분기 |

### 신규 파일
| 파일 | 설명 |
|------|------|
| `src/actions/document-actions.ts` | 범용 문서 CRUD |
| `src/actions/doc-approval-actions.ts` | 문서결재 CRUD |
| `src/actions/form-template-actions.ts` | 양식 CRUD |
| `src/app/api/documents/upload/route.ts` | 범용 파일 업로드 |
| `src/app/api/documents/[id]/download/route.ts` | 다운로드 |
| `src/app/api/documents/[id]/preview/route.ts` | 미리보기 |
| `src/app/(main)/documents/archive/[moduleKey]/page.tsx` | 문서보관형 |
| `src/app/(main)/documents/approval/[moduleKey]/page.tsx` | 결재 목록 |
| `src/app/(main)/documents/approval/[moduleKey]/new/page.tsx` | 결재 작성 |
| `src/app/(main)/documents/approval/[moduleKey]/[id]/page.tsx` | 결재 상세 |
| `src/app/(main)/admin/forms/page.tsx` | 양식관리 |
| `src/components/documents/*.tsx` | 문서 컴포넌트 6개 |
| `src/components/approval/*.tsx` | 결재 컴포넌트 6개 |
| `src/components/form-builder/*.tsx` | 양식 빌더 3개 + 필드 8개 |
| `src/components/admin/form-template-form.tsx` | 양식 폼 |
