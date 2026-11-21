import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeDataset } from "@/lib/serialize";

export async function POST(
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

  let body: { reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reason = (body.reason ?? "").trim();
  if (reason.length < 10) {
    return NextResponse.json(
      {
        error:
          "Please provide a clear reason for deletion (at least 10 characters).",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.dataset.update({
    where: { id: existing.id },
    data: {
      deletionRequested: true,
      deletionReason: reason,
      deletionRequestedAt: new Date(),
    },
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
