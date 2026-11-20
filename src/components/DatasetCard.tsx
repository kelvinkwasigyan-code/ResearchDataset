import Link from "next/link";
import { Download, Eye, FileText, HardDrive, Lock, Tag } from "lucide-react";
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
    <article className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
      <div>
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/datasets/${dataset.slug}`}
            className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1"
          >
            {dataset.title}
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            {dataset.visibility === "PRIVATE" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <Lock className="h-3 w-3" />
                Private
              </span>
            )}
            {latestVersion && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                v{latestVersion.versionNumber}
              </span>
            )}
          </div>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          By{" "}
          <span className="font-medium text-slate-700">
            {authors.length > 0 ? authors.join(", ") : dataset.owner?.name ?? "Unknown"}
          </span>{" "}
          · Updated {formatDate(dataset.updatedAt)}
        </p>

        <p className="mt-3 text-sm text-slate-600 line-clamp-2">
          {dataset.summary}
        </p>

        {dataset.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {dataset.tags.slice(0, 5).map((tag) => (
              <Link
                key={tag}
                href={`/?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {dataset.license}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
          <span className="inline-flex items-center gap-1">
            <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            {formatBytes(totalBytes)}
          </span>
        </div>

        <div className="flex items-center gap-3">
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
