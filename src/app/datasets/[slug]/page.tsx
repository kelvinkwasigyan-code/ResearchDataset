import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeDataset } from "@/lib/serialize";
import { DatasetDetailClient } from "@/components/DatasetDetailClient";

export const dynamic = "force-dynamic";

interface DatasetDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DatasetDetailPage({
  params,
}: DatasetDetailPageProps) {
  const { slug } = await params;
  const session = await getSession();

  const existing = await prisma.dataset.findUnique({
    where: { slug },
    select: { id: true, visibility: true, ownerId: true },
  });

  if (!existing) {
    notFound();
  }

  if (existing.visibility !== "PUBLIC" && session?.userId !== existing.ownerId) {
    notFound();
  }

  const dataset = await prisma.dataset.update({
    where: { id: existing.id },
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

  const isOwner = session?.userId === dataset.ownerId;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all datasets
        </Link>
      </div>

      <DatasetDetailClient
        dataset={serializeDataset(dataset)}
        isOwner={isOwner}
      />
    </div>
  );
}
