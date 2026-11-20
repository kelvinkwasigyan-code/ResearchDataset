"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Quote } from "lucide-react";
import { formatApaCitation, formatBibtexCitation } from "@/lib/citations";

interface CitationBoxProps {
  title: string;
  slug: string;
  authors: string;
  versionNumber: number;
  publishedAt: string;
}

export function CitationBox({
  title,
  slug,
  authors,
  versionNumber,
  publishedAt,
}: CitationBoxProps) {
  const [format, setFormat] = useState<"apa" | "bibtex">("apa");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const url = `${origin}/datasets/${slug}`;
  const citationText =
    format === "apa"
      ? formatApaCitation({
          title,
          slug,
          authors,
          versionNumber,
          publishedAt,
          url,
        })
      : formatBibtexCitation({
          title,
          slug,
          authors,
          versionNumber,
          publishedAt,
          url,
        });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Quote className="h-4 w-4 text-indigo-600" />
          <span>Cite This Dataset</span>
        </div>
        <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFormat("apa")}
            className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
              format === "apa"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            APA
          </button>
          <button
            type="button"
            onClick={() => setFormat("bibtex")}
            className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
              format === "bibtex"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            BibTeX
          </button>
        </div>
      </div>

      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">
        {citationText}
      </pre>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            Copied {format.toUpperCase()} citation
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy {format.toUpperCase()} Citation
          </>
        )}
      </button>
    </section>
  );
}
