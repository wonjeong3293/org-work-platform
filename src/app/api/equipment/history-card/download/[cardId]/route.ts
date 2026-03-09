export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;
  const card = await prisma.equipmentHistoryCard.findUnique({
    where: { id: cardId },
    select: { attachmentPath: true, attachmentName: true, attachmentMime: true },
  });

  if (!card?.attachmentPath) {
    return NextResponse.json({ error: "첨부파일이 없습니다." }, { status: 404 });
  }

  const absolutePath = path.join(process.cwd(), card.attachmentPath);
  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  // PDF는 inline으로, 나머지는 attachment로
  const isPdf = card.attachmentMime?.includes("pdf");
  const disposition = isPdf ? "inline" : `attachment; filename*=UTF-8''${encodeURIComponent(card.attachmentName || "file")}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": card.attachmentMime || "application/octet-stream",
      "Content-Disposition": disposition,
      "Content-Length": String(buffer.length),
    },
  });
}
