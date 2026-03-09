export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "문서를 찾을 수 없습니다" }, { status: 404 });
  }

  const absolutePath = path.join(process.cwd(), doc.storagePath);
  const buffer = await readFile(absolutePath);

  const encodedName = encodeURIComponent(doc.originalName);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(buffer.length),
    },
  });
}
