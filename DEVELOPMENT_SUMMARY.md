# org-work-platform 개발 현황 요약

> 최종 업데이트: 2026-03-06

## 프로젝트 개요

조직 업무 관리 플랫폼. 다중 사업장(화성/평택) 환경에서 안전·환경·생산기술 문서를 관리하고, 업무·프로젝트·결재 워크플로우를 처리하는 웹 애플리케이션.

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 언어 | TypeScript | 5.x |
| UI | React + Tailwind CSS + shadcn/ui (Radix) | React 19 / TW 4 |
| DB | SQLite + Prisma ORM | Prisma 6.19 |
| 인증 | NextAuth.js (Credentials, JWT) | 5.0-beta.30 |
| 폼 | React Hook Form + Zod | RHF 7.71 / Zod 4.3 |
| DnD | @dnd-kit | 6.3 |
| 리치 텍스트 | Tiptap | 3.20 |

---

## 데이터 모델 (Prisma)

### 인증·사용자
| 모델 | 주요 필드 | 설명 |
|------|-----------|------|
| **User** | email, name, password, position, rank, isAdmin, departmentId, roleId | 사용자 계정 |
| **Account** | provider, providerAccountId | OAuth 계정 연동 |
| **Session** | sessionToken, expires | 세션 관리 |
| **Role** | name, displayName | 역할 (ADMIN, MANAGER, MEMBER) |
| **Permission** | code, description | 권한 (task.create 등 14개) |
| **RolePermission** | roleId, permissionId | 역할-권한 매핑 |

### 조직
| 모델 | 주요 필드 | 설명 |
|------|-----------|------|
| **Department** | name, code, parentId, sortOrder | 부서 (계층 구조) |
| **Site** | code (HS/PT), name, isActive | 사업장 |

### 프로젝트·업무
| 모델 | 주요 필드 | 설명 |
|------|-----------|------|
| **Project** | name, status, startDate, endDate, departmentId | 프로젝트 |
| **ProjectMember** | projectId, userId, role (OWNER/MANAGER/MEMBER) | 프로젝트 구성원 |
| **Task** | title, status, priority, assigneeId, parentId, sortOrder | 업무 (하위 업무 지원) |
| **TaskComment** | taskId, authorId, content | 업무 댓글 |
| **Label / TaskLabel** | name, color / taskId, labelId | 라벨 |
| **Attachment** | fileName, filePath, taskId / approvalRequestId | 첨부파일 |

### 결재
| 모델 | 주요 필드 | 설명 |
|------|-----------|------|
| **ApprovalTemplate** | name, category, formSchema (JSON) | 결재 양식 |
| **ApprovalRequest** | title, content, status, urgency, submitterId | 결재 요청 |
| **ApprovalStep** | stepOrder, type, status, approverId | 결재 단계 (다단계 순차) |

### 안전 문서
| 모델 | 주요 필드 | 설명 |
|------|-----------|------|
| **PolicyDocument** | extension, version, policyType, isCurrent, isArchived, **siteCode**, **year** | 안전보건방침 문서 |
| **PolicyDocumentLog** | action, performedById, detail | 감사 로그 |

### 네비게이션
| 모델 | 주요 필드 | 설명 |
|------|-----------|------|
| **MenuNode** | title, slug, domain, type, parentId, moduleKey, **scopeType** | 메뉴 트리 (4단계 계층) |
| **Notification** | type, title, message, isRead, userId | 알림 |

---

## 페이지 라우트 및 구현 상태

### 인증

| 경로 | 설명 | 상태 |
|------|------|------|
| `/login` | 이메일/비밀번호 로그인 | ✅ 완료 |
| `/register` | 회원가입 | ✅ 완료 |

### 대시보드

| 경로 | 설명 | 상태 |
|------|------|------|
| `/dashboard` | 메인 대시보드 (통계, 섹션카드, 최근 업무) | ✅ 완료 |

### 프로젝트

| 경로 | 설명 | 상태 |
|------|------|------|
| `/projects` | 프로젝트 목록 (상태 배지, 구성원/업무 수) | ✅ 완료 |
| `/projects/new` | 프로젝트 생성 | ✅ 완료 |
| `/projects/[id]` | 프로젝트 상세 | ✅ 완료 |

### 업무

| 경로 | 설명 | 상태 |
|------|------|------|
| `/tasks` | 업무 리스트 (우선순위, 상태, 라벨) | ✅ 완료 |
| `/tasks/new` | 업무 생성 | ✅ 완료 |
| `/tasks/board` | 칸반 보드 (Drag & Drop) | ✅ 완료 |
| `/tasks/[id]` | 업무 상세 (댓글, 하위 업무) | ✅ 완료 |

### 결재

| 경로 | 설명 | 상태 |
|------|------|------|
| `/approvals` | 결재 수신함 (대기 중) | ✅ 완료 |
| `/approvals/sent` | 결재 발신함 | ✅ 완료 |
| `/approvals/new` | 결재 요청 생성 (템플릿, 다단계) | ✅ 완료 |
| `/approvals/[id]` | 결재 상세 (승인/반려/회수) | ✅ 완료 |

### 안전보건방침

| 경로 | 설명 | 상태 |
|------|------|------|
| `/safety/policy` | 문서 관리 (업로드, 버전, 보관, 삭제) | ✅ 완료 |

### 조직

| 경로 | 설명 | 상태 |
|------|------|------|
| `/organization` | 조직도 (계층 트리) | ✅ 완료 |
| `/organization/members` | 구성원 목록 (검색/필터) | ✅ 완료 |
| `/organization/members/[id]` | 구성원 상세 | ✅ 완료 |

### 관리자

| 경로 | 설명 | 상태 |
|------|------|------|
| `/admin` | 관리자 대시보드 | ✅ 완료 |
| `/admin/users` | 사용자 관리 | ✅ 완료 |
| `/admin/departments` | 부서 관리 (계층) | ✅ 완료 |
| `/admin/sites` | 사업장 관리 | ✅ 완료 |
| `/admin/menus` | 메뉴 관리 (트리, 정렬, **scopeType 설정**) | ✅ 완료 |

### 섹션 네비게이션 (동적)

| 경로 | 설명 | 상태 |
|------|------|------|
| `/section/[sectionId]` | 섹션 개요 (카드 그리드) | ✅ 완료 |
| `/section/[sectionId]/[category]` | 카테고리 뷰 | ✅ 완료 |
| `/section/[sectionId]/[category]/[sub]` | 하위 카테고리 뷰 | ✅ 완료 |
| `/modules/[moduleKey]` | 모듈 라우팅 (MODULE_REGISTRY 기반) | ✅ 완료 |

### 설정

| 경로 | 설명 | 상태 |
|------|------|------|
| `/settings` | 프로필 표시 | ⚠️ 읽기 전용 (수정 미구현) |

---

## API 라우트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth 핸들러 |
| POST | `/api/safety/policy/upload` | 파일 업로드 (siteCode, year 포함) |
| GET | `/api/safety/policy/download/[id]` | 파일 다운로드 |
| GET | `/api/safety/policy/preview/[id]` | PDF 미리보기 |

---

## Server Actions

| 파일 | 함수 | 설명 |
|------|------|------|
| **auth-actions.ts** | `loginAction`, `registerAction`, `logoutAction` | 인증 |
| **project-actions.ts** | `getProjects`, `getProjectById`, `createProject`, `updateProject`, `deleteProject` | 프로젝트 CRUD |
| **task-actions.ts** | `getTasks`, `getTasksByStatus`, `getTaskById`, `createTask`, `updateTask`, `updateTaskStatus`, `deleteTask`, `addTaskComment` | 업무 CRUD + 칸반 |
| **approval-actions.ts** | `getApprovalTemplates`, `getPendingApprovals`, `getSentApprovals`, `getApprovalById`, `createApproval`, `processApprovalAction`, `withdrawApproval` | 결재 워크플로우 |
| **user-actions.ts** | `getUsers`, `getUserById`, `updateUser`, `createUser`, `getAllUsersForAdmin`, `searchUsers` | 사용자 관리 |
| **department-actions.ts** | `getDepartments`, `getDepartmentTree`, `createDepartment`, `updateDepartment`, `deleteDepartment` | 부서 관리 |
| **policy-actions.ts** | `getPolicyDocuments`, `getCurrentByType`, `setCurrentDocument`, `archiveDocument`, `deleteDocument`, `restoreDocument` | 문서 관리 |
| **site-actions.ts** | `getSites`, `getActiveSites`, `createSite`, `updateSite`, `deleteSite` | 사업장 관리 |
| **menu-actions.ts** | `getMenuTree`, `getMenuNodes`, `createMenuNode`, `updateMenuNode`, `reorderMenuNode`, `getMenuScopeType`, `deleteMenuNode` | 메뉴 관리 |

---

## 사업장/연도 스코프 시스템 (최신 구현)

### 개요
모든 모듈은 **사업장(site)** + **연도(year)** 스코프로 데이터를 관리한다.

### 전역 필터
- 상단 헤더에 site/year 드롭다운 (모든 페이지 공통)
- URL query(`?site=HS&year=2026`)로 유지, 페이지 이동/새로고침 시 보존
- 기본값: `site=ALL`, `year=현재연도`
- `FilterProvider` 컨텍스트 + `useGlobalFilter()` 훅으로 접근

### scopeType (모듈별 입력 범위)
MenuNode의 `scopeType` 필드로 각 모듈의 입력 가능 범위를 설정한다.

| scopeType | 통합(ALL) | 사업장(HS/PT) |
|-----------|-----------|---------------|
| `GLOBAL_ONLY` | 입력 가능 | 조회만 가능 |
| `SITE_ONLY` | 합산 조회만 | 입력 가능 |
| `BOTH` | 입력 가능 | 입력 가능 |

- **관리자 > 메뉴관리**에서 각 메뉴별 scopeType 변경 가능
- 변경 즉시 반영 (업로드 버튼 활성/비활성 + 안내 메시지)

### 조회 규칙
- `year`: 항상 선택 연도로 필터링
- `site=HS|PT`: 해당 사업장 데이터만 조회 (BOTH 모듈이면 ALL 데이터도 포함)
- `site=ALL`: 전체 사업장 데이터 합산 조회, 리스트에 [통합]/[화성]/[평택] 배지 표시

### 삭제 규칙
- 문서의 origin site에서만 삭제 가능
- 통합에서 올린 문서 → 통합에서만 삭제
- 화성에서 올린 문서 → 화성에서만 삭제

### 현재 적용 모듈
| 모듈 | scopeType | 비고 |
|------|-----------|------|
| 안전보건방침 | BOTH | site/year 필터, 배지, 삭제 규칙 모두 적용 |
| 기타 모듈 | SITE_ONLY (기본값) | 추후 개별 설정 필요 |

---

## 컴포넌트 구조

```
src/components/
├── ui/                     # shadcn/ui 공통 컴포넌트 (button, card, dialog, select 등 20+개)
├── layout/
│   ├── header.tsx          # 상단 바 (site/year 필터, 메뉴 검색, 알림, 사용자 메뉴)
│   ├── sidebar.tsx         # 좌측 네비게이션 (메뉴 트리 2단계 표시)
│   ├── breadcrumb.tsx      # 브레드크럼
│   └── section-card-grid.tsx  # 섹션 카드 그리드
├── admin/
│   ├── menu-form.tsx       # 메뉴 CRUD (scopeType 선택 포함)
│   ├── site-form.tsx       # 사업장 CRUD
│   ├── department-form.tsx # 부서 CRUD
│   ├── user-table.tsx      # 사용자 테이블
│   └── user-edit-dialog.tsx
├── safety/
│   ├── policy-upload.tsx          # 파일 업로드 (siteCode/year 전송)
│   ├── policy-document-table.tsx  # 문서 테이블 (사업장/연도 배지, 삭제 규칙)
│   ├── policy-active-card.tsx     # 현재 적용본 카드
│   ├── policy-preview.tsx         # PDF 미리보기
│   ├── policy-delete-dialog.tsx   # 삭제 확인 다이얼로그
│   ├── policy-archive-button.tsx  # 보관 버튼
│   └── policy-set-current-button.tsx  # 최신본 설정 버튼
├── organization/
│   └── org-chart.tsx       # 조직도
└── tasks/
    ├── kanban-board.tsx    # 칸반 보드
    ├── kanban-column.tsx   # 칸반 컬럼
    └── kanban-card.tsx     # 칸반 카드
```

---

## 유틸리티 (src/lib/)

| 파일 | 설명 |
|------|------|
| `auth.ts` / `auth.config.ts` | NextAuth 설정 (Credentials, JWT, 콜백) |
| `prisma.ts` | Prisma 클라이언트 싱글톤 |
| `constants.ts` | 상수 정의 (상태, 우선순위, 직급, 정책 타입 등) |
| `filter-context.tsx` | 전역 site/year 필터 컨텍스트 |
| `scope.ts` | scopeType 권한 판별 함수 |
| `sites.ts` | 사업장 목록, 라벨, 연도 옵션 |
| `module-registry.ts` | moduleKey → 라우트 매핑 |
| `utils.ts` | `cn()` Tailwind 유틸리티 |

---

## Seed 데이터

| 항목 | 내용 |
|------|------|
| 역할 | ADMIN, MANAGER, MEMBER (14개 권한 매핑) |
| 사용자 | 5명 (admin@company.com / admin1234) |
| 부서 | CEO > DEV/MKT/HR > FE/BE |
| 사업장 | HS (화성), PT (평택) |
| 결재 양식 | 휴가신청서, 지출결의서, 업무보고서 |
| 메뉴 | 4단계 계층 (생산기술/환경/안전/공통) |

---

## 마이그레이션 이력

| 일자 | 마이그레이션 | 내용 |
|------|-------------|------|
| 2026-03-03 | `init` | 초기 스키마 |
| 2026-03-03 | `add_policy_document` | PolicyDocument 모델 |
| 2026-03-03 | `add_menu_node` | MenuNode 모델 |
| 2026-03-04 | `policy_extension_archive_logs` | extension, archive, PolicyDocumentLog |
| 2026-03-04 | `add_policy_type_is_current` | policyType, isCurrent |
| 2026-03-05 | `add_module_key_to_menu` | moduleKey |
| 2026-03-06 | `db push` | MenuNode.scopeType 추가 |

---

## 디렉토리 구조

```
org-work-platform/
├── prisma/
│   ├── schema.prisma          # DB 스키마
│   ├── seed.ts                # 초기 데이터
│   ├── dev.db                 # SQLite DB
│   └── migrations/            # 마이그레이션 이력
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   ├── page.tsx           # / → /dashboard 리다이렉트
│   │   ├── (auth)/            # 로그인, 회원가입
│   │   ├── (main)/            # 보호된 라우트 (FilterProvider 포함)
│   │   │   ├── layout.tsx     # 사이드바 + 헤더 레이아웃
│   │   │   ├── dashboard/
│   │   │   ├── admin/         # users, departments, sites, menus
│   │   │   ├── safety/policy/
│   │   │   ├── approvals/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── organization/
│   │   │   ├── section/[sectionId]/
│   │   │   ├── modules/[moduleKey]/
│   │   │   └── settings/
│   │   └── api/               # auth, safety/policy (upload/download/preview)
│   ├── actions/               # 서버 액션 (비즈니스 로직)
│   ├── components/            # UI 컴포넌트
│   ├── lib/                   # 유틸리티, 설정
│   ├── hooks/                 # 커스텀 훅
│   └── types/                 # TypeScript 타입
├── uploads/policy/            # 업로드 파일 저장소
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```
