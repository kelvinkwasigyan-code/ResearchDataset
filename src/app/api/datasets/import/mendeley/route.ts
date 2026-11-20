import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildStorageKey, storageProvider } from "@/lib/storage/local";
import { getExtension, slugify } from "@/lib/format";
import { serializeDataset } from "@/lib/serialize";
import {
  fetchMendeleyDataset,
  isAllowedMendeleyDownloadUrl,
  MENDELEY_MAX_FILE_BYTES,
  MENDELEY_MAX_FILES,
  MENDELEY_MAX_TOTAL_BYTES,
  parseMendeleyInput,
} from "@/lib/mendeley";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in to import datasets from Mendeley Data." },
      { status: 401 }
    );
  }

  const source = req.nextUrl.searchParams.get("source") ?? "";
  const parsed = parseMendeleyInput(source);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Enter a valid Mendeley Data URL (e.g. https://data.mendeley.com/datasets/<id>/1), DOI (10.17632/<id>), or dataset ID.",
      },
      { status: 400 }
    );
  }

  try {
    const preview = await fetchMendeleyDataset(
      parsed.datasetId,
      parsed.version
    );
    return NextResponse.json({
      preview,
      limits: {
        maxFiles: MENDELEY_MAX_FILES,
        maxFileBytes: MENDELEY_MAX_FILE_BYTES,
        maxTotalBytes: MENDELEY_MAX_TOTAL_BYTES,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch dataset metadata from Mendeley Data.",
      },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in to import datasets from Mendeley Data." },
      { status: 401 }
    );
  }

  let body: {
    source?: string;
    visibility?: string;
    title?: string;
    summary?: string;
    tags?: string;
    selectedFileIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseMendeleyInput(body.source ?? "");
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid Mendeley Data URL, DOI, or dataset ID." },
      { status: 400 }
    );
  }

  let info;
  try {
    info = await fetchMendeleyDataset(parsed.datasetId, parsed.version);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch dataset metadata from Mendeley Data.",
      },
      { status: 400 }
    );
  }

  const selectedSet =
    Array.isArray(body.selectedFileIds) && body.selectedFileIds.length > 0
      ? new Set(body.selectedFileIds)
      : null;

  const filesToImport = selectedSet
    ? info.files.filter((f) => selectedSet.has(f.id))
    : info.files;

  if (filesToImport.length === 0) {
    return NextResponse.json(
      { error: "No downloadable files were selected or found in this dataset." },
      { status: 400 }
    );
  }

  if (filesToImport.length > MENDELEY_MAX_FILES) {
    return NextResponse.json(
      {
        error: `Too many files selected (${filesToImport.length}). Maximum allowed per import is ${MENDELEY_MAX_FILES}.`,
      },
      { status: 400 }
    );
  }

  const estimatedBytes = filesToImport.reduce((sum, f) => sum + f.size, 0);
  if (estimatedBytes > MENDELEY_MAX_TOTAL_BYTES) {
    return NextResponse.json(
      {
        error: `Selected files exceed the 100 MB import limit. Deselect larger files and try again.`,
      },
      { status: 400 }
    );
  }

  for (const f of filesToImport) {
    if (f.size > MENDELEY_MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `File "${f.filename}" exceeds the 50 MB single-file import limit.`,
        },
        { status: 400 }
      );
    }
    if (!isAllowedMendeleyDownloadUrl(f.downloadUrl)) {
      return NextResponse.json(
        { error: `Untrusted download host for file "${f.filename}".` },
        { status: 400 }
      );
    }
  }

  const title = (body.title ?? "").trim() || info.title;
  const summary = (body.summary ?? "").trim() || info.summary;
  const visibility =
    body.visibility?.toUpperCase() === "PRIVATE" ? "PRIVATE" : "PUBLIC";

  const tagNames =
    typeof body.tags === "string" && body.tags.trim()
      ? Array.from(
          new Set(
            body.tags
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter((t) => t.length > 0 && t.length <= 40)
          )
        )
      : info.tags;

  const attributionLines = [
    "",
    "---",
    `**Imported from Mendeley Data**`,
    `- Source: [${info.sourceUrl}](${info.sourceUrl})`,
    ...(info.doi ? [`- Original DOI: \`${info.doi}\``] : []),
    `- Original Mendeley Version: v${info.version}`,
  ];
  const fullDescription = `${info.description}\n${attributionLines.join("\n")}`;

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.dataset.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const datasetId = crypto.randomUUID();
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

    for (const file of filesToImport) {
      const downloadRes = await fetch(file.downloadUrl, { cache: "no-store" });
      if (!downloadRes.ok) {
        throw new Error(
          `Failed to download "${file.filename}" (HTTP ${downloadRes.status}).`
        );
      }

      const arrayBuf = await downloadRes.arrayBuffer();
      if (arrayBuf.byteLength > MENDELEY_MAX_FILE_BYTES) {
        throw new Error(
          `File "${file.filename}" exceeded the 50 MB single-file limit during download.`
        );
      }

      totalBytes += arrayBuf.byteLength;
      if (totalBytes > MENDELEY_MAX_TOTAL_BYTES) {
        throw new Error(
          "Total downloaded size exceeded the 100 MB import limit."
        );
      }

      const fileId = crypto.randomUUID();
      const key = buildStorageKey(datasetId, 1, fileId, file.filename);
      const stored = await storageProvider.put(key, Buffer.from(arrayBuf));
      storedKeys.push(stored.storageKey);

      preparedFiles.push({
        id: fileId,
        originalName: file.filename,
        storageKey: stored.storageKey,
        mimeType: file.mimeType || "application/octet-stream",
        extension: getExtension(file.filename),
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
      });
    }

    const created = await prisma.dataset.create({
      data: {
        id: datasetId,
        slug,
        title,
        summary,
        description: fullDescription,
        authors: info.authors || session.name,
        license: info.license,
        visibility,
        ownerId: session.userId,
        tags: {
          create: tagNames.map((name) => ({
            tag: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
        versions: {
          create: {
            versionNumber: 1,
            changelog: `Imported from Mendeley Data (${info.datasetId}, v${info.version})`,
            totalBytes: BigInt(totalBytes),
            files: {
              create: preparedFiles,
            },
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        versions: { include: { files: true } },
      },
    });

    return NextResponse.json(
      { dataset: serializeDataset(created) },
      { status: 201 }
    );
  } catch (err) {
    await Promise.all(
      storedKeys.map((k) => storageProvider.delete(k).catch(() => {}))
    );
    console.error("Mendeley import error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to import dataset from Mendeley Data.",
      },
      { status: 500 }
    );
  }
}
