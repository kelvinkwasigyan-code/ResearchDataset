export function formatBytes(bytes: number | bigint): string {
  const num = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (!Number.isFinite(num) || num <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(
    Math.floor(Math.log(num) / Math.log(1024)),
    units.length - 1
  );
  const value = num / Math.pow(1024, idx);
  return `${value >= 100 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "dataset";
}

export function parseAuthors(authors: string): string[] {
  const trimmed = authors.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((a) => String(a).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to comma-separated parsing
    }
  }
  return trimmed
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

export function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0 || idx === filename.length - 1) return "";
  return filename.slice(idx + 1).toLowerCase();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const LICENSE_OPTIONS = [
  "CC-BY-4.0",
  "CC0-1.0",
  "MIT",
  "Apache-2.0",
  "ODbL-1.0",
  "Custom",
] as const;

export const FILE_TYPE_FILTERS = [
  "csv",
  "json",
  "md",
  "txt",
  "zip",
  "parquet",
  "png",
  "jpg",
] as const;
