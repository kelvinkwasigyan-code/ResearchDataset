import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Database, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeDataset } from "@/lib/serialize";
import { DatasetCard } from "@/components/DatasetCard";
import { SearchBarAndSort, SearchFilters } from "@/components/SearchFilters";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
    tag?: string;
    ext?: string;
    license?: string;
    sort?: string;
    mine?: string;
    page?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const tag = (params.tag ?? "").trim().toLowerCase();
  const ext = (params.ext ?? "").trim().toLowerCase();
  const license = (params.license ?? "").trim();
  const sort = (params.sort ?? "newest").trim();
  const mine = params.mine === "true";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 12;

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
              tag: { name: { contains: q.toLowerCase() } },
            },
          },
        },
      ],
    });
  }
  if (tag) {
    andConditions.push({
      tags: { some: { tag: { name: tag } } },
    });
  }
  if (ext) {
    andConditions.push({
      versions: { some: { files: { some: { extension: ext } } } },
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

  const [total, rawDatasets, rawTags] = await Promise.all([
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
    prisma.tag.findMany({
      include: {
        _count: { select: { datasets: true } },
      },
      orderBy: {
        datasets: { _count: "desc" },
      },
      take: 20,
    }),
  ]);

  const datasets = rawDatasets.map(serializeDataset);
  const availableTags = rawTags
    .filter((t) => t._count.datasets > 0)
    .map((t) => ({ name: t.name, count: t._count.datasets }));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildPageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (tag) sp.set("tag", tag);
    if (ext) sp.set("ext", ext);
    if (license) sp.set("license", license);
    if (sort && sort !== "newest") sp.set("sort", sort);
    if (mine) sp.set("mine", "true");
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <div className="mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {mine ? "My Datasets" : "Explore Research Datasets"}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
              Versioned, checksum-verified datasets with instant in-browser
              previews for CSV, JSON, Markdown, and images, plus one-click APA &
              BibTeX citations.
            </p>
          </div>
          <Link
            href={session ? "/datasets/new" : "/auth/login"}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Publish Dataset
          </Link>
        </div>

        <div className="mt-6">
          <SearchBarAndSort initialQuery={q} initialSort={sort} />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SearchFilters
            availableTags={availableTags}
            initialTag={tag}
            initialExt={ext}
            initialLicense={license}
            initialMine={mine}
          />
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {datasets.length}
              </span>{" "}
              of <span className="font-semibold text-slate-900">{total}</span>{" "}
              {total === 1 ? "dataset" : "datasets"}
            </span>
            {(q || tag || ext || license || mine) && (
              <Link
                href="/"
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>

          {datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Database className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900">
                No datasets found
              </h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Try adjusting your search or filters, or publish a new dataset
                to the repository.
              </p>
              <Link
                href={session ? "/datasets/new" : "/auth/register"}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Upload Dataset
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {datasets.map((dataset) => (
                  <DatasetCard key={dataset.id} dataset={dataset} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link
                      href={buildPageHref(page - 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Previous
                    </Link>
                  )}
                  <span className="px-3 text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={buildPageHref(page + 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
