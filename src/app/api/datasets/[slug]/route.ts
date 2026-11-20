import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { storageProvider } from "@/lib/storage/local";
import { serializeDataset } from "@/lib/serialize";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const session = await getSession();

  const dataset = await prisma.dataset.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
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

  const updated = await prisma.dataset.update({
    where: { id: dataset.id },
    data: { viewCount: { increment: 1 } },
    include: {
      owner: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { files: { orderBy: { originalName: "asc" } } },
      },
    },
  });

  return NextResponse.json({ dataset: serializeDataset(updated) });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.dataset.findUnique({ where: { slug } });
  if (!existing) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  if (existing.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    summary?: string;
    description?: string;
    authors?: string;
    license?: string;
    visibility?: string;
    tags?: string[] | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updateData: {
    title?: string;
    summary?: string;
    description?: string;
    authors?: string;
    license?: string;
    visibility?: string;
  } = {};

  if (typeof body.title === "string" && body.title.trim()) {
    updateData.title = body.title.trim();
  }
  if (typeof body.summary === "string" && body.summary.trim()) {
    updateData.summary = body.summary.trim();
  }
  if (typeof body.description === "string") {
    updateData.description = body.description.trim();
  }
  if (typeof body.authors === "string" && body.authors.trim()) {
    updateData.authors = body.authors.trim();
  }
  if (typeof body.license === "string" && body.license.trim()) {
    updateData.license = body.license.trim();
  }
  if (body.visibility === "PUBLIC" || body.visibility === "PRIVATE") {
    updateData.visibility = body.visibility;
  }

  const tagList =
    body.tags !== undefined
      ? Array.from(
          new Set(
            (Array.isArray(body.tags) ? body.tags : body.tags.split(","))
              .map((t) => t.trim().toLowerCase())
              .filter((t) => t.length > 0 && t.length <= 40)
          )
        )
      : undefined;

  const updated = await prisma.dataset.update({
    where: { id: existing.id },
    data: {
      ...updateData,
      ...(tagList !== undefined
        ? {
            tags: {
              deleteMany: {},
              create: tagList.map((name) => ({
                tag: {
                  connectOrCreate: {
                    where: { name },
                    create: { name },
                  },
                },
              })),
            },
          }
        : {}),
    },
    include: {
      owner: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { files: true },
      },
    },
  });

  return NextResponse.json({ dataset: serializeDataset(updated) });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.dataset.findUnique({
    where: { slug },
    include: {
      versions: {
        include: { files: true },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  if (existing.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keysToDelete = existing.versions.flatMap((v) =>
    v.files.map((f) => f.storageKey)
  );

  await prisma.dataset.delete({ where: { id: existing.id } });
  await Promise.all(
    keysToDelete.map((key) => storageProvider.delete(key).catch(() => {}))
  );

  return NextResponse.json({ ok: true });
}
