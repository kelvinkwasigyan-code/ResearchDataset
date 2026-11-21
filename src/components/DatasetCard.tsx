import Link from "next/link";
import { Download, Eye, FileText, HardDrive, Lock } from "lucide-react";
import { formatBytes, formatDate, parseAuthors } from "@/lib/format";
import type { SerializedDataset } from "@/lib/serialize";

interface DatasetCardProps {
  dataset: SerializedDataset;
}

export function DatasetCard({ dataset }: DatasetCardProps) {
  const latestVersion = dataset.versions[0];
  const fileCount = latestVersion?.files.length ?? 0;
  const totalBytes = latestVersion?.totalBytes ?? 0;
  const authors = parseAuthors(dataset.authors);
  const authorDisplay =
    authors.length > 0
      ? authors.join(", ")
      : dataset.owner?.name ?? "Unknown";

  return (
    <article className="group rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-1 hover:scale-[1.005]">
      {/* Top scholarly metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
            Dataset
          </span>
          {latestVersion && (
            <span className="font-medium text-slate-700 tabular-nums">
              Version {latestVersion.versionNumber}
            </span>
          )}
          <span className="text-slate-300">·</span>
          <span>Published {formatDate(dataset.updatedAt)}</span>
          {dataset.visibility === "PRIVATE" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
              <Lock className="h-3 w-3" />
              Private
            </span>
          )}
          {dataset.status === "PENDING" && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
              Pending Review
            </span>
          )}
          {dataset.status === "REJECTED" && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
              Rejected
            </span>
          )}
          {dataset.deletionRequested && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
              Deletion Requested
            </span>
          )}
        </div>

        <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
          {dataset.license}
        </span>
      </div>

      {/* Title */}
      <h2 className="mt-2.5">
        <Link
          href={`/datasets/${dataset.slug}`}
          className="text-base sm:text-lg font-semibold leading-snug tracking-tight text-blue-600 group-hover:text-black transition-colors"
        >
          {dataset.title}
        </Link>
      </h2>

      {/* Authors */}
      <p className="mt-1 text-xs font-medium text-slate-600">{authorDisplay}</p>

      {/* Abstract / Summary */}
      <p className="mt-2.5 text-sm leading-relaxed text-slate-600 line-clamp-2">
        {dataset.summary}
      </p>

      {/* Subject Chips */}
      {dataset.tags.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {dataset.tags.slice(0, 6).map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 capitalize hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Bottom academic stats strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 text-xs text-slate-500 tabular-nums">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            {formatBytes(totalBytes)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1" title="Views">
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            {dataset.viewCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1" title="Downloads">
            <Download className="h-3.5 w-3.5 text-slate-400" />
            {dataset.downloadCount.toLocaleString()}
          </span>
        </div>
      </div>
    </article>
  );
}
