# 설비 마스터 작업 내역

## 개요

설비 마스터 페이지에서 하드코딩 mock 데이터를 제거하고, 이력카드 첨부(뷰어/다운로드), 도면 PDF 첨부(뷰어/다운로드), 상태 수동 변경 기능을 실제 동작하도록 구현하였다.

---

## 제거한 것

- `prisma/seed.ts`의 하드코딩 mock 설비 데이터 8건 삭제
- DB에서 기존 mock 데이터 삭제

---

## 구현한 기능

| 기능 | 설명 |
|------|------|
| **신규 설비 등록** | 다이얼로그로 실제 DB 저장 |
| **상태 수동 변경** | 상세 Drawer에서 Select로 가동중/비가동/점검중/폐기 변경 |
| **도면 업로드** | PDF, DWG, DXF, PNG, JPG 지원 |
| **도면 미리보기** | PDF/이미지는 브라우저 내 뷰어로 표시 |
| **도면 다운로드** | 원본 파일명으로 다운로드 |
| **이력카드 추가** | 제목, 유형(점검/수리/교체/기타), 내용, 수행일, 담당자 |
| **이력카드 첨부파일** | 카드별 파일 업로드/다운로드/PDF 뷰어 |
| **이력카드 삭제** | 개별 삭제 |
| **상세 Drawer** | 테이블 행 클릭 → 우측 Sheet에 전체 정보 표시 |

---

## 수정/생성 파일 목록

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | Equipment에 도면 필드(drawingPath, drawingName, drawingSize, drawingMime), HistoryCard에 첨부 필드(attachmentName, attachmentSize, attachmentMime) 추가 |
| `prisma/seed.ts` | mock 데이터 제거 |
| `src/actions/equipment-actions.ts` | CRUD + 이력카드 액션 전면 재작성 |
| `src/components/equipment/equipment-table.tsx` | 상세 Drawer 연결, 행 클릭 이벤트 추가 |
| `src/components/equipment/equipment-create-dialog.tsx` | **신규** - 설비 등록 다이얼로그 |
| `src/components/equipment/equipment-detail-drawer.tsx` | **신규** - 상태변경, 도면 관리, 이력카드 관리 통합 Drawer |
| `src/app/(main)/production/equipment-master/page.tsx` | disabled 버튼을 실제 EquipmentCreateDialog로 교체 |
| `src/app/api/equipment/drawing/upload/route.ts` | **신규** - 도면 업로드 API |
| `src/app/api/equipment/drawing/download/[id]/route.ts` | **신규** - 도면 다운로드 API |
| `src/app/api/equipment/drawing/preview/[id]/route.ts` | **신규** - 도면 미리보기 API (inline 응답) |
| `src/app/api/equipment/history-card/upload/[cardId]/route.ts` | **신규** - 이력카드 첨부파일 업로드 API |
| `src/app/api/equipment/history-card/download/[cardId]/route.ts` | **신규** - 이력카드 첨부파일 다운로드 API (PDF는 inline) |

---

## DB 스키마 변경 사항

### Equipment 모델 추가 필드

```
drawingPath     String?   // 도면 파일 저장 경로
drawingName     String?   // 도면 원본 파일명
drawingSize     Int?      // 도면 파일 크기
drawingMime     String?   // 도면 MIME 타입
```

### EquipmentHistoryCard 모델 추가 필드

```
attachmentName  String?   // 첨부파일 원본 파일명
attachmentSize  Int?      // 첨부파일 크기
attachmentMime  String?   // 첨부파일 MIME 타입
```

---

## 파일 저장 위치

- 도면: `uploads/equipment/drawings/`
- 이력카드 첨부: `uploads/equipment/history-cards/`

---

## 비고

- 모든 데이터는 실제 DB(Prisma) + 파일시스템 기반이며 하드코딩 없음
- 이력카드 양식은 추후 첨부 예정 (현재는 제목/유형/내용/수행일/담당자 기본 필드)
- 상태 변경은 상세 Drawer에서 수동 Select로 즉시 반영
