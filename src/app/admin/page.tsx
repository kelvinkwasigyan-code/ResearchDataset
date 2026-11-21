import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeDataset } from "@/lib/serialize";
import { AdminPortalClient } from "@/components/AdminPortalClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }
  if (!session.isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Administrator Access Required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account does not have administrator privileges to review
            datasets or manage deletion requests.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Return to Explore
          </Link>
        </div>
      </div>
    );
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600">
            <ShieldCheck className="h-4 w-4" />
            <span>Editorial Administration</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Admin Review Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review submitted datasets before publishing and process researcher
            deletion requests.
          </p>
        </div>
      </div>

      <AdminPortalClient initialDatasets={datasets.map(serializeDataset)} />
    </div>
  );
}
