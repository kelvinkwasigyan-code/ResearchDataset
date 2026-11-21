import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { storageProvider } from "@/lib/storage/local";
import { serializeDataset } from "@/lib/serialize";
import { sendDeletionDecisionEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await context.params;

  let body: { action?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "decline") {
    return NextResponse.json(
      { error: 'Action must be "approve" or "decline".' },
      { status: 400 }
    );
  }

  const note = (body.note ?? "").trim() || null;

  const existing = await prisma.dataset.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      versions: { include: { files: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  if (body.action === "approve") {
    const keysToDelete = existing.versions.flatMap((v) =>
      v.files.map((f) => f.storageKey)
    );

    await prisma.dataset.delete({ where: { id: existing.id } });
    await Promise.all(
      keysToDelete.map((key) => storageProvider.delete(key).catch(() => {}))
    );

    const emailResult = await sendDeletionDecisionEmail({
      to: existing.owner.email,
      ownerName: existing.owner.name,
      datasetTitle: existing.title,
      approved: true,
      adminNote: note,
    });

    return NextResponse.json({ deleted: true, id: existing.id, emailResult });
  }

  // Decline deletion request
  const updated = await prisma.dataset.update({
    where: { id: existing.id },
    data: {
      deletionRequested: false,
      deletionReason: null,
      deletionRequestedAt: null,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, institution: true },
      },
      tags: { include: { tag: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { files: { orderBy: { originalName: "asc" } } },
      },
    },
  });

  const emailResult = await sendDeletionDecisionEmail({
    to: existing.owner.email,
    ownerName: existing.owner.name,
    datasetTitle: existing.title,
    approved: false,
    adminNote: note,
  });

  return NextResponse.json({
    deleted: false,
    dataset: serializeDataset(updated),
    emailResult,
  });
}
