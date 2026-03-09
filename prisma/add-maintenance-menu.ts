import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // "생산설비 유지보수" 폴더 찾기
  const parent = await prisma.menuNode.findFirst({
    where: { slug: "production-equipment-yu-ji-bo-su" },
  });
  if (!parent) {
    console.error("equipment-maintenance 메뉴 노드를 찾을 수 없습니다.");
    process.exit(1);
  }

  // 이미 있으면 스킵
  const existing = await prisma.menuNode.findFirst({
    where: { slug: "prod-equipment-maintenance-dashboard" },
  });
  if (existing) {
    console.log("유지보수 현황 메뉴가 이미 존재합니다.");
    return;
  }

  await prisma.menuNode.create({
    data: {
      title: "유지보수 현황",
      slug: "prod-equipment-maintenance-dashboard",
      domain: "PRODUCTION",
      type: "PAGE",
      parentId: parent.id,
      sortOrder: 1,
      moduleKey: "maintenance_dashboard",
      route: "/production/maintenance-dashboard",
    },
  });

  console.log("유지보수 현황 메뉴 노드가 추가되었습니다.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
