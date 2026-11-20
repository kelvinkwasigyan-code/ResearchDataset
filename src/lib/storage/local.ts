import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { StorageProvider, StoredObject } from "./types";

export function sanitizeFilename(filename: string): string {
  // Strip any directory components first
  const base = path.basename(filename).replace(/\0/g, "");
  // Keep only safe characters
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .replace(/_+/g, "_");
  return cleaned.length > 0 ? cleaned.slice(0, 180) : "file";
}

export function buildStorageKey(
  datasetId: string,
  versionNumber: number,
  fileId: string,
  originalName: string
): string {
  const safeDatasetId = sanitizeFilename(datasetId);
  const safeFileId = sanitizeFilename(fileId);
  const safeName = sanitizeFilename(originalName);
  return `datasets/${safeDatasetId}/v${versionNumber}/${safeFileId}-${safeName}`;
}

export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(
      /*turbopackIgnore: true*/ baseDir ?? path.join(process.cwd(), "storage")
    );
  }

  private resolveSafePath(key: string): string {
    if (!key || key.includes("\0")) {
      throw new Error("Invalid storage key");
    }
    const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
    const resolved = path.resolve(this.baseDir, normalizedKey);
    const rel = path.relative(this.baseDir, resolved);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error("Path traversal detected in storage key");
    }
    return resolved;
  }

  async put(
    key: string,
    data: Buffer | NodeJS.ReadableStream
  ): Promise<StoredObject> {
    const filePath = this.resolveSafePath(key);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });

    const hash = crypto.createHash("sha256");

    if (Buffer.isBuffer(data)) {
      hash.update(data);
      await fsp.writeFile(filePath, data);
      return {
        storageKey: key,
        sizeBytes: data.length,
        sha256: hash.digest("hex"),
      };
    }

    return new Promise<StoredObject>((resolve, reject) => {
      let sizeBytes = 0;
      const writeStream = fs.createWriteStream(filePath);

      data.on("data", (chunk: Buffer | string) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        sizeBytes += buf.length;
        hash.update(buf);
      });

      data.on("error", (err) => {
        writeStream.destroy();
        fsp.unlink(filePath).catch(() => {});
        reject(err);
      });

      writeStream.on("error", (err) => {
        fsp.unlink(filePath).catch(() => {});
        reject(err);
      });

      writeStream.on("finish", () => {
        resolve({
          storageKey: key,
          sizeBytes,
          sha256: hash.digest("hex"),
        });
      });

      data.pipe(writeStream);
    });
  }

  getStream(key: string): NodeJS.ReadableStream {
    const filePath = this.resolveSafePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error("Stored object not found");
    }
    return fs.createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    try {
      await fsp.unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();
