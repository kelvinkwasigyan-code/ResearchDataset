import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sanitizeFilename, storageProvider } from "@/lib/storage/local";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const session = await getSession();

  const file = await prisma.datasetFile.findUnique({
    where: { id: fileId },
    include: {
      version: {
        include: {
          dataset: true,
        },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const dataset = file.version.dataset;
  if (dataset.visibility !== "PUBLIC" && session?.userId !== dataset.ownerId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  let nodeStream: NodeJS.ReadableStream;
  try {
    nodeStream = storageProvider.getStream(file.storageKey);
  } catch {
    return NextResponse.json(
      { error: "Stored file could not be found on disk" },
      { status: 404 }
    );
  }

  await prisma.dataset.update({
    where: { id: dataset.id },
    data: { downloadCount: { increment: 1 } },
  });

  const safeDownloadName = sanitizeFilename(file.originalName);
  const webStream = Readable.toWeb(nodeStream as Readable) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `attachment; filename="${safeDownloadName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
