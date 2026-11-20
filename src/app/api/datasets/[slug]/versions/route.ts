import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildStorageKey, storageProvider } from "@/lib/storage/local";
import { getExtension } from "@/lib/format";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataset = await prisma.dataset.findUnique({
    where: { slug },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  if (dataset.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data request." },
      { status: 400 }
    );
  }

  const changelog =
    String(formData.get("changelog") ?? "").trim() || "Updated dataset files";
  const fileEntries = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (fileEntries.length === 0) {
    return NextResponse.json(
      { error: "At least one non-empty file is required for a new version." },
      { status: 400 }
    );
  }

  const nextVersionNumber = (dataset.versions[0]?.versionNumber ?? 0) + 1;
  const storedKeys: string[] = [];

  try {
    const preparedFiles: {
      id: string;
      originalName: string;
      storageKey: string;
      mimeType: string;
      extension: string;
      sizeBytes: number;
      sha256: string;
    }[] = [];

    let totalBytes = 0;

    for (const file of fileEntries) {
      const fileId = crypto.randomUUID();
      const key = buildStorageKey(
        dataset.id,
        nextVersionNumber,
        fileId,
        file.name
      );
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await storageProvider.put(key, buffer);
      storedKeys.push(stored.storageKey);
      totalBytes += stored.sizeBytes;

      preparedFiles.push({
        id: fileId,
        originalName: file.name,
        storageKey: stored.storageKey,
        mimeType: file.type || "application/octet-stream",
        extension: getExtension(file.name),
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
      });
    }

    const version = await prisma.datasetVersion.create({
      data: {
        datasetId: dataset.id,
        versionNumber: nextVersionNumber,
        changelog,
        totalBytes: BigInt(totalBytes),
        files: {
          create: preparedFiles,
        },
      },
      include: { files: true },
    });

    await prisma.dataset.update({
      where: { id: dataset.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(
      {
        version: {
          id: version.id,
          datasetId: version.datasetId,
          versionNumber: version.versionNumber,
          changelog: version.changelog,
          totalBytes: Number(version.totalBytes),
          publishedAt: version.publishedAt.toISOString(),
          files: version.files.map((f) => ({
            id: f.id,
            versionId: f.versionId,
            originalName: f.originalName,
            mimeType: f.mimeType,
            extension: f.extension,
            sizeBytes: f.sizeBytes,
            sha256: f.sha256,
            createdAt: f.createdAt.toISOString(),
          })),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    await Promise.all(
      storedKeys.map((k) => storageProvider.delete(k).catch(() => {}))
    );
    console.error("Error publishing new version:", err);
    return NextResponse.json(
      { error: "Failed to publish new version." },
      { status: 500 }
    );
  }
}
