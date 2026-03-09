export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const eq = await prisma.equipment.findUnique({
    where: { id },
    select: { drawingPath: true, drawingName: true, drawingMime: true },
  });

  if (!eq?.drawingPath) {
    return NextResponse.json({ error: "도면 파일이 없습니다." }, { status: 404 });
  }

  const absolutePath = path.join(process.cwd(), eq.drawingPath);
  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": eq.drawingMime || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(eq.drawingName || "drawing")}`,
      "Content-Length": String(buffer.length),
    },
  });
}
