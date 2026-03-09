export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const itemId = formData.get("itemId") as string;

  if (!file) {
    return NextResponse.json({ error: "파일은 필수입니다." }, { status: 400 });
  }
  if (!itemId) {
    return NextResponse.json({ error: "장비 ID는 필수입니다." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하만 가능합니다." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase().replace(".", "");
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({
      error: `허용되지 않는 파일 형식입니다. (${ALLOWED_EXTENSIONS.join(", ")})`,
    }, { status: 400 });
  }

  // 장비 존재 확인
  const item = await prisma.safetyInspectionItem.findFirst({
    where: { id: itemId, isDeleted: false },
  });
  if (!item) {
    return NextResponse.json({ error: "장비를 찾을 수 없습니다." }, { status: 404 });
  }

  // 파일 저장
  const uploadDir = path.join(process.cwd(), "uploads", "safety-inspection", itemId);
  await mkdir(uploadDir, { recursive: true });

  const storedName = `${Date.now()}_${file.name}`;
  const storagePath = path.join("uploads", "safety-inspection", itemId, storedName);
  const absolutePath = path.join(process.cwd(), storagePath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  const photo = await prisma.safetyInspectionPhoto.create({
    data: {
      safetyInspectionItemId: itemId,
      fileName: file.name,
      storagePath,
      mimeType: file.type || "image/jpeg",
      fileSize: file.size,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
