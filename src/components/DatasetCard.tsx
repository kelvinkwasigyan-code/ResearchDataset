import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  Eye,
  FileText,
  HardDrive,
  Lock,
} from "lucide-react";
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

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/85 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_25px_-10px_rgba(15,23,42,0.12)] transition-all duration-200">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {dataset.license}
            </span>
            {latestVersion && (
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/15 tabular-nums">
                v{latestVersion.versionNumber}
              </span>
            )}
            {dataset.visibility === "PRIVATE" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <Lock className="h-2.5 w-2.5" />
                Private
              </span>
            )}
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        <Link
          href={`/datasets/${dataset.slug}`}
          className="mt-3 block text-[17px] font-semibold leading-snug tracking-tight text-slate-950 group-hover:text-indigo-600 transition-colors line-clamp-2"
        >
          {dataset.title}
        </Link>

        <p className="mt-1.5 text-xs text-slate-500 truncate">
          <span className="font-medium text-slate-700">
            {authors.length > 0
              ? authors.join(", ")
              : dataset.owner?.name ?? "Unknown"}
          </span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span>{formatDate(dataset.updatedAt)}</span>
        </p>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-2">
          {dataset.summary}
        </p>

        {dataset.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {dataset.tags.slice(0, 4).map((tag) => (
              <Link
                key={tag}
                href={`/?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                #{tag}
              </Link>
            ))}
            {dataset.tags.length > 4 && (
              <span className="text-[11px] font-medium text-slate-400">
                +{dataset.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 text-xs text-slate-500 tabular-nums">
        <div className="flex items-center gap-3.5">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            {formatBytes(totalBytes)}
          </span>
        </div>

        <div className="flex items-center gap-3.5">
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
