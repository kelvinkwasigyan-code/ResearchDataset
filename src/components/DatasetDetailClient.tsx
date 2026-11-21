"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import {
  AlertTriangle,
  Clock,
  Download,
  Eye,
  Globe,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
  XCircle,
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionError, setDeletionError] = useState<string | null>(null);
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

  async function handleRequestDeletion(e: React.FormEvent) {
    e.preventDefault();
    setDeletionError(null);

    if (deletionReason.trim().length < 10) {
      setDeletionError(
        "Please state a clear reason for deletion (at least 10 characters)."
      );
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/datasets/${dataset.slug}/deletion-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deletionReason.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setDeletionError(data?.error || "Failed to submit deletion request.");
        return;
      }
      if (data?.dataset) {
        setDataset(data.dataset);
      }
      setDeleteModalOpen(false);
      setDeletionReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Review / Deletion Status Banners */}
      {dataset.status === "PENDING" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Pending Administrator Review</p>
            <p className="mt-0.5 text-xs text-amber-800">
              This dataset is currently hidden from the public catalog until an
              administrator approves it. You will receive an email notification
              once it is approved and published.
            </p>
          </div>
        </div>
      )}

      {dataset.status === "REJECTED" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Not Approved for Publication</p>
            {dataset.reviewNote && (
              <p className="mt-0.5 text-xs text-red-800">
                Reviewer feedback: {dataset.reviewNote}
              </p>
            )}
          </div>
        </div>
      )}

      {dataset.deletionRequested && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3.5 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">
              Deletion Request Submitted (Awaiting Admin Approval)
            </p>
            <p className="mt-0.5 text-xs text-red-800">
              Stated reason: {dataset.deletionReason}
            </p>
          </div>
        </div>
      )}
      {/* Header Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-indigo-600 to-teal-500" />
        <div className="p-4 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
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
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 capitalize hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
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
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all"
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
                  disabled={busy || dataset.deletionRequested}
                  onClick={() => {
                    setDeletionError(null);
                    setDeleteModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
                  title={
                    dataset.deletionRequested
                      ? "Deletion request already pending"
                      : "Request dataset deletion"
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {dataset.deletionRequested
                      ? "Deletion Requested"
                      : "Request Deletion"}
                  </span>
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

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
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

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
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

      {/* Request Deletion Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Request Dataset Deletion
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  To preserve research integrity, datasets cannot be deleted
                  directly. State your reason below for administrator review.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRequestDeletion} className="mt-4 space-y-4">
              {deletionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {deletionError}
                </div>
              )}

              <div>
                <label
                  htmlFor="deletion-reason"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Reason for deletion <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="deletion-reason"
                  rows={4}
                  required
                  minLength={10}
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="e.g., Dataset contains accidental sensitive participant identifiers / superseded by a corrected study..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {busy ? "Submitting..." : "Submit Deletion Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
