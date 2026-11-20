export interface MendeleyFileInfo {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  downloadUrl: string;
  sha256?: string;
}

export interface MendeleyDatasetInfo {
  datasetId: string;
  version: number;
  title: string;
  summary: string;
  description: string;
  authors: string;
  license: string;
  tags: string[];
  doi?: string;
  sourceUrl: string;
  files: MendeleyFileInfo[];
  totalBytes: number;
}

export const MENDELEY_MAX_FILES = 50;
export const MENDELEY_MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB
export const MENDELEY_MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

export function parseMendeleyInput(
  raw: string
): { datasetId: string; version?: number } | null {
  const input = raw.trim();
  if (!input) return null;

  // Match DOI format: 10.17632/<id> or 10.17632/<id>.<version>
  const doiMatch = input.match(
    /10\.17632\/([a-zA-Z0-9_-]+)(?:\.(\d+))?/i
  );
  if (doiMatch) {
    return {
      datasetId: doiMatch[1],
      version: doiMatch[2] ? parseInt(doiMatch[2], 10) : undefined,
    };
  }

  // Match URL: https://data.mendeley.com/datasets/<id>[/<version>]
  const urlMatch = input.match(
    /data\.mendeley\.com\/datasets\/([a-zA-Z0-9_-]+)(?:\/(\d+))?/i
  );
  if (urlMatch) {
    return {
      datasetId: urlMatch[1],
      version: urlMatch[2] ? parseInt(urlMatch[2], 10) : undefined,
    };
  }

  // Raw dataset ID (alphanumeric, typically 10 chars)
  if (/^[a-zA-Z0-9_-]{4,40}$/.test(input)) {
    return { datasetId: input };
  }

  return null;
}

export function isAllowedMendeleyDownloadUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "data.mendeley.com" ||
      host === "api.data.mendeley.com" ||
      host.endsWith(".mendeley.com") ||
      host.endsWith(".elsevier.com") ||
      host.endsWith(".amazonaws.com")
    );
  } catch {
    return false;
  }
}

function normalizeLicense(raw: unknown): string {
  if (!raw) return "CC-BY-4.0";
  if (typeof raw === "string") return raw.trim() || "CC-BY-4.0";
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const shortName =
      typeof obj.short_name === "string"
        ? obj.short_name
        : typeof obj.id === "string"
          ? obj.id
          : "";
    const upper = shortName.toUpperCase().replace(/\s+/g, "-");
    if (upper.includes("CC-BY-4") || upper.includes("CCBY4")) return "CC-BY-4.0";
    if (upper.includes("CC0")) return "CC0-1.0";
    if (upper.includes("MIT")) return "MIT";
    if (upper.includes("APACHE")) return "Apache-2.0";
    if (shortName.trim()) return shortName.trim();
  }
  return "CC-BY-4.0";
}

function stripHtmlToSummary(text: string): string {
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "Imported from Mendeley Data.";
  return plain.length > 220 ? `${plain.slice(0, 217).trim()}...` : plain;
}

function extractFiles(rawList: unknown): MendeleyFileInfo[] {
  if (!Array.isArray(rawList)) return [];
  const results: MendeleyFileInfo[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const details =
      rec.content_details && typeof rec.content_details === "object"
        ? (rec.content_details as Record<string, unknown>)
        : {};

    const filename =
      typeof rec.filename === "string"
        ? rec.filename
        : typeof rec.name === "string"
          ? rec.name
          : "";
    const downloadUrl =
      typeof details.download_url === "string"
        ? details.download_url
        : typeof rec.download_url === "string"
          ? rec.download_url
          : "";

    if (!filename || !downloadUrl) continue;

    const id =
      typeof rec.id === "string"
        ? rec.id
        : typeof details.id === "string"
          ? details.id
          : filename;
    const size =
      typeof details.size === "number"
        ? details.size
        : typeof rec.size === "number"
          ? rec.size
          : 0;
    const mimeType =
      typeof details.content_type === "string"
        ? details.content_type
        : typeof rec.mime_type === "string"
          ? rec.mime_type
          : "application/octet-stream";
    const sha256 =
      typeof details.sha256_hash === "string" ? details.sha256_hash : undefined;

    results.push({ id, filename, size, mimeType, downloadUrl, sha256 });
  }

  return results;
}

export async function fetchMendeleyDataset(
  datasetId: string,
  version?: number
): Promise<MendeleyDatasetInfo> {
  const versionQuery = version ? `?version=${version}` : "";
  const datasetUrl = `https://data.mendeley.com/public-api/datasets/${encodeURIComponent(
    datasetId
  )}${versionQuery}`;

  const res = await fetch(datasetUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error(
      `Mendeley dataset "${datasetId}" was not found or is not public.`
    );
  }
  if (!res.ok) {
    throw new Error(
      `Mendeley Data API returned HTTP ${res.status}. Please verify the URL or try again later.`
    );
  }

  const data = (await res.json()) as Record<string, unknown>;

  const resolvedVersion =
    typeof data.version === "number" ? data.version : version ?? 1;
  const title =
    (typeof data.name === "string" && data.name.trim()) ||
    (typeof data.title === "string" && data.title.trim()) ||
    `Mendeley Dataset ${datasetId}`;
  const rawDescription =
    typeof data.description === "string" ? data.description.trim() : "";

  const contributors = Array.isArray(data.contributors) ? data.contributors : [];
  const authorNames = contributors
    .map((c) => {
      if (!c || typeof c !== "object") return "";
      const obj = c as Record<string, unknown>;
      const first = typeof obj.first_name === "string" ? obj.first_name.trim() : "";
      const last = typeof obj.last_name === "string" ? obj.last_name.trim() : "";
      return [first, last].filter(Boolean).join(" ");
    })
    .filter(Boolean);

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const tags = Array.from(
    new Set(
      categories
        .map((cat) => {
          if (typeof cat === "string") return cat.trim().toLowerCase();
          if (cat && typeof cat === "object") {
            const label = (cat as Record<string, unknown>).label;
            if (typeof label === "string") return label.trim().toLowerCase();
          }
          return "";
        })
        .filter((t) => t.length > 0 && t.length <= 40)
        .concat(["mendeley"])
    )
  );

  let doi: string | undefined;
  if (typeof data.doi === "string" && data.doi.trim()) {
    doi = data.doi.trim();
  } else if (data.doi && typeof data.doi === "object") {
    const id = (data.doi as Record<string, unknown>).id;
    if (typeof id === "string" && id.trim()) doi = id.trim();
  }

  let files = extractFiles(data.files);

  // If files weren't embedded, query the dedicated files endpoint
  if (files.length === 0) {
    const filesUrl = `https://data.mendeley.com/public-api/datasets/${encodeURIComponent(
      datasetId
    )}/files?folder_id=root${version ? `&version=${version}` : ""}`;
    const filesRes = await fetch(filesUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (filesRes.ok) {
      const filesJson = await filesRes.json();
      files = extractFiles(filesJson);
    }
  }

  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const sourceUrl = `https://data.mendeley.com/datasets/${datasetId}/${resolvedVersion}`;

  return {
    datasetId,
    version: resolvedVersion,
    title,
    summary: stripHtmlToSummary(rawDescription || title),
    description: rawDescription || title,
    authors: authorNames.join(", "),
    license: normalizeLicense(data.data_licence ?? data.license),
    tags,
    doi,
    sourceUrl,
    files,
    totalBytes,
  };
}
