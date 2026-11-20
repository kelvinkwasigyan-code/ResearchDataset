"use client";

import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
import { LICENSE_OPTIONS } from "@/lib/format";
import type { SerializedDataset } from "@/lib/serialize";

interface EditMetadataModalProps {
  dataset: SerializedDataset;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: SerializedDataset) => void;
}

export function EditMetadataModal({
  dataset,
  open,
  onClose,
  onSaved,
}: EditMetadataModalProps) {
  const [title, setTitle] = useState(dataset.title);
  const [summary, setSummary] = useState(dataset.summary);
  const [description, setDescription] = useState(dataset.description);
  const [authors, setAuthors] = useState(dataset.authors);
  const [tags, setTags] = useState(dataset.tags.join(", "));
  const [license, setLicense] = useState(dataset.license);
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(
    dataset.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC"
  );
  const [descTab, setDescTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(dataset.title);
    setSummary(dataset.summary);
    setDescription(dataset.description);
    setAuthors(dataset.authors);
    setTags(dataset.tags.join(", "));
    setLicense(dataset.license);
    setVisibility(dataset.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC");
    setDescTab("write");
    setError(null);
  }, [open, dataset]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  const previewHtml = useMemo(() => {
    if (descTab !== "preview" || typeof window === "undefined") return "";
    const raw = marked.parse(description || "*No description provided.*", {
      async: false,
    }) as string;
    return DOMPurify.sanitize(raw);
  }, [descTab, description]);

  const parsedTags = useMemo(
    () =>
      Array.from(
        new Set(
          tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        )
      ),
    [tags]
  );

  if (!open) return null;

  const isPresetLicense = (LICENSE_OPTIONS as readonly string[]).includes(
    license
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !summary.trim()) {
      setError("Title and summary are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/datasets/${dataset.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          description: description.trim(),
          authors: authors.trim(),
          tags: parsedTags,
          license: license.trim() || "CC-BY-4.0",
          visibility,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.dataset) {
        setError(data.error || "Failed to update dataset metadata.");
        return;
      }

      onSaved(data.dataset as SerializedDataset);
      onClose();
    } catch {
      setError("Network error while saving changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={() => !saving && onClose()}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Edit Dataset Metadata
            </h2>
            <p className="text-xs text-slate-500">
              Update title, summary, description, tags, license, or visibility.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="edit-title"
              className="block text-sm font-medium text-slate-800"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="edit-summary"
              className="block text-sm font-medium text-slate-800"
            >
              Summary <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-summary"
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit-description"
                className="block text-sm font-medium text-slate-800"
              >
                Description{" "}
                <span className="text-xs font-normal text-slate-500">
                  (Markdown)
                </span>
              </label>
              <div className="flex items-center rounded-md bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDescTab("write")}
                  className={`rounded px-2.5 py-0.5 transition-colors cursor-pointer ${
                    descTab === "write"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setDescTab("preview")}
                  className={`rounded px-2.5 py-0.5 transition-colors cursor-pointer ${
                    descTab === "preview"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {descTab === "write" ? (
              <textarea
                id="edit-description"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            ) : (
              <div
                className="markdown-body mt-1.5 min-h-[156px] rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-800"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-authors"
                className="block text-sm font-medium text-slate-800"
              >
                Authors{" "}
                <span className="text-xs font-normal text-slate-500">
                  (comma-separated)
                </span>
              </label>
              <input
                id="edit-authors"
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="edit-tags"
                className="block text-sm font-medium text-slate-800"
              >
                Tags{" "}
                <span className="text-xs font-normal text-slate-500">
                  (comma-separated)
                </span>
              </label>
              <input
                id="edit-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="climate, csv, benchmark"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {parsedTags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {parsedTags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-license"
                className="block text-sm font-medium text-slate-800"
              >
                License
              </label>
              <select
                id="edit-license"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {!isPresetLicense && (
                  <option value={license}>{license}</option>
                )}
                {LICENSE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-800">
                Visibility
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
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

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
