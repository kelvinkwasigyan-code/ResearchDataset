"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter, Search, X } from "lucide-react";
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
      <form onSubmit={handleSubmit} className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search datasets by title, description, author, or tag..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-24 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              updateParams({ q: null });
            }}
            className="absolute right-20 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          Search
        </button>
      </form>

      <div className="flex items-center gap-2 shrink-0">
        <label htmlFor="sort-select" className="text-xs font-medium text-slate-500">
          Sort by
        </label>
        <select
          id="sort-select"
          value={initialSort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="newest">Newest</option>
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

  const hasFilters = Boolean(
    initialTag || initialExt || initialLicense || initialMine || searchParams.get("q")
  );

  return (
    <aside className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Filter className="h-4 w-4 text-indigo-600" />
          <span>Filters</span>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Reset all
          </button>
        )}
      </div>

      {/* License filter */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          License
        </h3>
        <div className="mt-2.5 space-y-1">
          {LICENSE_OPTIONS.map((lic) => {
            const active = initialLicense === lic;
            return (
              <button
                key={lic}
                type="button"
                onClick={() => toggleParam("license", lic)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                  active
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{lic}</span>
                {active && <X className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* File Type filter */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          File Type
        </h3>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {FILE_TYPE_FILTERS.map((ext) => {
            const active = initialExt === ext;
            return (
              <button
                key={ext}
                type="button"
                onClick={() => toggleParam("ext", ext)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium uppercase transition-colors cursor-pointer ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                .{ext}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags filter */}
      {availableTags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tags
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {availableTags.map((t) => {
              const active = initialTag === t.name;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => toggleParam("tag", t.name)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <span>{t.name}</span>
                  <span
                    className={`text-[10px] ${
                      active ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
