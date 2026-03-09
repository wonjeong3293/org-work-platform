/**
 * 안전검사 메뉴 노드 추가 스크립트
 * 실행: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/add-safety-inspection-menu.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 이미 존재하는지 확인
  const existing = await prisma.menuNode.findFirst({
    where: { moduleKey: "safety_inspection" },
  });
  if (existing) {
    console.log("안전검사 메뉴가 이미 존재합니다:", existing.id);
    return;
  }

  // 산업안전 노드 찾기
  const industrialSafety = await prisma.menuNode.findFirst({
    where: { slug: "industrial-safety" },
  });
  if (!industrialSafety) {
    console.error("산업안전 메뉴 노드를 찾을 수 없습니다.");
    return;
  }

  // 인허가 및 인증 노드 생성 또는 조회
  let licenseCert = await prisma.menuNode.findFirst({
    where: { slug: "license-cert" },
  });
  if (!licenseCert) {
    licenseCert = await prisma.menuNode.create({
      data: {
        title: "인허가 및 인증",
        slug: "license-cert",
        domain: "SAFETY",
        type: "FOLDER",
        parentId: industrialSafety.id,
        sortOrder: 3,
      },
    });
    console.log("인허가 및 인증 메뉴 노드 생성:", licenseCert.id);
  }

  // 안전검사 페이지 노드 생성
  const safetyInspection = await prisma.menuNode.create({
    data: {
      title: "안전검사",
      slug: "safety-inspection",
      domain: "SAFETY",
      type: "PAGE",
      parentId: licenseCert.id,
      sortOrder: 0,
      moduleKey: "safety_inspection",
      route: "/safety/inspection",
      pageType: "DATA_DASHBOARD",
      scopeType: "SITE_ONLY",
    },
  });
  console.log("안전검사 메뉴 노드 생성:", safetyInspection.id);

  // 기본 장비 종류 마스터 데이터
  const defaultTypes = ["프레스", "크레인", "리프트", "압력용기", "곤돌라", "컨베이어"];
  for (const name of defaultTypes) {
    const exists = await prisma.safetyInspectionEquipmentType.findUnique({ where: { name } });
    if (!exists) {
      await prisma.safetyInspectionEquipmentType.create({
        data: { name, sortOrder: defaultTypes.indexOf(name) },
      });
    }
  }
  console.log("기본 장비 종류 마스터 데이터 생성 완료");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
