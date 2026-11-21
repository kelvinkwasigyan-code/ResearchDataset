# Just Research — Project Documentation

> **Audience:** Developers and AI coding agents collaborating on this repository.  
> **Project:** `dataset-hub` (**Just Research**) — a local-first research dataset repository for publishing, versioning, previewing, citing, importing, and downloading datasets.

---

## 1. What We Are Building

**Just Research** is a full-stack web application modeled after research dataset repositories (like Zenodo / Mendeley Data / Kaggle Datasets), designed to run locally with zero external cloud dependencies while keeping clean abstractions (Prisma + `StorageProvider`) for future cloud migration.

### Core Capabilities

- **Dataset Publishing & Versioning:** Users upload multi-file datasets as immutable versions (`v1`, `v2`, …) with release changelogs, Markdown descriptions, authors, tags, license selection, and `PUBLIC` / `PRIVATE` visibility.
- **Integrity & Streaming Downloads:** Every uploaded file is hashed with **SHA-256** on write. Users can download individual files or stream an entire dataset version as a dynamically generated **ZIP archive** (`archiver`).
- **In-Browser File Previews:** Safe inline previews for **CSV** (first 100 rows parsed via `papaparse`), **JSON** (pretty-printed), **Markdown** (sanitized via `marked` + `dompurify`), plain text/code/config files (capped at 256 KB), and raster images (`png`, `jpg`, `jpeg`, `webp`, `gif`). Active documents (`html`, `htm`, `svg`) are explicitly blocked from inline rendering.
- **Mendeley Data Importer:** Fetch metadata and selectively import files from public Mendeley Data datasets via URL, DOI (`10.17632/...`), or dataset ID, with SSRF host allowlisting and size/file-count guardrails.
- **Search, Filtering & Discovery:** Full-text search across title, summary, description, authors, and tags; filter by tag, file extension, license, or ownership (`My Datasets`); sort by newest, most downloaded, or most viewed; paginated results.
- **Academic Citations:** One-click copyable **APA** and **BibTeX** citations per dataset version.
- **Authentication:** Email/password registration and login backed by `bcryptjs` password hashes and `HS256` JWT session cookies (`jose`).

---

## 2. Tech Stack & Runtime

| Layer | Technology | Version / Notes |
| --- | --- | --- |
| Framework | **Next.js (App Router + Turbopack)** | `16.4.6` (Note: `params` & `searchParams` are `Promise`s; see `AGENTS.md`) |
| UI | **React** + **TypeScript** + **Tailwind CSS** | React `19.3.0`, TS `5`, Tailwind `4.3.3` (`@tailwindcss/turbopack`) |
| Icons | **lucide-react** | `1.76.0` |
| Database / ORM | **Prisma** + **SQLite** | `@prisma/client` / `prisma` `6.19.3`, DB file at `prisma/dev.db` |
| Auth | **jose** + **bcryptjs** | `HS256` JWT in `httpOnly` cookie (`dataset_hub_session`) |
| File Packaging | **archiver** | `8.0.0` (`ZipArchive`, listed in `serverExternalPackages` in `next.config.ts`) |
| Preview / Parsing | **papaparse**, **marked**, **dompurify** | CSV parsing + sanitized Markdown rendering |

### Next.js Config (`next.config.ts`)

- `serverExternalPackages: ["archiver"]` ensures Node-native zip streaming works cleanly in Route Handlers.
- `turbopack.rules` configures `@tailwindcss/turbopack` for `*.css`.

---

## 3. Repository Structure

```text
dataset-hub/
├── AGENTS.md                         # Next.js 16 agent rules (check node_modules/next/dist/docs/)
├── DOCS.md                           # This file
├── next.config.ts                    # Next.js + Turbopack + archiver external package config
├── package.json                      # Dependencies & scripts (dev, build, start, lint, seed)
├── prisma/
│   ├── schema.prisma                 # SQLite Prisma schema
│   ├── seed.ts                       # Demo user + 3 sample datasets (with synthetic PNG & CSV/JSON)
│   ├── dev.db                        # Local SQLite database (gitignored)
│   └── migrations/                   # Prisma SQL migrations
├── storage/                          # Local dataset file storage (gitignored)
│   └── datasets/<datasetId>/v<N>/<fileId>-<sanitizedName>
└── src/
    ├── app/
    │   ├── layout.tsx                # Root layout (Geist fonts, Navbar, Footer, session check)
    │   ├── page.tsx                  # Home / Explore page (SSR search, filters, pagination)
    │   ├── globals.css               # Tailwind v4 styles
    │   ├── auth/
    │   │   ├── login/page.tsx        # Sign-in form
    │   │   └── register/page.tsx     # Registration form
    │   ├── datasets/
    │   │   ├── new/page.tsx          # Publish dataset (Upload Files tab + Mendeley Import tab)
    │   │   └── [slug]/
    │   │       ├── page.tsx          # Dataset detail page (SSR, increments viewCount)
    │   │       └── new-version/page.tsx # Publish new version (vN+1) for owned dataset
    │   └── api/
    │       ├── auth/[action]/route.ts                       # GET me; POST register|login|logout
    │       ├── datasets/route.ts                            # GET list/search; POST create (v1)
    │       ├── datasets/import/mendeley/route.ts            # GET preview; POST import from Mendeley
    │       ├── datasets/[slug]/route.ts                     # GET detail; PATCH metadata; DELETE dataset
    │       ├── datasets/[slug]/versions/route.ts            # POST new version (vN+1)
    │       ├── datasets/[slug]/versions/[version]/download/route.ts # GET streaming ZIP of version
    │       └── files/[fileId]/
    │           ├── download/route.ts                        # GET streaming single-file download
    │           └── preview/route.ts                         # GET JSON preview or ?raw=1 image stream
    ├── components/
    │   ├── Navbar.tsx                # Top nav, auth state, logout action
    │   ├── Footer.tsx                # Footer links
    │   ├── SearchFilters.tsx         # SearchBarAndSort + sidebar filters (tags, ext, license, mine)
    │   ├── DatasetCard.tsx           # Card summary shown on Explore grid
    │   ├── DatasetDetailClient.tsx   # Interactive detail view (tabs, files, preview, edit, delete)
    │   ├── VersionSelector.tsx       # Switch between archived dataset versions
    │   ├── FileUploader.tsx          # Drag-and-drop multi-file uploader UI
    │   ├── FilePreviewModal.tsx      # Modal rendering CSV table, JSON, Markdown, text, or image
    │   ├── EditMetadataModal.tsx     # Owner modal to PATCH dataset metadata & tags
    │   ├── CitationBox.tsx           # APA & BibTeX citation viewer + copy button
    │   └── MendeleyImportForm.tsx    # Lookup & selective file import UI for Mendeley Data
    └── lib/
        ├── auth.ts                   # bcrypt hashing, jose JWT sign/verify, cookie session helpers
        ├── db.ts                     # Singleton PrismaClient
        ├── serialize.ts              # Converts Prisma models (BigInt, Date) to JSON-safe DTOs
        ├── format.ts                 # formatBytes, slugify, parseAuthors, getExtension, formatDate, constants
        ├── citations.ts              # APA & BibTeX citation formatters
        ├── mendeley.ts               # Mendeley input parser, public API fetcher, URL allowlist & limits
        └── storage/
            ├── types.ts              # StorageProvider & StoredObject interfaces
            └── local.ts              # LocalStorageProvider (disk I/O, SHA-256, path-traversal guard)
```

---

## 4. Database Schema (`prisma/schema.prisma`)

Provider: **SQLite** (`DATABASE_URL` in `.env`).

### Models

1. **`User`**
   - `id` (`cuid`), `email` (`unique`), `name`, `passwordHash`, `createdAt`
   - Relation: `datasets` (`Dataset[]`)
2. **`Dataset`**
   - `id` (`cuid` / UUID when created via API), `slug` (`unique`), `title`, `summary`, `description` (Markdown), `authors` (comma-separated string or JSON array), `license` (default `"CC-BY-4.0"`), `visibility` (`"PUBLIC"` | `"PRIVATE"`, default `"PUBLIC"`), `viewCount` (`Int`), `downloadCount` (`Int`), `ownerId` → `User` (`onDelete: Cascade`), `createdAt`, `updatedAt`
   - Index: `@@index([visibility, createdAt])`
   - Relations: `versions` (`DatasetVersion[]`), `tags` (`DatasetTag[]`)
3. **`DatasetVersion`**
   - `id` (`cuid`), `datasetId` → `Dataset` (`onDelete: Cascade`), `versionNumber` (`Int`), `changelog` (default `"Initial release"`), `totalBytes` (`BigInt`), `publishedAt`
   - Unique constraint: `@@unique([datasetId, versionNumber])`
   - Relation: `files` (`DatasetFile[]`)
4. **`DatasetFile`**
   - `id` (`cuid` / UUID), `versionId` → `DatasetVersion` (`onDelete: Cascade`), `originalName`, `storageKey` (`unique`), `mimeType`, `extension`, `sizeBytes` (`Int`), `sha256`, `createdAt`
   - Index: `@@index([versionId])`
5. **`Tag` & `DatasetTag`**
   - `Tag`: `id`, `name` (`unique`, stored lowercase)
   - `DatasetTag`: composite PK `@@id([datasetId, tagId])`, cascades on delete.

> **Important Serialization Note:** `DatasetVersion.totalBytes` is a Prisma `BigInt`. Always pass Prisma dataset objects through `serializeDataset()` (`src/lib/serialize.ts`) before returning JSON or passing props from Server Components to Client Components.

---

## 5. Storage Architecture (`src/lib/storage/`)

File storage is abstracted behind `StorageProvider` (`src/lib/storage/types.ts`):

```ts
export interface StoredObject {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
}

export interface StorageProvider {
  put(key: string, data: Buffer | NodeJS.ReadableStream): Promise<StoredObject>;
  getStream(key: string): NodeJS.ReadableStream;
  delete(key: string): Promise<void>;
}
```

### Default Implementation: `LocalStorageProvider` (`src/lib/storage/local.ts`)

- Base directory: `<repo>/storage` (gitignored).
- Key format built by `buildStorageKey(datasetId, versionNumber, fileId, originalName)`:
  `datasets/<datasetId>/v<versionNumber>/<fileId>-<sanitizedName>`
- **Security:** `sanitizeFilename()` strips directory components, null bytes, leading dots, and unsafe characters. `resolveSafePath()` validates via `path.relative()` that resolved paths never escape `baseDir`.
- **Integrity:** Computes `sha256` hash and exact `sizeBytes` during `put()`.
- **Atomicity on failure:** Route handlers track `storedKeys[]` and clean up written files if Prisma creation fails.
- **Cloud migration path:** Implement `StorageProvider` for S3 / Cloudflare R2 / GCS / Supabase Storage and swap the exported `storageProvider` singleton in `src/lib/storage/local.ts` (or via an env-driven factory).

---

## 6. Authentication & Access Control (`src/lib/auth.ts`)

- **Password hashing:** `bcryptjs` with cost factor `10`.
- **Session token:** `HS256` JWT via `jose` containing `{ userId, email, name }`, valid for **7 days**.
- **Cookie:** `dataset_hub_session` (`httpOnly: true`, `sameSite: "lax"`, `secure: NODE_ENV === "production"`, `path: "/"`).
- **Secret:** Reads `process.env.AUTH_SECRET` (falls back to a dev-only string if unset or `< 16` chars — **must be set in production**).
- **Visibility rules:**
  - `PUBLIC` datasets are readable, previewable, and downloadable by anyone.
  - `PRIVATE` datasets are only visible/accessible to their `ownerId`; unauthorized requests return `404` (to avoid leaking existence).
  - Mutations (`PATCH`, `DELETE`, `POST .../versions`) require an authenticated session matching `dataset.ownerId` (`401` if unauthenticated, `403` if not owner).

---

## 7. API Reference

All routes live under `src/app/api/`.

### Auth (`/api/auth/[action]`)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/auth/me` | Optional | Returns `{ user: SessionPayload \| null }`. |
| `POST` | `/api/auth/register` | Public | Body: `{ name, email, password (min 6 chars) }`. Creates user & sets session cookie (`201`). |
| `POST` | `/api/auth/login` | Public | Body: `{ email, password }`. Verifies credentials & sets session cookie (`200`). |
| `POST` | `/api/auth/logout` | Any | Clears session cookie (`200`). |

### Datasets (`/api/datasets` & `/api/datasets/[slug]`)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/datasets` | Optional | Query params: `q`, `tag`, `ext`, `license`, `sort` (`newest` \| `downloads` \| `views`), `mine` (`true`), `page` (default `1`), `pageSize` (default `12`, max `50`). Returns `{ datasets, pagination }`. |
| `POST` | `/api/datasets` | Required | `multipart/form-data`: `title`* , `summary`*, `description`, `authors`, `license`, `visibility` (`PUBLIC`\|`PRIVATE`), `changelog`, `tags` (comma-separated), `files`* (1+ non-empty files). Creates dataset + `v1` (`201`). |
| `GET` | `/api/datasets/[slug]` | Optional | Returns `{ dataset }` and increments `viewCount`. Private datasets require owner session. |
| `PATCH` | `/api/datasets/[slug]` | Owner | JSON body: any of `{ title, summary, description, authors, license, visibility, tags }`. Updates metadata & replaces tags. |
| `DELETE` | `/api/datasets/[slug]` | Owner | Deletes dataset (cascades versions/files in DB) and deletes all underlying stored files from disk. |

### Versions & Downloads

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/datasets/[slug]/versions` | Owner | `multipart/form-data`: `changelog`, `files`* (1+ files). Creates immutable `v(latest + 1)` (`201`). |
| `GET` | `/api/datasets/[slug]/versions/[version]/download` | Optional* | `runtime = "nodejs"`. Streams a ZIP archive (`<slug>-v<N>.zip`) of all files in that version and increments `downloadCount`. (`version` accepts `"2"` or `"v2"`). |
| `GET` | `/api/files/[fileId]/download` | Optional* | `runtime = "nodejs"`. Streams the file with `Content-Disposition: attachment` and increments `downloadCount`. |
| `GET` | `/api/files/[fileId]/preview` | Optional* | `runtime = "nodejs"`. Returns JSON preview payload (`csv`, `json`, `markdown`, `text`, `image`, or `unsupported`). Pass `?raw=1` for safe raster image binary streaming. Caps text/CSV reads at **256 KB** and CSV at **100 rows**. Blocks `html`, `htm`, `svg`. |

*\*Optional for `PUBLIC` datasets; Owner required for `PRIVATE` datasets.*

### Mendeley Data Import (`/api/datasets/import/mendeley`)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/datasets/import/mendeley?source=<url\|doi\|id>` | Required | Fetches metadata & file list from Mendeley's public API (`data.mendeley.com/public-api/datasets/...`) and returns `{ preview, limits }`. |
| `POST` | `/api/datasets/import/mendeley` | Required | JSON body: `{ source, visibility?, title?, summary?, tags?, selectedFileIds? }`. Downloads selected files from allowlisted hosts (`*.mendeley.com`, `*.elsevier.com`, `*.amazonaws.com`, HTTPS only), verifies limits (**max 50 files**, **50 MB/file**, **100 MB total**), stores locally with SHA-256, appends Mendeley attribution to description, and creates dataset `v1` (`201`). |

---

## 8. Frontend Routes & Key UI Flows

- **`/` (`src/app/page.tsx`):** Server-rendered (`force-dynamic`) catalog with hero search bar, sort selector, left sidebar (`SearchFilters` for tags, file types, licenses, and `My Datasets`), `DatasetCard` grid, and URL-based pagination.
- **`/auth/login` & `/auth/register`:** Client forms calling `/api/auth/login` and `/api/auth/register`.
- **`/datasets/new` (`src/app/datasets/new/page.tsx`):** Two-tab publishing flow:
  1. **Upload Files:** Uses `XMLHttpRequest` to `POST /api/datasets` for real-time upload progress bar.
  2. **Import from Mendeley:** `MendeleyImportForm` fetches preview via `GET /api/datasets/import/mendeley`, lets user toggle files & edit metadata, then imports via `POST`.
- **`/datasets/[slug]` (`src/app/datasets/[slug]/page.tsx` + `DatasetDetailClient.tsx`):** Server-loads dataset (incrementing `viewCount`) and renders Markdown description, version switcher (`VersionSelector`), file table with SHA-256 checksums, inline `FilePreviewModal`, ZIP/file downloads, `CitationBox` (APA & BibTeX), and owner controls (`EditMetadataModal`, link to `/new-version`, and delete confirmation).
- **`/datasets/[slug]/new-version`:** Owner form uploading a new immutable version via `XMLHttpRequest` to `POST /api/datasets/[slug]/versions`.

---

## 9. Local Setup & Commands

### Environment Variables (`.env`)

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret-at-least-16-chars"
```

### First-Time Setup

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

### Demo Credentials (created by `prisma/seed.ts`)

- **Email:** `demo@datasethub.local`
- **Password:** `password123`
- Seeds 3 public datasets: *Global Urban Air Quality Measurements (v1 & v2)*, *Open NLP Sentiment Benchmark Corpus (v1)*, and *Synthetic Microscopy Cell Atlas (v1, includes generated PNG)*.

### NPM Scripts

- `npm run dev` — Start Next.js dev server (Turbopack) at `http://localhost:3000`.
- `npm run build` — Production build.
- `npm run start` — Start production server.
- `npm run lint` — Run ESLint (`eslint-config-next`).
- `npm run seed` — Run `tsx prisma/seed.ts` (idempotent; skips if datasets already exist).

---

## 10. Important Gotchas & Conventions for AI Agents

1. **Next.js 16 Breaking Changes:** Read `AGENTS.md` and consult `node_modules/next/dist/docs/` before changing Next.js APIs. Dynamic route `params` and `searchParams` are asynchronous (`await params`).
2. **`archiver` v8 API:** This repo uses `archiver@^8.0.0`, which exports `ZipArchive` (`new ZipArchive({ zlib: { level: 6 } })`) rather than the older `archiver("zip")` factory. Keep `"archiver"` in `next.config.ts` → `serverExternalPackages`.
3. **Prisma `BigInt` Handling:** Never return raw Prisma `DatasetVersion` objects in `NextResponse.json()` without converting `totalBytes` to `Number` via `serializeDataset()`.
4. **Local Storage & SQLite Limits:** Both SQLite (`prisma/dev.db`) and local disk storage (`storage/`) are ephemeral on serverless/container platforms (e.g., Vercel, Render free tier). Deploying to production cloud requires migrating Prisma to PostgreSQL and implementing a cloud `StorageProvider` (S3/R2/Supabase Storage).
5. **Security Boundaries to Preserve:**
   - Never allow inline rendering of `.html`, `.htm`, or `.svg` in `/api/files/[fileId]/preview`.
   - Keep `isAllowedMendeleyDownloadUrl()` intact to prevent SSRF in the Mendeley importer.
   - Always sanitize filenames and check `resolveSafePath()` when interacting with local disk storage.
   - Return `404` (not `403`) when non-owners request `PRIVATE` datasets or their files.
6. **Available Constants (`src/lib/format.ts`):**
   - `LICENSE_OPTIONS`: `CC-BY-4.0`, `CC0-1.0`, `MIT`, `Apache-2.0`, `ODbL-1.0`, `Custom`
   - `FILE_TYPE_FILTERS`: `csv`, `json`, `md`, `txt`, `zip`, `parquet`, `png`, `jpg`
