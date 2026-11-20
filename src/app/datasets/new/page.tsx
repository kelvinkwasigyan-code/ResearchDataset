"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, CloudDownload, Loader2, Upload } from "lucide-react";
import { FileUploader } from "@/components/FileUploader";
import { MendeleyImportForm } from "@/components/MendeleyImportForm";
import { LICENSE_OPTIONS } from "@/lib/format";

export default function NewDatasetPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "mendeley">("upload");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [authors, setAuthors] = useState("");
  const [tags, setTags] = useState("");
  const [license, setLicense] = useState<string>("CC-BY-4.0");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [changelog, setChangelog] = useState("Initial release");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !summary.trim()) {
      setError("Title and summary are required.");
      return;
    }
    if (files.length === 0) {
      setError("Please select at least one file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("summary", summary.trim());
    formData.append("description", description.trim() || summary.trim());
    formData.append("authors", authors.trim());
    formData.append("tags", tags.trim());
    formData.append("license", license);
    formData.append("visibility", visibility);
    formData.append("changelog", changelog.trim() || "Initial release");
    for (const file of files) {
      formData.append("files", file);
    }

    setUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/datasets");

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.dataset?.slug) {
          router.push(`/datasets/${data.dataset.slug}`);
          router.refresh();
          return;
        }
        if (xhr.status === 401) {
          setError("Please sign in before publishing a dataset.");
          return;
        }
        setError(data.error || "Failed to create dataset.");
      } catch {
        setError("Unexpected response from server.");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setError("Network error while uploading files.");
    };

    xhr.send(formData);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to datasets
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          Publish New Dataset
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload your own files or import a public dataset directly from
          Mendeley Data.
        </p>

        {/* Mode Tabs */}
        <div className="mt-5 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              mode === "upload"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </button>
          <button
            type="button"
            onClick={() => setMode("mendeley")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              mode === "mendeley"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <CloudDownload className="h-4 w-4" />
            Import from Mendeley
          </button>
        </div>
      </div>

      {mode === "mendeley" ? (
        <MendeleyImportForm />
      ) : (
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
      >
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-800"
            >
              Dataset Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Global Urban Air Quality Measurements (2020-2026)"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="summary"
              className="block text-sm font-medium text-slate-800"
            >
              Short Summary <span className="text-red-500">*</span>
            </label>
            <input
              id="summary"
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One-sentence overview shown on browse cards and search results."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-800"
            >
              Full Description{" "}
              <span className="text-xs font-normal text-slate-500">
                (Markdown supported)
              </span>
            </label>
            <textarea
              id="description"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe data collection methodology, column schema, preprocessing steps, and known limitations..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="authors"
                className="block text-sm font-medium text-slate-800"
              >
                Authors{" "}
                <span className="text-xs font-normal text-slate-500">
                  (comma-separated)
                </span>
              </label>
              <input
                id="authors"
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="e.g., Ada Lovelace, Alan Turing"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-slate-800"
              >
                Tags{" "}
                <span className="text-xs font-normal text-slate-500">
                  (comma-separated)
                </span>
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., climate, csv, time-series"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="license"
                className="block text-sm font-medium text-slate-800"
              >
                License
              </label>
              <select
                id="license"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
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
              <div className="mt-1.5 grid grid-cols-2 gap-2">
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

          <div>
            <label
              htmlFor="changelog"
              className="block text-sm font-medium text-slate-800"
            >
              v1 Release Notes
            </label>
            <input
              id="changelog"
              type="text"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Initial release"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-800">
              Dataset Files <span className="text-red-500">*</span>
            </span>
            <FileUploader
              files={files}
              onChange={setFiles}
              disabled={uploading}
            />
          </div>
        </div>

        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Uploading and computing SHA-256 checksums...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <Link
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Publish Dataset (v1)
              </>
            )}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
