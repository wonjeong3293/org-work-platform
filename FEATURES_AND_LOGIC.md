# 주요 기능 및 로직 요약

> 최종 업데이트: 2026-03-06

---

## 1. 인증 (Authentication)

### 로직 흐름
```
[로그인 화면] → loginAction(email, password)
  → Zod 유효성 검증
  → signIn("credentials", { email, password })
  → authorize() 콜백 실행
    → DB에서 email로 사용자 조회
    → isActive 확인 (비활성 계정 차단)
    → bcryptjs.compare()로 비밀번호 검증
    → JWT 토큰 생성 (user.id 포함)
  → /dashboard로 리다이렉트
```

### 세션 관리
```
모든 요청 → jwt() 콜백
  → session() 콜백
    → token.id로 DB 사용자 재조회
    → session.user에 주입:
      id, name, email, position, isAdmin, department, role
```

### 접근 제어
```
authorized() 콜백:
  - /login, /register → 로그인 상태면 /dashboard로 리다이렉트
  - 그 외 모든 경로 → 미로그인 시 /login으로 리다이렉트
  - /admin/* → 페이지 내에서 session.user.isAdmin 체크
```

### 회원가입
```
registerAction(name, email, password, employeeNumber)
  → Zod 유효성 검증
  → 이메일/사번 중복 체크
  → bcryptjs.hash()로 비밀번호 해싱
  → MEMBER 역할 자동 할당
  → 사용자 생성 → 자동 로그인 → /dashboard 리다이렉트
```

---

## 2. 네비게이션 시스템

### 메뉴 트리 구조
```
DB (MenuNode) → getMenuTree() → 계층 트리 빌드
  depth 0: 섹션 (생산기술, 환경, 안전, 공통)     ← 사이드바 표시
  depth 1: 카테고리 (산업안전, 소방관리, ...)      ← 사이드바 하위
  depth 2: 서브카테고리 (안전보건운영, ...)         ← 섹션 카드 페이지
  depth 3: 기능 페이지 (안전보건방침, ...)          ← 서브 카드 페이지
```

### 라우팅 우선순위
```
MenuNode 클릭 시:
  1) moduleKey 있으면 → /modules/{moduleKey} → MODULE_REGISTRY에서 실제 라우트 조회
  2) route 있으면 → 해당 경로로 직접 이동
  3) 둘 다 없으면 → /section/{domain}/{slug} (카드 페이지)
```

### MODULE_REGISTRY
```typescript
safety_policy → /safety/policy    // 안전보건방침
dashboard     → /dashboard        // 대시보드
projects      → /projects         // 프로젝트
tasks         → /tasks            // 업무관리
approvals     → /approvals        // 결재
organization  → /organization     // 조직
```

### 사이드바 동작
```
- depth 0: 아이콘 + 제목 + 펼침/접힘 (chevron)
  - 클릭 → /section/{sectionKey}로 이동 (카드 그리드)
  - chevron → 하위 메뉴 토글
- depth 1: 하위 항목 (텍스트만)
  - moduleKey/route 있으면 직접 이동
  - 없으면 → /section/{domain}/{slug}
- 접힘 모드: 아이콘만 표시
- 하단 고정: 관리자, 설정
```

---

## 3. 사업장/연도 스코프 시스템

### 전역 필터
```
FilterProvider (React Context)
  ↓
  URL query: ?site=HS&year=2026
  ↓
  useGlobalFilter() → { site, year, setSite, setYear }
  ↓
  헤더 드롭다운으로 변경 → URL 업데이트 → 페이지 데이터 재조회
```

### scopeType 판별 로직
```typescript
canCreateInScope(site, scopeType):
  GLOBAL_ONLY → site === "ALL" 일 때만 true
  SITE_ONLY   → site !== "ALL" 일 때만 true  (HS, PT 등)
  BOTH        → 항상 true
```

### 데이터 조회 규칙
```
site=HS 선택 시:
  → WHERE siteCode IN ("ALL", "HS")   // 해당 사업장 + 통합 데이터

site=ALL 선택 시:
  → WHERE 조건 없음 (전체)             // HS + PT + ALL 모두 표시
  → 리스트에 [통합]/[화성]/[평택] 배지 표시

year는 항상:
  → WHERE year = 선택연도
```

### scopeType 설정 방법
```
관리자 > 메뉴관리 (/admin/menus)
  → 각 메뉴의 "스코프 타입" 셀렉트 변경
  → updateMenuNode() 호출
  → DB 즉시 반영
  → 해당 모듈 페이지에서 scopeType 조회 → 업로드 버튼 활성/비활성
```

---

## 4. 안전보건방침 (Safety Policy)

### 업로드 플로우
```
[파일 선택] → PolicyUpload 컴포넌트
  → FormData { file, siteCode, year }
  → POST /api/safety/policy/upload
    → 확장자 검증 (pdf/ppt/pptx/doc/docx)
    → extensionToPolicyType(): pdf → SIGNED_PDF, ppt/pptx → POLICY_PPT
    → 버전 자동 증분 (해당 확장자 최신 version + 1)
    → uploads/policy/ 디렉토리에 파일 저장
    → 트랜잭션:
      ① 기존 isCurrent=true 해제 (같은 policyType + siteCode)
      ② 새 문서 생성 (isCurrent=true, siteCode, year)
  → 201 Created → router.refresh()
```

### 현재 적용본 조회
```
getCurrentByType(policyType, siteCode)
  → WHERE policyType + isCurrent=true + isArchived=false
  → site별: siteCode 필터 적용
  → 서명본 PDF 카드 + 방침 PPT 카드 (2개)
```

### 문서 상태 관리
```
  [활성] ← isCurrent=true, isArchived=false
    ↓ archiveDocument()
  [보관] ← isArchived=true, isCurrent=false
    ↓ restoreDocument()     ↓ deleteDocument()
  [활성] ← 복원            [영구삭제] ← 관리자만, 파일명 확인 필요
```

### 최신본 설정
```
setCurrentDocument(id)
  → 문서 조회 → 보관 상태 체크
  → 트랜잭션:
    ① 같은 policyType + siteCode의 기존 isCurrent 해제
    ② 선택 문서 isCurrent=true 설정
    ③ PolicyDocumentLog에 감사 로그 기록
```

### 삭제 규칙
```
문서의 origin siteCode와 현재 선택 site 비교:
  - currentSite === doc.siteCode → 삭제 버튼 표시
  - currentSite !== doc.siteCode → "-" 표시 (삭제 불가)

예: HS에서 업로드한 문서 → site=HS에서만 삭제 가능
    ALL에서 업로드한 문서 → site=ALL에서만 삭제 가능

영구 삭제 시:
  → isAdmin 체크
  → 파일명 수동 입력 확인 (안전장치)
  → PolicyDocumentLog 기록 (documentId는 SetNull)
  → 파일시스템에서 파일 삭제
  → DB 레코드 삭제
```

### 감사 로그 (Audit Trail)
```
모든 문서 액션 기록:
  SET_CURRENT → "최신본 설정: 파일명 (타입, 사업장)"
  ARCHIVE     → "문서 보관: 파일명"
  RESTORE     → "문서 복원: 파일명"
  DELETE      → "영구 삭제: 파일명 (v버전, 확장자)"

기록 항목: documentId, action, performedById, detail, createdAt
```

---

## 5. 업무 관리 (Tasks)

### 생성 로직
```
createTask(data)
  → 인증 확인
  → 같은 status 컬럼 내 최대 sortOrder 조회 → +1
  → Task 생성 (creatorId = 현재 사용자)
  → /tasks, /tasks/board, /dashboard 캐시 무효화
```

### 칸반 보드 (Drag & Drop)
```
@dnd-kit 사용:
  [TODO] [IN_PROGRESS] [IN_REVIEW] [DONE]

드래그 완료 시:
  → updateTaskStatus(id, newStatus, newSortOrder)
  → status === "DONE"이면 completedAt = now() 자동 설정
```

### 업무 상태 흐름
```
TODO → IN_PROGRESS → IN_REVIEW → DONE
  ↑___________|___________|         |
  (어느 상태로든 되돌리기 가능)      completedAt 자동 설정
```

### 계층 구조
```
Task (parentId=null)     ← 최상위 업무
  └── Task (parentId=상위)  ← 하위 업무 (subtask)

조회 시: parentId=null 조건으로 최상위만 조회
상세에서: subtasks 포함하여 트리 표시
```

### 조회 필터
```
getTasks(options):
  - projectId → 프로젝트별 필터
  - status → 상태별 필터
  - assigneeId → 담당자별 필터
  - search → 제목 검색
  - parentId=null → 하위 업무 제외

정렬: sortOrder ASC → createdAt DESC
```

---

## 6. 결재 워크플로우 (Approvals)

### 생성 플로우
```
createApproval({ title, content, templateId, urgency, approvers[] })
  → 인증 확인
  → ApprovalRequest 생성 (status=PENDING, submittedAt=now())
  → ApprovalStep[] 생성:
    approvers.map((approver, index) → {
      stepOrder: index + 1,
      type: approver.type,     // APPROVE | REVIEW | NOTIFY
      approverId: approver.userId,
      status: "PENDING"
    })
```

### 결재 처리 흐름
```
processApprovalAction(requestId, action, comment)
  → 현재 사용자의 PENDING 단계 찾기
  → 해당 단계 status 업데이트 (APPROVED/REJECTED)

  action === "REJECTED":
    → 전체 요청 status = REJECTED, completedAt = now()
    (반려 시 나머지 단계 무시, 즉시 종료)

  action === "APPROVED":
    → 다음 단계(stepOrder+1) 존재 확인
    → 존재: 요청 status = IN_PROGRESS (다음 결재자 대기)
    → 미존재: 모든 단계 완료 → 요청 status = APPROVED, completedAt = now()
```

### 순차 결재 구조
```
Step 1 (PENDING) → APPROVED
  ↓
Step 2 (PENDING) → APPROVED
  ↓
Step 3 (PENDING) → APPROVED
  ↓
요청 전체 APPROVED

※ 어느 단계에서든 REJECTED → 전체 즉시 REJECTED
```

### 회수 (Withdrawal)
```
withdrawApproval(requestId)
  → 제출자 본인만 가능
  → PENDING/IN_PROGRESS 상태에서만 가능
  → 요청 status = WITHDRAWN
  → 남은 PENDING 단계 → 모두 SKIPPED 처리
```

### 결재함 조회
```
수신함 (getPendingApprovals):
  → 현재 사용자가 approverId인 PENDING 단계가 있는 요청
  → status IN ("PENDING", "IN_PROGRESS")

발신함 (getSentApprovals):
  → 현재 사용자가 submitterId인 모든 요청
```

---

## 7. 대시보드

### 통계 카드 (실시간)
```
4개 통계를 병렬 조회:
  ① 할 일: Task WHERE assigneeId=me AND status=TODO → COUNT
  ② 진행 중: Task WHERE assigneeId=me AND status=IN_PROGRESS → COUNT
  ③ 결재 대기: ApprovalStep WHERE approverId=me AND status=PENDING
               AND request.status IN (PENDING, IN_PROGRESS) → COUNT
  ④ 긴급 업무: ①+② 합산
```

### 섹션 카드
```
메뉴 트리에서 domain별 리프 노드 수 계산:
  PRODUCTION → 생산기술 (N개 모듈)
  ENV        → 환경 (N개 모듈)
  SAFETY     → 안전 (N개 모듈)
  COMMON     → 공통 (N개 모듈)

클릭 → /section/{sectionKey}
```

### 최근 업무
```
Task WHERE (assigneeId=me OR creatorId=me)
  ORDER BY updatedAt DESC
  LIMIT 5

표시: 제목, 프로젝트명, 담당자, 상태 배지
```

---

## 8. 조직 관리

### 부서 계층
```
Department (parentId=null)         ← CEO, 대표이사
  └── Department (parentId=상위)    ← 개발부, 마케팅부, 인사부
      └── Department               ← 프론트엔드팀, 백엔드팀

getDepartmentTree():
  → 전체 부서 조회
  → parentId 기반 트리 빌드
  → 각 부서의 멤버 수 포함
```

### 부서 삭제
```
deleteDepartment(id)
  → 하위 부서 존재 여부 확인 → 있으면 삭제 불가
  → 소속 사용자 존재 여부 확인 → 있으면 삭제 불가
  → isActive=false (소프트 삭제)
```

---

## 9. 프로젝트 관리

### 생성 로직
```
createProject(data)
  → 프로젝트 생성
  → 생성자를 OWNER 역할로 ProjectMember에 자동 추가
```

### 상태 흐름
```
ACTIVE → COMPLETED
  ↓         ↓
ON_HOLD   ARCHIVED
```

---

## 10. 관리자 기능

### 메뉴 관리
```
메뉴 트리 구조:
  - 트리 표시: flattenTree()로 들여쓰기 렌더링
  - 정렬: reorderMenuNode(id, "up"/"down")
    → 같은 parentId 형제 중 인접 노드와 sortOrder 교환
  - 삭제: 하위 메뉴 있으면 삭제 불가
  - scopeType 변경: GLOBAL_ONLY / SITE_ONLY / BOTH
```

### 사용자 관리
```
  - 관리자: 모든 사용자 CRUD 가능
  - 일반 사용자: 자신의 name, phone만 수정 가능
  - isAdmin 플래그로 관리자 권한 부여
```

### 사업장 관리
```
Site CRUD:
  - code (고유값): HS, PT 등
  - name: 화성, 평택 등
  - isActive: 활성/비활성
  - sortOrder: 헤더 드롭다운 정렬 순서
```

---

## 11. 파일 처리

### 업로드 경로
```
uploads/policy/{ext}_v{version}_{timestamp}.{ext}
예: uploads/policy/pdf_v3_1709712345678.pdf
```

### 다운로드
```
GET /api/safety/policy/download/{id}
  → DB에서 storagePath 조회
  → fs.readFile()로 파일 읽기
  → Content-Disposition: attachment; filename*=UTF-8''{encodedName}
```

### 미리보기
```
GET /api/safety/policy/preview/{id}
  → PDF 파일만 지원
  → Content-Disposition: inline (브라우저 내 표시)
```

---

## 12. 데이터 흐름 패턴

### Server Component (RSC) 패턴
```
페이지 컴포넌트 (async)
  → Server Action 호출 (DB 조회)
  → 데이터 직렬화 (Date → ISO string)
  → Client Component에 props로 전달
```

### Server Action 뮤테이션 패턴
```
Client Component → Server Action 호출
  → auth() 인증 확인
  → Prisma 트랜잭션 (다중 테이블 업데이트)
  → revalidatePath() 캐시 무효화
  → router.refresh() (클라이언트)
```

### 전역 상태 관리
```
URL Query (?site=HS&year=2026)
  ↕ (양방향 동기화)
FilterContext (React Context)
  ↓
useGlobalFilter() 훅
  ↓
각 컴포넌트에서 site/year 사용
```

---

## 13. 보안 체크포인트

| 위치 | 체크 내용 |
|------|-----------|
| `authorized()` 콜백 | 모든 페이지 인증 여부 |
| 각 Server Action | `auth()` → `session.user.id` 존재 확인 |
| 관리자 기능 | `session.user.isAdmin` 체크 |
| 문서 삭제 | isAdmin + 파일명 수동 입력 확인 |
| 비밀번호 | bcryptjs 해싱 (평문 저장 안함) |
| 사업장 삭제 권한 | origin siteCode 일치 여부 |
| 결재 회수 | submitterId === 현재 사용자 |
| 결재 처리 | 해당 단계의 approverId === 현재 사용자 |
