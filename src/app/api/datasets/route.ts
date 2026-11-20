import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildStorageKey, storageProvider } from "@/lib/storage/local";
import { getExtension, slugify } from "@/lib/format";
import { serializeDataset } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const tag = (searchParams.get("tag") ?? "").trim().toLowerCase();
  const ext = (searchParams.get("ext") ?? "").trim().toLowerCase();
  const license = (searchParams.get("license") ?? "").trim();
  const sort = (searchParams.get("sort") ?? "newest").trim();
  const mine = searchParams.get("mine") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "12", 10) || 12)
  );

  const session = await getSession();

  const where: Prisma.DatasetWhereInput = {};

  if (mine && session) {
    where.ownerId = session.userId;
  } else if (session) {
    where.OR = [{ visibility: "PUBLIC" }, { ownerId: session.userId }];
  } else {
    where.visibility = "PUBLIC";
  }

  const andConditions: Prisma.DatasetWhereInput[] = [];

  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q } },
        { summary: { contains: q } },
        { description: { contains: q } },
        { authors: { contains: q } },
        {
          tags: {
            some: {
              tag: {
                name: { contains: q.toLowerCase() },
              },
            },
          },
        },
      ],
    });
  }

  if (tag) {
    andConditions.push({
      tags: {
        some: {
          tag: {
            name: tag,
          },
        },
      },
    });
  }

  if (ext) {
    andConditions.push({
      versions: {
        some: {
          files: {
            some: {
              extension: ext,
            },
          },
        },
      },
    });
  }

  if (license) {
    andConditions.push({ license });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  let orderBy: Prisma.DatasetOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "downloads") {
    orderBy = { downloadCount: "desc" };
  } else if (sort === "views") {
    orderBy = { viewCount: "desc" };
  }

  const [total, datasets] = await Promise.all([
    prisma.dataset.count({ where }),
    prisma.dataset.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: { files: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    datasets: datasets.map(serializeDataset),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required to create a dataset." },
      { status: 401 }
    );
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

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const authors = String(formData.get("authors") ?? "").trim() || session.name;
  const license = String(formData.get("license") ?? "CC-BY-4.0").trim() || "CC-BY-4.0";
  const visibilityRaw = String(formData.get("visibility") ?? "PUBLIC").toUpperCase();
  const visibility = visibilityRaw === "PRIVATE" ? "PRIVATE" : "PUBLIC";
  const changelog =
    String(formData.get("changelog") ?? "").trim() || "Initial release";
  const tagsRaw = String(formData.get("tags") ?? "");
  const tagNames = Array.from(
    new Set(
      tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40)
    )
  );

  const fileEntries = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!title || !summary) {
    return NextResponse.json(
      { error: "Title and summary are required." },
      { status: 400 }
    );
  }

  if (fileEntries.length === 0) {
    return NextResponse.json(
      { error: "At least one non-empty file is required." },
      { status: 400 }
    );
  }

  // Generate unique slug
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

    for (const file of fileEntries) {
      const fileId = crypto.randomUUID();
      const key = buildStorageKey(datasetId, 1, fileId, file.name);
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

    const created = await prisma.dataset.create({
      data: {
        id: datasetId,
        slug,
        title,
        summary,
        description: description || summary,
        authors,
        license,
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
            changelog,
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
    // Clean up any written files on failure
    await Promise.all(
      storedKeys.map((k) => storageProvider.delete(k).catch(() => {}))
    );
    console.error("Error creating dataset:", err);
    return NextResponse.json(
      { error: "Failed to create dataset." },
      { status: 500 }
    );
  }
}
