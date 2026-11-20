import { PassThrough, Readable } from "stream";
import { ZipArchive } from "archiver";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sanitizeFilename, storageProvider } from "@/lib/storage/local";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string; version: string }> }
) {
  const { slug, version } = await context.params;
  const versionNumber = parseInt(version.replace(/^v/i, ""), 10);

  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
  }

  const session = await getSession();

  const dataset = await prisma.dataset.findUnique({
    where: { slug },
    include: {
      versions: {
        where: { versionNumber },
        include: { files: { orderBy: { originalName: "asc" } } },
      },
    },
  });

  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  if (dataset.visibility !== "PUBLIC" && session?.userId !== dataset.ownerId) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  const targetVersion = dataset.versions[0];
  if (!targetVersion) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  await prisma.dataset.update({
    where: { id: dataset.id },
    data: { downloadCount: { increment: 1 } },
  });

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const passThrough = new PassThrough();

  archive.on("error", (err: Error) => {
    passThrough.destroy(err);
  });

  archive.pipe(passThrough);

  const usedNames = new Map<string, number>();
  for (const file of targetVersion.files) {
    let entryName = sanitizeFilename(file.originalName);
    const count = usedNames.get(entryName) ?? 0;
    usedNames.set(entryName, count + 1);
    if (count > 0) {
      entryName = `${count}-${entryName}`;
    }
    try {
      const fileStream = storageProvider.getStream(file.storageKey);
      archive.append(fileStream as Readable, { name: entryName });
    } catch {
      // Skip missing file gracefully rather than crashing the stream
    }
  }

  void archive.finalize();

  const zipName = `${sanitizeFilename(dataset.slug)}-v${versionNumber}.zip`;
  const webStream = Readable.toWeb(passThrough) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
