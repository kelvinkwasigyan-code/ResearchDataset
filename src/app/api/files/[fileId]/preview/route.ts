import { Readable } from "stream";
import Papa from "papaparse";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { storageProvider } from "@/lib/storage/local";

export const runtime = "nodejs";

const MAX_TEXT_PREVIEW_BYTES = 256 * 1024; // 256 KB
const MAX_CSV_PREVIEW_ROWS = 100;

const SAFE_IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const TEXT_EXTENSIONS = new Set([
  "txt",
  "tsv",
  "log",
  "yaml",
  "yml",
  "toml",
  "ini",
  "xml",
  "sql",
  "py",
  "r",
  "jsonl",
  "ndjson",
]);

async function readStreamHead(
  stream: NodeJS.ReadableStream,
  maxBytes: number
): Promise<{ buffer: Buffer; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let truncated = false;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve({ buffer: Buffer.concat(chunks), truncated });
    };

    stream.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remaining = maxBytes - total;
      if (buf.length > remaining) {
        if (remaining > 0) {
          chunks.push(buf.subarray(0, remaining));
          total += remaining;
        }
        truncated = true;
        if ("destroy" in stream && typeof stream.destroy === "function") {
          stream.destroy();
        }
        finish();
      } else {
        chunks.push(buf);
        total += buf.length;
      }
    });

    stream.on("end", finish);
    stream.on("close", finish);
    stream.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const session = await getSession();

  const file = await prisma.datasetFile.findUnique({
    where: { id: fileId },
    include: {
      version: {
        include: {
          dataset: true,
        },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const dataset = file.version.dataset;
  if (dataset.visibility !== "PUBLIC" && session?.userId !== dataset.ownerId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = file.extension.toLowerCase();

  // Never render HTML or SVG inline as active documents
  if (ext === "html" || ext === "htm" || ext === "svg") {
    return NextResponse.json({
      type: "unsupported",
      fileName: file.originalName,
      sizeBytes: file.sizeBytes,
      message:
        "Inline preview is disabled for HTML and SVG files for security. Download the file to inspect it locally.",
    });
  }

  // Safe raster images
  if (ext in SAFE_IMAGE_MIME) {
    const raw = req.nextUrl.searchParams.get("raw") === "1";
    if (!raw) {
      return NextResponse.json({
        type: "image",
        fileName: file.originalName,
        sizeBytes: file.sizeBytes,
        mimeType: SAFE_IMAGE_MIME[ext],
        url: `/api/files/${file.id}/preview?raw=1`,
      });
    }

    try {
      const nodeStream = storageProvider.getStream(file.storageKey);
      const webStream = Readable.toWeb(nodeStream as Readable) as ReadableStream;
      return new NextResponse(webStream, {
        status: 200,
        headers: {
          "Content-Type": SAFE_IMAGE_MIME[ext],
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Stored file could not be found" },
        { status: 404 }
      );
    }
  }

  if (
    ext === "csv" ||
    ext === "json" ||
    ext === "md" ||
    ext === "markdown" ||
    TEXT_EXTENSIONS.has(ext)
  ) {
    let nodeStream: NodeJS.ReadableStream;
    try {
      nodeStream = storageProvider.getStream(file.storageKey);
    } catch {
      return NextResponse.json(
        { error: "Stored file could not be found" },
        { status: 404 }
      );
    }

    const { buffer, truncated } = await readStreamHead(
      nodeStream,
      MAX_TEXT_PREVIEW_BYTES
    );
    const rawText = buffer.toString("utf-8");

    if (ext === "csv") {
      const parsed = Papa.parse<string[]>(rawText, {
        skipEmptyLines: true,
        preview: MAX_CSV_PREVIEW_ROWS + 1,
      });

      const allRows = parsed.data;
      const columns = allRows[0] ?? [];
      const dataRows = allRows.slice(1, MAX_CSV_PREVIEW_ROWS + 1);
      const hasMoreRows =
        truncated || allRows.length > MAX_CSV_PREVIEW_ROWS;

      return NextResponse.json({
        type: "csv",
        fileName: file.originalName,
        sizeBytes: file.sizeBytes,
        columns,
        rows: dataRows,
        rowCount: dataRows.length,
        truncated: hasMoreRows,
      });
    }

    if (ext === "json") {
      let formatted = rawText;
      if (!truncated) {
        try {
          formatted = JSON.stringify(JSON.parse(rawText), null, 2);
        } catch {
          // Leave raw text if JSON is malformed
        }
      }
      return NextResponse.json({
        type: "json",
        fileName: file.originalName,
        sizeBytes: file.sizeBytes,
        content: formatted,
        truncated,
      });
    }

    if (ext === "md" || ext === "markdown") {
      return NextResponse.json({
        type: "markdown",
        fileName: file.originalName,
        sizeBytes: file.sizeBytes,
        content: rawText,
        truncated,
      });
    }

    return NextResponse.json({
      type: "text",
      fileName: file.originalName,
      sizeBytes: file.sizeBytes,
      content: rawText,
      truncated,
    });
  }

  return NextResponse.json({
    type: "unsupported",
    fileName: file.originalName,
    sizeBytes: file.sizeBytes,
    message: `In-browser preview is not available for .${ext || "binary"} files. Download the file to open it locally.`,
  });
}
