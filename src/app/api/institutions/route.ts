import { NextRequest, NextResponse } from "next/server";
import {
  CURATED_INSTITUTIONS,
  type InstitutionOption,
} from "@/lib/research-data";

interface RorName {
  value?: string;
  types?: string[];
}

interface RorLocation {
  geonames_details?: {
    country_name?: string;
  };
}

interface RorItem {
  id?: string;
  names?: RorName[];
  locations?: RorLocation[];
}

function getLocalMatches(query: string, country: string): InstitutionOption[] {
  const q = query.toLowerCase();
  const c = country.toLowerCase();

  return CURATED_INSTITUTIONS.filter((inst) => {
    const matchesQuery =
      !q ||
      inst.name.toLowerCase().includes(q) ||
      (inst.country ?? "").toLowerCase().includes(q);
    if (!matchesQuery) return false;
    if (!q && c) {
      return !inst.country || inst.country.toLowerCase() === c;
    }
    return true;
  }).slice(0, 12);
}

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const country = (req.nextUrl.searchParams.get("country") ?? "").trim();

  const localMatches = getLocalMatches(query, country);

  // For empty or 1-character queries, return curated local suggestions immediately
  if (query.length < 2) {
    return NextResponse.json({
      institutions: localMatches,
      source: "curated",
    });
  }

  // Query Research Organization Registry (ROR) v2 public API (100,000+ global institutions)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const rorUrl = `https://api.ror.org/v2/organizations?query=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(rorUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({
        institutions: localMatches,
        source: "curated",
      });
    }

    const data = (await res.json()) as { items?: RorItem[] };
    const rorItems: InstitutionOption[] = (data.items ?? [])
      .slice(0, 15)
      .map((item) => {
        const displayName =
          item.names?.find((n) => n.types?.includes("ror_display"))?.value ??
          item.names?.[0]?.value ??
          "";
        const itemCountry =
          item.locations?.[0]?.geonames_details?.country_name ?? "";
        return {
          name: displayName,
          country: itemCountry,
          rorId: item.id,
        };
      })
      .filter((i) => Boolean(i.name));

    // Merge local matches + ROR matches without duplicates, prioritizing selected country
    const seen = new Set<string>();
    const combined: InstitutionOption[] = [];
    for (const item of [...localMatches, ...rorItems]) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
    }

    if (country) {
      const c = country.toLowerCase();
      combined.sort((a, b) => {
        const aMatch = (a.country ?? "").toLowerCase() === c ? 0 : 1;
        const bMatch = (b.country ?? "").toLowerCase() === c ? 0 : 1;
        return aMatch - bMatch;
      });
    }

    return NextResponse.json({
      institutions: combined.slice(0, 15),
      source: "ror",
    });
  } catch {
    return NextResponse.json({
      institutions: localMatches,
      source: "curated",
    });
  }
}
