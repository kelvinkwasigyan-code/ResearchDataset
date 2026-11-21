import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeDataset } from "@/lib/serialize";
import {
  sendDatasetApprovedEmail,
  sendDatasetRejectedEmail,
} from "@/lib/email";

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

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { error: 'Action must be "approve" or "reject".' },
      { status: 400 }
    );
  }

  const note = (body.note ?? "").trim() || null;

  const existing = await prisma.dataset.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  const nextStatus = body.action === "approve" ? "APPROVED" : "REJECTED";

  const updated = await prisma.dataset.update({
    where: { id: existing.id },
    data: {
      status: nextStatus,
      reviewNote: note,
      reviewedAt: new Date(),
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

  const emailResult =
    nextStatus === "APPROVED"
      ? await sendDatasetApprovedEmail({
          to: existing.owner.email,
          ownerName: existing.owner.name,
          datasetTitle: existing.title,
          datasetSlug: existing.slug,
          reviewNote: note,
        })
      : await sendDatasetRejectedEmail({
          to: existing.owner.email,
          ownerName: existing.owner.name,
          datasetTitle: existing.title,
          datasetSlug: existing.slug,
          reviewNote: note,
        });

  return NextResponse.json({
    dataset: serializeDataset(updated),
    emailResult,
  });
}
