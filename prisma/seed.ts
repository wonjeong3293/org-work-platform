import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", displayName: "관리자", description: "시스템 관리자" },
  });
  const managerRole = await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: {},
    create: { name: "MANAGER", displayName: "매니저", description: "부서/팀 관리자" },
  });
  const memberRole = await prisma.role.upsert({
    where: { name: "MEMBER" },
    update: {},
    create: { name: "MEMBER", displayName: "일반 사원", description: "일반 사용자" },
  });

  // Permissions
  const permissionCodes = [
    "task:create", "task:edit", "task:delete", "task:view",
    "project:create", "project:edit", "project:delete", "project:view",
    "approval:create", "approval:manage", "approval:view",
    "org:manage", "user:manage", "role:manage", "admin:access",
  ];
  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, description: code },
      })
    )
  );

  // Assign all permissions to admin
  for (const p of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  // Assign subset to manager
  const managerPerms = permissions.filter(
    (p) => !["admin:access", "role:manage", "user:manage"].includes(p.code)
  );
  for (const p of managerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: p.id },
    });
  }

  // Assign basic permissions to member
  const memberPerms = permissions.filter((p) =>
    ["task:create", "task:edit", "task:view", "project:view", "approval:create", "approval:view"].includes(p.code)
  );
  for (const p of memberPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: memberRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: memberRole.id, permissionId: p.id },
    });
  }

  // Departments
  const ceo = await prisma.department.upsert({
    where: { code: "CEO" },
    update: {},
    create: { name: "경영진", code: "CEO", sortOrder: 0 },
  });
  const dev = await prisma.department.upsert({
    where: { code: "DEV" },
    update: {},
    create: { name: "개발본부", code: "DEV", parentId: ceo.id, sortOrder: 1 },
  });
  const marketing = await prisma.department.upsert({
    where: { code: "MKT" },
    update: {},
    create: { name: "마케팅팀", code: "MKT", parentId: ceo.id, sortOrder: 2 },
  });
  await prisma.department.upsert({
    where: { code: "HR" },
    update: {},
    create: { name: "인사팀", code: "HR", parentId: ceo.id, sortOrder: 3 },
  });
  const frontend = await prisma.department.upsert({
    where: { code: "FE" },
    update: {},
    create: { name: "프론트엔드팀", code: "FE", parentId: dev.id, sortOrder: 0 },
  });
  const backend = await prisma.department.upsert({
    where: { code: "BE" },
    update: {},
    create: { name: "백엔드팀", code: "BE", parentId: dev.id, sortOrder: 1 },
  });

  // Admin user
  const hashedPassword = await hash("admin1234", 12);
  await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: { password: hashedPassword },
    create: {
      email: "admin@company.com",
      name: "관리자",
      password: hashedPassword,
      position: "이사",
      rank: "이사",
      employeeNumber: "EMP001",
      isAdmin: true,
      departmentId: ceo.id,
      roleId: adminRole.id,
    },
  });

  // Sample users
  const samplePassword = await hash("password123", 12);
  await prisma.user.upsert({
    where: { email: "kim@company.com" },
    update: { password: samplePassword },
    create: {
      email: "kim@company.com",
      name: "김개발",
      password: samplePassword,
      position: "과장",
      rank: "과장",
      employeeNumber: "EMP002",
      departmentId: frontend.id,
      roleId: managerRole.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "lee@company.com" },
    update: { password: samplePassword },
    create: {
      email: "lee@company.com",
      name: "이디자인",
      password: samplePassword,
      position: "대리",
      rank: "대리",
      employeeNumber: "EMP003",
      departmentId: frontend.id,
      roleId: memberRole.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "park@company.com" },
    update: { password: samplePassword },
    create: {
      email: "park@company.com",
      name: "박서버",
      password: samplePassword,
      position: "차장",
      rank: "차장",
      employeeNumber: "EMP004",
      departmentId: backend.id,
      roleId: managerRole.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "choi@company.com" },
    update: { password: samplePassword },
    create: {
      email: "choi@company.com",
      name: "최마케팅",
      password: samplePassword,
      position: "대리",
      rank: "대리",
      employeeNumber: "EMP005",
      departmentId: marketing.id,
      roleId: memberRole.id,
    },
  });

  // Approval Templates
  const existingTemplates = await prisma.approvalTemplate.findMany();
  if (existingTemplates.length === 0) {
    await prisma.approvalTemplate.create({
      data: {
        name: "휴가신청서",
        description: "연차/반차/병가 등 휴가 신청",
        category: "인사",
        formSchema: JSON.stringify({
          fields: [
            { name: "leaveType", label: "휴가 종류", type: "select", options: ["연차", "반차(오전)", "반차(오후)", "병가", "경조사"], required: true },
            { name: "startDate", label: "시작일", type: "date", required: true },
            { name: "endDate", label: "종료일", type: "date", required: true },
            { name: "reason", label: "사유", type: "textarea", required: true },
          ],
        }),
      },
    });
    await prisma.approvalTemplate.create({
      data: {
        name: "지출결의서",
        description: "업무 관련 지출 결의",
        category: "재무",
        formSchema: JSON.stringify({
          fields: [
            { name: "amount", label: "금액", type: "number", required: true },
            { name: "purpose", label: "지출 목적", type: "text", required: true },
            { name: "details", label: "상세 내역", type: "textarea", required: true },
            { name: "paymentMethod", label: "결제 방법", type: "select", options: ["법인카드", "개인카드(추후정산)", "계좌이체"], required: true },
          ],
        }),
      },
    });
    await prisma.approvalTemplate.create({
      data: {
        name: "업무보고서",
        description: "주간/월간 업무 보고",
        category: "업무",
        formSchema: JSON.stringify({
          fields: [
            { name: "reportType", label: "보고 유형", type: "select", options: ["주간보고", "월간보고", "수시보고"], required: true },
            { name: "period", label: "보고 기간", type: "text", required: true },
            { name: "content", label: "보고 내용", type: "richtext", required: true },
            { name: "nextPlan", label: "향후 계획", type: "textarea", required: false },
          ],
        }),
      },
    });
  }

  // ============================================
  // Navigation Menu Nodes
  // 좌측 2단까지만 표시, 그 이하는 카드 UI로 진입
  //
  // 안전 흐름: 안전 > 산업안전 > 안전보건운영 > 안전보건방침
  //   좌측: 안전(1단), 산업안전(2단)
  //   카드: 안전보건운영(3단) → 안전보건방침(4단, 실제 기능 페이지)
  // ============================================
  const existingMenus = await prisma.menuNode.findMany();
  if (existingMenus.length === 0) {
    // ── 생산기술 ──
    const production = await prisma.menuNode.create({
      data: { title: "생산기술", slug: "production", domain: "PRODUCTION", type: "FOLDER", icon: "Wrench", sortOrder: 0 },
    });
    await prisma.menuNode.create({
      data: { title: "생산계획", slug: "production-plan", domain: "PRODUCTION", type: "FOLDER", parentId: production.id, sortOrder: 0 },
    });
    const equipmentMgmt = await prisma.menuNode.create({
      data: { title: "설비관리", slug: "equipment-mgmt", domain: "PRODUCTION", type: "FOLDER", parentId: production.id, sortOrder: 1 },
    });
    // 설비관리 > 생산설비 유지보수 > 설비 마스터
    const equipmentMaintenance = await prisma.menuNode.create({
      data: { title: "생산설비 유지보수", slug: "equipment-maintenance", domain: "PRODUCTION", type: "FOLDER", parentId: equipmentMgmt.id, sortOrder: 0 },
    });
    await prisma.menuNode.create({
      data: { title: "설비 마스터", slug: "equipment-master", domain: "PRODUCTION", type: "PAGE", parentId: equipmentMaintenance.id, sortOrder: 0, moduleKey: "equipment_master", route: "/production/equipment-master", pageType: "EQUIPMENT_MASTER" },
    });
    await prisma.menuNode.create({
      data: { title: "유지보수 현황", slug: "prod-equipment-maintenance-dashboard", domain: "PRODUCTION", type: "PAGE", parentId: equipmentMaintenance.id, sortOrder: 1, moduleKey: "maintenance_dashboard", route: "/production/maintenance-dashboard" },
    });
    await prisma.menuNode.create({
      data: { title: "품질관리", slug: "quality-mgmt", domain: "PRODUCTION", type: "FOLDER", parentId: production.id, sortOrder: 2 },
    });

    // ── 환경 ──
    const env = await prisma.menuNode.create({
      data: { title: "환경", slug: "env", domain: "ENV", type: "FOLDER", icon: "Leaf", sortOrder: 1 },
    });
    await prisma.menuNode.create({
      data: { title: "대기관리", slug: "air-management", domain: "ENV", type: "FOLDER", parentId: env.id, sortOrder: 0 },
    });
    await prisma.menuNode.create({
      data: { title: "수질관리", slug: "water-management", domain: "ENV", type: "FOLDER", parentId: env.id, sortOrder: 1 },
    });
    await prisma.menuNode.create({
      data: { title: "폐기물관리", slug: "waste-management", domain: "ENV", type: "FOLDER", parentId: env.id, sortOrder: 2 },
    });
    await prisma.menuNode.create({
      data: { title: "위험물관리", slug: "hazmat-management", domain: "ENV", type: "FOLDER", parentId: env.id, sortOrder: 3 },
    });
    await prisma.menuNode.create({
      data: { title: "화학물질관리", slug: "chemical-management", domain: "ENV", type: "FOLDER", parentId: env.id, sortOrder: 4 },
    });

    // ── 안전 ──
    const safety = await prisma.menuNode.create({
      data: { title: "안전", slug: "safety", domain: "SAFETY", type: "FOLDER", icon: "ShieldCheck", sortOrder: 2 },
    });
    // 2단: 산업안전 (좌측에 보임)
    const industrialSafety = await prisma.menuNode.create({
      data: { title: "산업안전", slug: "industrial-safety", domain: "SAFETY", type: "FOLDER", parentId: safety.id, sortOrder: 0 },
    });
    await prisma.menuNode.create({
      data: { title: "소방관리", slug: "fire-management", domain: "SAFETY", type: "FOLDER", parentId: safety.id, sortOrder: 1 },
    });
    await prisma.menuNode.create({
      data: { title: "보건관리", slug: "health-management", domain: "SAFETY", type: "FOLDER", parentId: safety.id, sortOrder: 2 },
    });

    // 3단: 안전보건운영 (카드로 진입)
    const safetyHealthOps = await prisma.menuNode.create({
      data: { title: "안전보건운영", slug: "safety-health-operation", domain: "SAFETY", type: "FOLDER", parentId: industrialSafety.id, sortOrder: 0 },
    });
    await prisma.menuNode.create({
      data: { title: "안전교육", slug: "safety-education", domain: "SAFETY", type: "FOLDER", parentId: industrialSafety.id, sortOrder: 1 },
    });
    await prisma.menuNode.create({
      data: { title: "위험성평가", slug: "risk-assessment", domain: "SAFETY", type: "FOLDER", parentId: industrialSafety.id, sortOrder: 2 },
    });

    // 3단: 인허가 및 인증
    const licenseCert = await prisma.menuNode.create({
      data: { title: "인허가 및 인증", slug: "license-cert", domain: "SAFETY", type: "FOLDER", parentId: industrialSafety.id, sortOrder: 3 },
    });
    // 4단: 안전검사 (데이터 대시보드형 페이지)
    await prisma.menuNode.create({
      data: { title: "안전검사", slug: "safety-inspection", domain: "SAFETY", type: "PAGE", parentId: licenseCert.id, sortOrder: 0, moduleKey: "safety_inspection", route: "/safety/inspection", pageType: "DATA_DASHBOARD" },
    });

    // 4단: 안전보건방침 (문서보관형 페이지)
    await prisma.menuNode.create({
      data: { title: "안전보건방침", slug: "safety-policy", domain: "SAFETY", type: "PAGE", parentId: safetyHealthOps.id, sortOrder: 0, moduleKey: "safety_policy", route: "/safety/policy", pageType: "DOCUMENT_ARCHIVE" },
    });
    await prisma.menuNode.create({
      data: { title: "안전보건목표", slug: "safety-goals", domain: "SAFETY", type: "PAGE", parentId: safetyHealthOps.id, sortOrder: 1, moduleKey: "safety_goals", route: "/safety/goals", pageType: "DOCUMENT_ARCHIVE" },
    });
    await prisma.menuNode.create({
      data: { title: "안전보건계획", slug: "safety-plan", domain: "SAFETY", type: "PAGE", parentId: safetyHealthOps.id, sortOrder: 2 },
    });

    // ── 공통 ──
    const common = await prisma.menuNode.create({
      data: { title: "공통", slug: "common", domain: "COMMON", type: "FOLDER", icon: "Globe", sortOrder: 3 },
    });
    await prisma.menuNode.create({
      data: { title: "프로젝트", slug: "common-projects", domain: "COMMON", type: "PAGE", parentId: common.id, sortOrder: 0, moduleKey: "projects", route: "/projects" },
    });
    await prisma.menuNode.create({
      data: { title: "업무관리", slug: "common-tasks", domain: "COMMON", type: "PAGE", parentId: common.id, sortOrder: 1, moduleKey: "tasks", route: "/tasks" },
    });
    await prisma.menuNode.create({
      data: { title: "결재", slug: "common-approvals", domain: "COMMON", type: "PAGE", parentId: common.id, sortOrder: 2, moduleKey: "approvals", route: "/approvals" },
    });
    await prisma.menuNode.create({
      data: { title: "조직", slug: "common-organization", domain: "COMMON", type: "PAGE", parentId: common.id, sortOrder: 3, moduleKey: "organization", route: "/organization" },
    });

    console.log("Menu nodes seeded (4-level safety hierarchy for card navigation)");
  }

  // ── 사업장(Site) ──
  const existingSites = await prisma.site.findMany();
  if (existingSites.length === 0) {
    await prisma.site.createMany({
      data: [
        { code: "HS", name: "화성", sortOrder: 0 },
        { code: "PT", name: "평택", sortOrder: 1 },
      ],
    });
    console.log("Sites seeded (HS, PT)");
  }

  // ── 조도측정 일지 메뉴 노드 (없으면 생성: 생산기술 > 문서관리 하위) ──
  let illuminanceMenu = await prisma.menuNode.findFirst({ where: { moduleKey: "illuminance" } });
  if (!illuminanceMenu) {
    let docMgmt = await prisma.menuNode.findFirst({ where: { slug: "document-management" } });
    if (!docMgmt) {
      const production = await prisma.menuNode.findFirst({ where: { slug: "production" } });
      if (production) {
        docMgmt = await prisma.menuNode.create({
          data: { title: "문서관리", slug: "document-management", domain: "PRODUCTION", type: "FOLDER", parentId: production.id, sortOrder: 10 },
        });
      }
    }
    if (docMgmt) {
      illuminanceMenu = await prisma.menuNode.create({
        data: {
          title: "조도측정 일지",
          slug: "illuminance-log",
          domain: "PRODUCTION",
          type: "PAGE",
          parentId: docMgmt.id,
          sortOrder: 0,
          moduleKey: "illuminance",
          pageType: "DOCUMENT_APPROVAL",
          scopeType: "SITE_ONLY",
        },
      });
      console.log("Illuminance menu node created under 생산기술 > 문서관리");
    }
  }

  // ── 조도측정 일지 (정형 테이블 문서 템플릿) ──
  if (illuminanceMenu) {
    const existingTemplate = await prisma.formTemplate.findFirst({
      where: { menuNodeId: illuminanceMenu.id, formType: "TABLE" },
    });
    if (!existingTemplate) {
      const tableSchema = {
        headerFields: [
          { id: "hf_title", label: "문서 제목", type: "readonly", defaultValue: "조도측정 일지", half: true },
          { id: "hf_date", label: "점검일", type: "date", required: true, half: true },
          { id: "hf_temperature", label: "온도(℃)", type: "number", half: true },
          { id: "hf_humidity", label: "습도(%)", type: "number", half: true },
          { id: "hf_inspector", label: "점검자", type: "text", required: true, half: true },
        ],
        columns: [
          { id: "col_factory", label: "공장", type: "text" },
          { id: "col_location", label: "위치", type: "text" },
          { id: "col_standard", label: "기준(lux)", type: "readonly", defaultValue: "300" },
          { id: "col_1st", label: "1차", type: "number" },
          { id: "col_2nd", label: "2차", type: "number" },
          { id: "col_result", label: "판정", type: "select", options: ["적합", "부적합", "해당없음"] },
        ],
        defaultRows: [
          { col_factory: "1공장", col_location: "조립라인 A", col_standard: "300", col_1st: "", col_2nd: "", col_result: "" },
          { col_factory: "1공장", col_location: "조립라인 B", col_standard: "300", col_1st: "", col_2nd: "", col_result: "" },
          { col_factory: "2공장", col_location: "검사실", col_standard: "500", col_1st: "", col_2nd: "", col_result: "" },
          { col_factory: "2공장", col_location: "포장라인", col_standard: "200", col_1st: "", col_2nd: "", col_result: "" },
        ],
        orientation: "landscape",
      };

      await prisma.formTemplate.create({
        data: {
          name: "조도측정 일지",
          description: "작업장 조도측정 결과를 기록하는 정형 테이블 문서 (STRUCTURED_TABLE_APPROVAL)",
          formType: "TABLE",
          formSchema: "[]",
          tableSchema: JSON.stringify(tableSchema),
          menuNodeId: illuminanceMenu.id,
          defaultApprovers: "[]",
          allowedSites: "ALL",
          sortOrder: 0,
        },
      });
      console.log("Illuminance log TABLE template seeded");
    }
  }

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
