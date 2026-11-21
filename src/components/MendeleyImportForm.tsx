"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  CheckSquare,
  CloudDownload,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Square,
} from "lucide-react";
import { formatBytes } from "@/lib/format";
import type { MendeleyDatasetInfo } from "@/lib/mendeley";

export function MendeleyImportForm() {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MendeleyDatasetInfo | null>(null);

  // Editable overrides before import
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPreview(null);

    if (!source.trim()) {
      setError("Paste a Mendeley Data URL, DOI, or dataset ID.");
      return;
    }

    setFetching(true);
    try {
      const res = await fetch(
        `/api/datasets/import/mendeley?source=${encodeURIComponent(source.trim())}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.preview) {
        setError(data.error || "Could not fetch dataset from Mendeley Data.");
        return;
      }

      const info = data.preview as MendeleyDatasetInfo;
      setPreview(info);
      setTitle(info.title);
      setSummary(info.summary);
      setTags(info.tags.join(", "));
      setSelectedIds(new Set(info.files.map((f) => f.id)));
    } catch {
      setError("Network error while contacting Mendeley Data.");
    } finally {
      setFetching(false);
    }
  }

  function toggleFile(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!preview) return;
    if (selectedIds.size === preview.files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(preview.files.map((f) => f.id)));
    }
  }

  async function handleImport() {
    if (!preview) return;
    setError(null);

    if (selectedIds.size === 0) {
      setError("Select at least one file to import.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/datasets/import/mendeley", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: source.trim(),
          title: title.trim() || preview.title,
          summary: summary.trim() || preview.summary,
          tags: tags.trim(),
          visibility,
          selectedFileIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.dataset?.slug) {
        setError(data.error || "Failed to import dataset.");
        return;
      }

      router.push(`/datasets/${data.dataset.slug}`);
      router.refresh();
    } catch {
      setError("Network error during import.");
    } finally {
      setImporting(false);
    }
  }

  const selectedFiles =
    preview?.files.filter((f) => selectedIds.has(f.id)) ?? [];
  const selectedTotalBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Import Public Dataset from Mendeley Data
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Paste any public Mendeley Data URL, DOI, or dataset ID. Files are
          downloaded into local storage with SHA-256 verification (up to 50
          files / 100 MB per import).
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleFetch} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={fetching || importing}
          placeholder="https://data.mendeley.com/datasets/abc123xyz/1 or 10.17632/abc123xyz.1"
          className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="submit"
          disabled={fetching || importing}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {fetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Fetch Dataset
            </>
          )}
        </button>
      </form>

      {preview && (
        <div className="space-y-5 border-t border-slate-200 pt-5">
          {/* Source Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-900">
            <div>
              <span className="font-semibold">Found on Mendeley Data:</span>{" "}
              <span className="font-mono">{preview.datasetId}</span> (v
              {preview.version}) · License:{" "}
              <span className="font-semibold">{preview.license}</span>
              {preview.doi && <> · DOI: {preview.doi}</>}
            </div>
            <a
              href={preview.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline"
            >
              View original
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Editable metadata */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="mendeley-title"
                className="block text-sm font-medium text-slate-800"
              >
                Title
              </label>
              <input
                id="mendeley-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={importing}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="mendeley-summary"
                className="block text-sm font-medium text-slate-800"
              >
                Summary
              </label>
              <input
                id="mendeley-summary"
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={importing}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="mendeley-tags"
                  className="block text-sm font-medium text-slate-800"
                >
                  Tags{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (comma-separated)
                  </span>
                </label>
                <input
                  id="mendeley-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={importing}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-800">
                  Visibility
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => setVisibility("PUBLIC")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      visibility === "PUBLIC"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => setVisibility("PRIVATE")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      visibility === "PRIVATE"
                        ? "border-amber-600 bg-amber-50 text-amber-800"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* File checklist */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
              <button
                type="button"
                onClick={toggleAll}
                disabled={importing}
                className="font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                {selectedIds.size === preview.files.length
                  ? "Deselect all"
                  : "Select all"}{" "}
                ({selectedIds.size}/{preview.files.length} files)
              </button>
              <span className="font-medium">
                Selected size: {formatBytes(selectedTotalBytes)}
              </span>
            </div>

            {preview.files.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                No downloadable root-level files were returned for this dataset.
              </div>
            ) : (
              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {preview.files.map((file) => {
                  const checked = selectedIds.has(file.id);
                  return (
                    <li
                      key={file.id}
                      onClick={() => !importing && toggleFile(file.id)}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {checked ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate font-medium text-slate-800">
                          {file.filename}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatBytes(file.size)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={importing || selectedIds.size === 0}
              onClick={handleImport}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading &amp; Importing...
                </>
              ) : (
                <>
                  <CloudDownload className="h-4 w-4" />
                  Import into Just Research ({selectedIds.size}{" "}
                  {selectedIds.size === 1 ? "file" : "files"})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
