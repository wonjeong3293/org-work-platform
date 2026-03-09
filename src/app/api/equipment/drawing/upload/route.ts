export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const equipmentId = formData.get("equipmentId") as string;

  if (!file || !equipmentId) {
    return NextResponse.json({ error: "파일과 설비 ID는 필수입니다." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase().replace(".", "");
  const allowed = ["pdf", "dwg", "dxf", "png", "jpg", "jpeg"];
  if (!allowed.includes(ext)) {
    return NextResponse.json(
      { error: `허용되지 않는 파일 형식입니다. (${allowed.join(", ")})` },
      { status: 400 }
    );
  }

  const uploadDir = path.join(process.cwd(), "uploads", "equipment", "drawings");
  await mkdir(uploadDir, { recursive: true });

  const storedName = `drawing_${equipmentId}_${Date.now()}.${ext}`;
  const storagePath = path.join("uploads", "equipment", "drawings", storedName);
  const absolutePath = path.join(process.cwd(), storagePath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  await prisma.equipment.update({
    where: { id: equipmentId },
    data: {
      drawingPath: storagePath,
      drawingName: file.name,
      drawingSize: file.size,
      drawingMime: file.type || "application/octet-stream",
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
