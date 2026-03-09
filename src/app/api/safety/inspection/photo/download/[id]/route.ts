export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const photo = await prisma.safetyInspectionPhoto.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "사진을 찾을 수 없습니다." }, { status: 404 });
  }

  const absolutePath = path.join(process.cwd(), photo.storagePath);
  try {
    const buffer = await readFile(absolutePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(photo.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
}
