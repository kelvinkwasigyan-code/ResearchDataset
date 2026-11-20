"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, UploadCloud } from "lucide-react";
import { formatBytes } from "@/lib/format";

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUploader({ files, onChange, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming).filter((f) => f.size > 0);
    if (list.length === 0) return;

    const existingKeys = new Set(
      files.map((f) => `${f.name}:${f.size}:${f.lastModified}`)
    );
    const merged = [...files];
    for (const file of list) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (!existingKeys.has(key)) {
        merged.push(file);
        existingKeys.add(key);
      }
    }
    onChange(merged);
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    onChange(next);
  }

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled && e.dataTransfer.files) {
            addFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
            : isDragging
              ? "cursor-pointer border-indigo-500 bg-indigo-50/70"
              : "cursor-pointer border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30"
        }`}
      >
        <UploadCloud className="h-10 w-10 text-indigo-500" />
        <p className="mt-3 text-sm font-medium text-slate-900">
          Drop files here, or{" "}
          <span className="text-indigo-600 underline">browse your computer</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Supports CSV, JSON, Markdown, TXT, Parquet, ZIP, images, and more
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              addFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500">
            <span>
              {files.length} {files.length === 1 ? "file" : "files"} selected
            </span>
            <span>Total: {formatBytes(totalSize)}</span>
          </div>
          <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {files.map((file, idx) => (
              <li
                key={`${file.name}-${file.size}-${idx}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate font-medium text-slate-800">
                    {file.name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeFile(idx)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors cursor-pointer"
                    aria-label={`Remove ${file.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
