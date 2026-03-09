export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extensionToPolicyType } from "@/lib/constants";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS = ["pdf", "ppt", "pptx", "doc", "docx"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const siteCode = (formData.get("siteCode") as string) || "ALL";
  const category = (formData.get("category") as string) || "POLICY";
  const year = Number(formData.get("year")) || new Date().getFullYear();

  if (!file) {
    return NextResponse.json(
      { error: "파일은 필수입니다." },
      { status: 400 }
    );
  }

  // 확장자 자동 판별
  const ext = path.extname(file.name).toLowerCase().replace(".", "");

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      {
        error: `허용되지 않는 파일 형식입니다. (${ALLOWED_EXTENSIONS.join(", ")})`,
      },
      { status: 400 }
    );
  }

  const policyType = extensionToPolicyType(ext);

  // 해당 확장자 + 카테고리의 최신 버전 조회
  const latest = await prisma.policyDocument.findFirst({
    where: { extension: ext, category },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  // 파일 저장
  const uploadDir = path.join(process.cwd(), "uploads", "policy");
  await mkdir(uploadDir, { recursive: true });

  const storedName = `${ext}_v${nextVersion}_${Date.now()}.${ext}`;
  const storagePath = path.join("uploads", "policy", storedName);
  const absolutePath = path.join(process.cwd(), storagePath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  // DB: 기존 isCurrent 해제 + 신규 문서 isCurrent=true (트랜잭션)
  const doc = await prisma.$transaction(async (tx) => {
    await tx.policyDocument.updateMany({
      where: { policyType, isCurrent: true, siteCode, category },
      data: { isCurrent: false },
    });

    return tx.policyDocument.create({
      data: {
        extension: ext,
        version: nextVersion,
        originalName: file.name,
        storagePath,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedById: session.user.id,
        policyType,
        category,
        isCurrent: true,
        siteCode,
        year,
      },
    });
  });

  return NextResponse.json(doc, { status: 201 });
}
