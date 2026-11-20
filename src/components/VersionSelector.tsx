"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileText,
  History,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/format";
import type { SerializedFile, SerializedVersion } from "@/lib/serialize";

interface VersionSelectorProps {
  slug: string;
  versions: SerializedVersion[];
  selectedVersionNumber: number;
  onSelectVersion: (versionNumber: number) => void;
  onPreviewFile: (file: SerializedFile) => void;
}

export function VersionSelector({
  slug,
  versions,
  selectedVersionNumber,
  onSelectVersion,
  onPreviewFile,
}: VersionSelectorProps) {
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  const selectedVersion =
    versions.find((v) => v.versionNumber === selectedVersionNumber) ??
    versions[0];

  if (!selectedVersion) {
    return null;
  }

  async function copyHash(file: SerializedFile) {
    try {
      await navigator.clipboard.writeText(file.sha256);
      setCopiedHashId(file.id);
      setTimeout(() => setCopiedHashId(null), 1500);
    } catch {
      // Ignore clipboard failure
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <History className="h-4 w-4 text-indigo-600" />
            <span>Version</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {versions.map((v) => {
              const active = v.versionNumber === selectedVersion.versionNumber;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVersion(v.versionNumber)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  v{v.versionNumber}
                </button>
              );
            })}
          </div>
        </div>

        <a
          href={`/api/datasets/${slug}/versions/${selectedVersion.versionNumber}/download`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <FileArchive className="h-4 w-4" />
          Download v{selectedVersion.versionNumber} (.zip ·{" "}
          {formatBytes(selectedVersion.totalBytes)})
        </a>
      </div>

      {/* Changelog & metadata */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-slate-800">Changelog:</span>{" "}
          {selectedVersion.changelog}
        </div>
        <div className="text-slate-500">
          Published {formatDate(selectedVersion.publishedAt)} ·{" "}
          {selectedVersion.files.length}{" "}
          {selectedVersion.files.length === 1 ? "file" : "files"}
        </div>
      </div>

      {/* File table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">File</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">SHA-256 Checksum</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {selectedVersion.files.map((file) => (
              <tr key={file.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {file.originalName}
                    </span>
                    {file.extension && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        {file.extension}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                  {formatBytes(file.sizeBytes)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => copyHash(file)}
                    className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title={`Copy full SHA-256: ${file.sha256}`}
                  >
                    <span>{file.sha256.slice(0, 14)}…</span>
                    {copiedHashId === file.id ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400" />
                    )}
                  </button>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPreviewFile(file)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                    <a
                      href={`/api/files/${file.id}/download`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
