"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { FILE_TYPE_FILTERS, LICENSE_OPTIONS } from "@/lib/format";

interface SearchFiltersProps {
  availableTags: { name: string; count: number }[];
  initialQuery: string;
  initialTag: string;
  initialExt: string;
  initialLicense: string;
  initialSort: string;
  initialMine: boolean;
}

export function SearchBarAndSort({
  initialQuery,
  initialSort,
}: {
  initialQuery: string;
  initialSort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ q: query.trim() || null });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-1 items-center rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/25"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search datasets, authors, subjects..."
          className="w-full bg-transparent py-2.5 sm:py-3 pl-3.5 sm:pl-4 pr-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              updateParams({ q: null });
            }}
            className="mr-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          title="Search"
          className="mr-1.5 inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 shrink-0 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-sm">
        <span className="inline-flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-indigo-500" />
          <label htmlFor="sort-select" className="text-xs font-medium text-slate-500">
            Sort
          </label>
        </span>
        <select
          id="sort-select"
          value={initialSort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="bg-transparent py-0.5 pr-1 text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
        >
          <option value="newest">Most Recent</option>
          <option value="downloads">Most Downloaded</option>
          <option value="views">Most Viewed</option>
        </select>
      </div>
    </div>
  );
}

export function SearchFilters({
  availableTags,
  initialTag,
  initialExt,
  initialLicense,
  initialMine,
}: Omit<SearchFiltersProps, "initialQuery" | "initialSort">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    license: true,
    format: true,
    subjects: true,
  });

  function toggleSection(section: keyof typeof openSections) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function toggleParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function clearAll() {
    router.push("/");
  }

  const activeCount = [initialTag, initialExt, initialLicense].filter(
    Boolean
  ).length;
  const hasFilters = Boolean(
    activeCount > 0 || initialMine || searchParams.get("q")
  );

  return (
    <aside className="md:sticky md:top-24">
      {/* Compact toggle bar on narrow/mobile screens */}
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm md:hidden cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
          <span>Refine Results</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            mobileOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Filter panel */}
      <div
        className={`${
          mobileOpen ? "mt-2 block" : "hidden"
        } md:block rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm divide-y divide-slate-100`}
      >
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" />
            <span>Refine Results</span>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* License facet */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection("license")}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <span>License</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                openSections.license ? "rotate-180" : ""
              }`}
            />
          </button>
          {openSections.license && (
            <div className="mt-2 space-y-0.5">
              {LICENSE_OPTIONS.map((lic) => {
                const active = initialLicense === lic;
                return (
                  <label
                    key={lic}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                      active
                        ? "bg-indigo-50/80 font-semibold text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleParam("license", lic)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                    />
                    <span className="truncate">{lic}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* File Format facet */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection("format")}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <span>File Format</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                openSections.format ? "rotate-180" : ""
              }`}
            />
          </button>
          {openSections.format && (
            <div className="mt-2 grid grid-cols-2 gap-0.5">
              {FILE_TYPE_FILTERS.map((ext) => {
                const active = initialExt === ext;
                return (
                  <label
                    key={ext}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                      active
                        ? "bg-indigo-50/80 font-semibold text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleParam("ext", ext)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] uppercase">
                      .{ext}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Subjects facet */}
        {availableTags.length > 0 && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() => toggleSection("subjects")}
              className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <span>Subjects</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  openSections.subjects ? "rotate-180" : ""
                }`}
              />
            </button>
            {openSections.subjects && (
              <div className="mt-2 space-y-0.5 max-h-52 overflow-y-auto pr-1">
                {availableTags.map((t) => {
                  const active = initialTag === t.name;
                  return (
                    <label
                      key={t.name}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                        active
                          ? "bg-indigo-50/80 font-semibold text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleParam("tag", t.name)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                        />
                        <span className="truncate capitalize">{t.name}</span>
                      </span>
                      <span
                        className={`shrink-0 text-[11px] tabular-nums ${
                          active ? "text-indigo-600" : "text-slate-400"
                        }`}
                      >
                        {t.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
