"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, Loader2, Search } from "lucide-react";
import {
  CURATED_INSTITUTIONS,
  type InstitutionOption,
} from "@/lib/research-data";

interface InstitutionComboboxProps {
  value: string;
  country: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InstitutionCombobox({
  value,
  country,
  onChange,
  disabled,
}: InstitutionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<InstitutionOption[]>(
    CURATED_INSTITUTIONS.slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced live search against /api/institutions (ROR + curated fallback)
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (value.trim()) params.set("q", value.trim());
        if (country.trim()) params.set("country", country.trim());
        const res = await fetch(`/api/institutions?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as {
            institutions?: InstitutionOption[];
          };
          setOptions(data.institutions ?? []);
        }
      } catch {
        // Keep existing options on network error
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [value, country, open]);

  const trimmed = value.trim();
  const exactMatch = options.some(
    (opt) => opt.name.toLowerCase() === trimmed.toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="institution"
          type="text"
          required
          disabled={disabled}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder="Search 100,000+ universities & institutes or type your own..."
          autoComplete="organization"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
          {options.length > 0 ? (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {trimmed.length >= 2
                  ? "Matching Institutions (ROR Global Registry)"
                  : country
                    ? `Suggested Institutions (${country})`
                    : "Suggested Institutions"}
              </div>
              {options.map((opt) => {
                const selected =
                  opt.name.toLowerCase() === trimmed.toLowerCase();
                return (
                  <button
                    key={`${opt.name}-${opt.rorId ?? opt.country ?? ""}`}
                    type="button"
                    onClick={() => {
                      onChange(opt.name);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      selected
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{opt.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {opt.country && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          {opt.country}
                        </span>
                      )}
                      {selected && (
                        <Check className="h-3.5 w-3.5 text-indigo-600" />
                      )}
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            !loading && (
              <div className="px-3 py-2 text-xs text-slate-500">
                No registry matches found. You can still use your typed
                institution name.
              </div>
            )
          )}

          {trimmed.length > 0 && !exactMatch && (
            <div className="mt-1 border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={() => {
                  onChange(trimmed);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <span>Use custom institution: &ldquo;{trimmed}&rdquo;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
