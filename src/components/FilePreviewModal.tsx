"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { formatBytes } from "@/lib/format";
import type { SerializedFile } from "@/lib/serialize";

type PreviewPayload =
  | {
      type: "csv";
      fileName: string;
      sizeBytes: number;
      columns: string[];
      rows: string[][];
      rowCount: number;
      truncated: boolean;
    }
  | {
      type: "json" | "markdown" | "text";
      fileName: string;
      sizeBytes: number;
      content: string;
      truncated: boolean;
    }
  | {
      type: "image";
      fileName: string;
      sizeBytes: number;
      mimeType: string;
      url: string;
    }
  | {
      type: "unsupported";
      fileName: string;
      sizeBytes: number;
      message: string;
    };

interface FilePreviewModalProps {
  file: SerializedFile | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPayload(null);

    fetch(`/api/files/${file.id}/preview`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load preview");
        }
        return res.json() as Promise<PreviewPayload>;
      })
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [file, onClose]);

  if (!file) return null;

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] sm:max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm sm:text-base font-semibold text-slate-900">
                {file.originalName}
              </h3>
              <p className="truncate text-[11px] sm:text-xs text-slate-500">
                {formatBytes(file.sizeBytes)} · {file.mimeType}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {payload &&
              (payload.type === "json" ||
                payload.type === "text" ||
                payload.type === "markdown") && (
                <button
                  type="button"
                  onClick={() => handleCopy(payload.content)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              )}
            <a
              href={`/api/files/${file.id}/download`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
              <p className="mt-3 text-sm">Loading preview...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && payload && (
            <>
              {payload.type === "csv" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Showing {payload.rowCount} rows × {payload.columns.length}{" "}
                      columns
                    </span>
                    {payload.truncated && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        Preview capped at first 100 rows
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="w-10 px-3 py-2 font-semibold text-slate-400">
                            #
                          </th>
                          {payload.columns.map((col, idx) => (
                            <th
                              key={idx}
                              className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700"
                            >
                              {col || `Column ${idx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-mono">
                        {payload.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-slate-400">
                              {rIdx + 1}
                            </td>
                            {payload.columns.map((_, cIdx) => (
                              <td
                                key={cIdx}
                                className="max-w-xs truncate whitespace-nowrap px-3 py-1.5 text-slate-700"
                                title={row[cIdx] ?? ""}
                              >
                                {row[cIdx] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(payload.type === "json" || payload.type === "text") && (
                <div className="space-y-3">
                  {payload.truncated && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Preview truncated at 256 KB. Download the full file to
                      view all contents.
                    </div>
                  )}
                  <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
                    <code>{payload.content}</code>
                  </pre>
                </div>
              )}

              {payload.type === "markdown" && (
                <div className="space-y-3">
                  {payload.truncated && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Preview truncated at 256 KB.
                    </div>
                  )}
                  <div
                    className="markdown-body rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-800"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        marked.parse(payload.content, { async: false }) as string
                      ),
                    }}
                  />
                </div>
              )}

              {payload.type === "image" && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={payload.url}
                    alt={payload.fileName}
                    className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-xs"
                  />
                </div>
              )}

              {payload.type === "unsupported" && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="mt-4 max-w-md text-sm text-slate-600">
                    {payload.message}
                  </p>
                  <a
                    href={`/api/files/${file.id}/download`}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download {file.originalName}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
