"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, Upload } from "lucide-react";
import { FileUploader } from "@/components/FileUploader";

export default function NewVersionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  const [changelog, setChangelog] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("Please select at least one file for the new version.");
      return;
    }

    const formData = new FormData();
    formData.append(
      "changelog",
      changelog.trim() || "Updated dataset files"
    );
    for (const file of files) {
      formData.append("files", file);
    }

    setUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/datasets/${slug}/versions`);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          router.push(`/datasets/${slug}`);
          router.refresh();
          return;
        }
        setError(data.error || "Failed to publish new version.");
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
          href={`/datasets/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dataset
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          Publish New Version
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload updated files for{" "}
          <span className="font-mono font-medium text-slate-800">{slug}</span>.
          Previous versions remain archived and downloadable.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="changelog"
            className="block text-sm font-medium text-slate-800"
          >
            Version Changelog <span className="text-red-500">*</span>
          </label>
          <textarea
            id="changelog"
            rows={3}
            required
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="Summarize what changed in this version (e.g., Added 2026 Q3 records, fixed missing values in column X)..."
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-800">
            Version Files <span className="text-red-500">*</span>
          </span>
          <FileUploader
            files={files}
            onChange={setFiles}
            disabled={uploading}
          />
        </div>

        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Uploading and hashing files...</span>
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
            href={`/datasets/${slug}`}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Publish New Version
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
