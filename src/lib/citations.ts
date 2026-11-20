import { parseAuthors } from "./format";

export interface CitationInput {
  title: string;
  slug: string;
  authors: string;
  versionNumber: number;
  publishedAt: string | Date;
  url: string;
}

function formatApaAuthor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.trim();
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");
  return `${last}, ${initials}`;
}

export function formatApaCitation(input: CitationInput): string {
  const authors = parseAuthors(input.authors);
  const year = new Date(input.publishedAt).getFullYear();

  let authorText = "Unknown Author";
  if (authors.length === 1) {
    authorText = formatApaAuthor(authors[0]);
  } else if (authors.length === 2) {
    authorText = `${formatApaAuthor(authors[0])}, & ${formatApaAuthor(authors[1])}`;
  } else if (authors.length > 2) {
    const formatted = authors.map(formatApaAuthor);
    authorText = `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
  }

  return `${authorText} (${year}). ${input.title} (Version ${input.versionNumber}) [Dataset]. Just Research. ${input.url}`;
}

export function formatBibtexCitation(input: CitationInput): string {
  const authors = parseAuthors(input.authors);
  const year = new Date(input.publishedAt).getFullYear();
  const firstAuthorLast = (authors[0]?.trim().split(/\s+/).pop() ?? "dataset")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const slugPart = input.slug.replace(/[^a-z0-9]/gi, "_").slice(0, 24);
  const key = `${firstAuthorLast}${year}_${slugPart}_v${input.versionNumber}`;
  const bibAuthors = authors.length > 0 ? authors.join(" and ") : "Unknown Author";

  return `@dataset{${key},
  author       = {${bibAuthors}},
  title        = {${input.title}},
  year         = {${year}},
  version      = {v${input.versionNumber}},
  publisher    = {Just Research},
  url          = {${input.url}}
}`;
}
