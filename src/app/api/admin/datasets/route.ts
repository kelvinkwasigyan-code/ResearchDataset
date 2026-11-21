import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeDataset } from "@/lib/serialize";

export async function GET() {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const datasets = await prisma.dataset.findMany({
    orderBy: { createdAt: "desc" },
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

  const serialized = datasets.map(serializeDataset);

  return NextResponse.json({
    datasets: serialized,
    counts: {
      pending: serialized.filter((d) => d.status === "PENDING").length,
      deletionRequests: serialized.filter((d) => d.deletionRequested).length,
      approved: serialized.filter((d) => d.status === "APPROVED").length,
      rejected: serialized.filter((d) => d.status === "REJECTED").length,
    },
  });
}
