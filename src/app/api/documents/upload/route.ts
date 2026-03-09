export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS = ["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "hwp", "jpg", "jpeg", "png"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const moduleKey = formData.get("moduleKey") as string;
  const siteCode = (formData.get("siteCode") as string) || "ALL";
  const year = Number(formData.get("year")) || new Date().getFullYear();
  const title = (formData.get("title") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "파일은 필수입니다." }, { status: 400 });
  }
  if (!moduleKey) {
    return NextResponse.json({ error: "모듈 키는 필수입니다." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase().replace(".", "");
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({
      error: `허용되지 않는 파일 형식입니다. (${ALLOWED_EXTENSIONS.join(", ")})`,
    }, { status: 400 });
  }

  // Version increment per module+extension
  const latest = await prisma.document.findFirst({
    where: { moduleKey, extension: ext },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  // Save file
  const uploadDir = path.join(process.cwd(), "uploads", "documents", moduleKey);
  await mkdir(uploadDir, { recursive: true });

  const storedName = `${ext}_v${nextVersion}_${Date.now()}.${ext}`;
  const storagePath = path.join("uploads", "documents", moduleKey, storedName);
  const absolutePath = path.join(process.cwd(), storagePath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  // DB transaction: unset old current, create new
  const doc = await prisma.$transaction(async (tx) => {
    await tx.document.updateMany({
      where: { moduleKey, siteCode, isCurrent: true },
      data: { isCurrent: false },
    });

    return tx.document.create({
      data: {
        moduleKey,
        title: title || file.name,
        originalName: file.name,
        storagePath,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        extension: ext,
        version: nextVersion,
        siteCode,
        year,
        isCurrent: true,
        createdById: session.user.id,
      },
    });
  });

  // Log
  await prisma.documentLog.create({
    data: {
      documentId: doc.id,
      action: "UPLOAD",
      performedById: session.user.id,
      detail: `파일 업로드: ${file.name} (v${nextVersion})`,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
