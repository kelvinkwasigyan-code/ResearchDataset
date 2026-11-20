"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import {
  Download,
  Eye,
  Globe,
  Lock,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { formatDate, parseAuthors } from "@/lib/format";
import type { SerializedDataset, SerializedFile } from "@/lib/serialize";
import { VersionSelector } from "./VersionSelector";
import { CitationBox } from "./CitationBox";
import { FilePreviewModal } from "./FilePreviewModal";
import { EditMetadataModal } from "./EditMetadataModal";

interface DatasetDetailClientProps {
  dataset: SerializedDataset;
  isOwner: boolean;
}

export function DatasetDetailClient({
  dataset: initialDataset,
  isOwner,
}: DatasetDetailClientProps) {
  const router = useRouter();
  const [dataset, setDataset] = useState(initialDataset);
  const latestVersion = dataset.versions[0];
  const [selectedVersionNumber, setSelectedVersionNumber] = useState(
    latestVersion?.versionNumber ?? 1
  );
  const [previewFile, setPreviewFile] = useState<SerializedFile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const visibility = dataset.visibility;

  const selectedVersion =
    dataset.versions.find((v) => v.versionNumber === selectedVersionNumber) ??
    latestVersion;

  const authors = parseAuthors(dataset.authors);

  const renderedDescription = useMemo(() => {
    const rawHtml = marked.parse(dataset.description || dataset.summary, {
      async: false,
    }) as string;
    if (typeof window === "undefined") {
      return "";
    }
    return DOMPurify.sanitize(rawHtml);
  }, [dataset.description, dataset.summary]);

  async function toggleVisibility() {
    setBusy(true);
    const next = visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    try {
      const res = await fetch(`/api/datasets/${dataset.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.dataset) {
          setDataset(data.dataset);
        } else {
          setDataset((prev) => ({ ...prev, visibility: next }));
        }
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${dataset.title}" and all of its stored files? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/datasets/${dataset.slug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="h-1 bg-gradient-to-r from-slate-900 via-indigo-600 to-indigo-400" />
        <div className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                {dataset.license}
              </span>
              {visibility === "PRIVATE" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <Globe className="h-3 w-3" />
                  Public
                </span>
              )}
              {latestVersion && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  Latest: v{latestVersion.versionNumber}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {dataset.title}
            </h1>

            <p className="text-base text-slate-600">{dataset.summary}</p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-700">
                  {authors.length > 0
                    ? authors.join(", ")
                    : dataset.owner?.name ?? "Unknown"}
                </span>
              </span>
              <span>Created {formatDate(dataset.createdAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-4 w-4 text-slate-400" />
                {dataset.viewCount.toLocaleString()} views
              </span>
              <span className="inline-flex items-center gap-1">
                <Download className="h-4 w-4 text-slate-400" />
                {dataset.downloadCount.toLocaleString()} downloads
              </span>
            </div>

            {dataset.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                {dataset.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {latestVersion && (
              <a
                href={`/api/datasets/${dataset.slug}/versions/${selectedVersion?.versionNumber ?? latestVersion.versionNumber}/download`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all"
              >
                <Download className="h-4 w-4" />
                Download All (.zip)
              </a>
            )}
            {isOwner && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <Link
                  href={`/datasets/${dataset.slug}/new-version`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Version
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggleVisibility}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {visibility === "PUBLIC" ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4" />
                      Make Public
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
                  title="Delete dataset"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <VersionSelector
            slug={dataset.slug}
            versions={dataset.versions}
            selectedVersionNumber={selectedVersionNumber}
            onSelectVersion={setSelectedVersionNumber}
            onPreviewFile={setPreviewFile}
          />

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900">
              Dataset Description
            </h2>
            {renderedDescription ? (
              <div
                className="markdown-body mt-4 text-sm text-slate-700"
                dangerouslySetInnerHTML={{ __html: renderedDescription }}
              />
            ) : (
              <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
                {dataset.description || dataset.summary}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {selectedVersion && (
            <CitationBox
              title={dataset.title}
              slug={dataset.slug}
              authors={dataset.authors}
              versionNumber={selectedVersion.versionNumber}
              publishedAt={selectedVersion.publishedAt}
            />
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Repository Metadata
            </h2>
            <dl className="divide-y divide-slate-100 text-xs">
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Slug</dt>
                <dd className="font-mono text-slate-800">{dataset.slug}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Maintainer</dt>
                <dd className="font-medium text-slate-800">
                  {dataset.owner?.name ?? "Unknown"}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">License</dt>
                <dd className="font-medium text-slate-800">{dataset.license}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Versions</dt>
                <dd className="font-medium text-slate-800">
                  {dataset.versions.length}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Last Updated</dt>
                <dd className="font-medium text-slate-800">
                  {formatDate(dataset.updatedAt)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <EditMetadataModal
        dataset={dataset}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setDataset(updated);
          router.refresh();
        }}
      />
    </div>
  );
}
