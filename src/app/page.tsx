import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CheckCircle2, Database, Layers, Plus, ShieldCheck } from "lucide-react";
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
    where.OR = [
      { visibility: "PUBLIC", status: "APPROVED" },
      { ownerId: session.userId },
    ];
  } else {
    where.visibility = "PUBLIC";
    where.status = "APPROVED";
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
    <div>
      {/* Hero band with darkened research desk photo & crisp white typography */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-slate-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-research.jpg')" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-900/45 to-slate-900/35"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)] sm:text-4xl">
                {mine ? "My Research Datasets" : "Discover Research Data"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] sm:mt-2.5 sm:text-[15px]">
                Just Research is an open academic repository for finding,
                publishing, and sharing verified research datasets. It helps
                students, researchers, and institutions preserve their data and
                cite it with confidence.
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-1.5 sm:mt-4 sm:gap-2 text-[11px] sm:text-xs font-medium text-white">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 sm:px-3 backdrop-blur-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-300" />
                  SHA-256 Verified
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 sm:px-3 backdrop-blur-sm">
                  <Layers className="h-3.5 w-3.5 text-indigo-300" />
                  Immutable Versioning
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 sm:px-3 backdrop-blur-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  Mendeley Data Import
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={session ? "/datasets/new" : "/auth/login"}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all"
              >
                <Plus className="h-4 w-4" />
                Publish Dataset
              </Link>
            </div>
          </div>

          <div className="mt-5 sm:mt-7">
            <SearchBarAndSort initialQuery={q} initialSort={sort} />
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
          <div>
            <SearchFilters
              availableTags={availableTags}
              initialTag={tag}
              initialExt={ext}
              initialLicense={license}
              initialMine={mine}
            />
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
              <span className="tabular-nums">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {datasets.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">{total}</span>{" "}
                {total === 1 ? "dataset" : "datasets"}
              </span>
              {(q || tag || ext || license || mine) && (
                <Link
                  href="/"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                >
                  Clear filters
                </Link>
              )}
            </div>

            {datasets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Database className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-900">
                  No matching datasets
                </h2>
                <p className="mt-1 max-w-sm text-sm text-slate-600">
                  Try broadening your search or clearing active filters, or
                  publish a new dataset to the repository.
                </p>
                <Link
                  href={session ? "/datasets/new" : "/auth/register"}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Publish Dataset
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-3.5">
                  {datasets.map((dataset) => (
                    <DatasetCard key={dataset.id} dataset={dataset} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    {page > 1 && (
                      <Link
                        href={buildPageHref(page - 1)}
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        Previous
                      </Link>
                    )}
                    <span className="px-3 text-xs font-medium text-slate-500 tabular-nums">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                      <Link
                        href={buildPageHref(page + 1)}
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
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
    </div>
  );
}
