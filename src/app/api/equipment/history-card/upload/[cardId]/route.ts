export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "파일은 필수입니다." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase().replace(".", "");

  const uploadDir = path.join(process.cwd(), "uploads", "equipment", "history-cards");
  await mkdir(uploadDir, { recursive: true });

  const storedName = `card_${cardId}_${Date.now()}.${ext}`;
  const storagePath = path.join("uploads", "equipment", "history-cards", storedName);
  const absolutePath = path.join(process.cwd(), storagePath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  await prisma.equipmentHistoryCard.update({
    where: { id: cardId },
    data: {
      attachmentPath: storagePath,
      attachmentName: file.name,
      attachmentSize: file.size,
      attachmentMime: file.type || "application/octet-stream",
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
