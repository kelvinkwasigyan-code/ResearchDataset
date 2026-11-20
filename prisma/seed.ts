import crypto from "crypto";
import zlib from "zlib";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { buildStorageKey, LocalStorageProvider } from "../src/lib/storage/local";
import { getExtension } from "../src/lib/format";

const prisma = new PrismaClient();
const storage = new LocalStorageProvider();

// Generate a valid 64x64 colorful gradient PNG buffer without native dependencies
function createSamplePng(width = 128, height = 128): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Draw synthetic glowing "cells" on a dark microscopy background
  const cells = [
    { x: 38, y: 42, r: 22, cr: 79, cg: 209, cb: 197 },
    { x: 88, y: 52, r: 18, cr: 129, cg: 140, cb: 248 },
    { x: 64, y: 92, r: 24, cr: 52, cg: 211, cb: 153 },
  ];

  const rawRows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter type none
    for (let x = 0; x < width; x++) {
      let r = 15;
      let g = 23;
      let b = 42;
      for (const c of cells) {
        const dist = Math.hypot(x - c.x, y - c.y);
        if (dist < c.r) {
          const intensity = 1 - dist / c.r;
          r = Math.min(255, Math.round(r + c.cr * intensity));
          g = Math.min(255, Math.round(g + c.cg * intensity));
          b = Math.min(255, Math.round(b + c.cb * intensity));
        }
      }
      const offset = 1 + x * 3;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
    }
    rawRows.push(row);
  }

  const idat = zlib.deflateSync(Buffer.concat(rawRows));
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function storeFilesForVersion(
  datasetId: string,
  versionNumber: number,
  files: { name: string; mimeType: string; content: Buffer | string }[]
) {
  const records: {
    id: string;
    originalName: string;
    storageKey: string;
    mimeType: string;
    extension: string;
    sizeBytes: number;
    sha256: string;
  }[] = [];
  let totalBytes = 0;

  for (const f of files) {
    const fileId = crypto.randomUUID();
    const key = buildStorageKey(datasetId, versionNumber, fileId, f.name);
    const buf = Buffer.isBuffer(f.content)
      ? f.content
      : Buffer.from(f.content, "utf-8");
    const stored = await storage.put(key, buf);
    totalBytes += stored.sizeBytes;
    records.push({
      id: fileId,
      originalName: f.name,
      storageKey: stored.storageKey,
      mimeType: f.mimeType,
      extension: getExtension(f.name),
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
    });
  }

  return { records, totalBytes };
}

async function main() {
  console.log("Seeding Just Research...");

  const passwordHash = await bcrypt.hash("password123", 10);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@datasethub.local" },
    update: {},
    create: {
      email: "demo@datasethub.local",
      name: "Dr. Elena Vance",
      passwordHash,
    },
  });

  // Skip if datasets already exist
  const existingCount = await prisma.dataset.count();
  if (existingCount > 0) {
    console.log(
      `Database already has ${existingCount} dataset(s). Skipping seed.`
    );
    return;
  }

  // 1. Multi-version Climate / Air Quality Dataset
  const ds1Id = crypto.randomUUID();
  const v1Csv = [
    "date,city,country,pm25_ugm3,pm10_ugm3,no2_ppb,aqi_category",
    "2025-01-15,Zurich,Switzerland,8.4,14.2,11.5,Good",
    "2025-01-15,Tokyo,Japan,12.1,21.0,18.3,Good",
    "2025-01-15,Seattle,USA,9.8,16.5,14.1,Good",
    "2025-01-15,London,UK,14.6,23.4,24.8,Moderate",
    "2025-01-15,Delhi,India,118.2,195.0,46.2,Unhealthy",
    "2025-02-15,Zurich,Switzerland,7.9,13.1,10.8,Good",
    "2025-02-15,Tokyo,Japan,13.4,22.8,19.1,Good",
    "2025-02-15,Seattle,USA,10.2,17.0,13.9,Good",
  ].join("\n");

  const v2Csv = [
    v1Csv,
    "2026-01-15,Zurich,Switzerland,7.1,12.4,9.8,Good",
    "2026-01-15,Tokyo,Japan,11.5,19.6,17.2,Good",
    "2026-01-15,Seattle,USA,8.9,15.2,12.7,Good",
    "2026-01-15,London,UK,12.9,20.8,21.5,Good",
    "2026-01-15,Delhi,India,104.5,176.3,42.0,Unhealthy",
    "2026-02-15,Sao Paulo,Brazil,16.4,28.9,22.1,Moderate",
    "2026-02-15,Nairobi,Kenya,21.8,37.4,19.6,Moderate",
  ].join("\n");

  const stationsJson = JSON.stringify(
    {
      schema_version: "2.0",
      stations: [
        { city: "Zurich", lat: 47.3769, lon: 8.5417, elevation_m: 408 },
        { city: "Tokyo", lat: 35.6762, lon: 139.6503, elevation_m: 40 },
        { city: "Seattle", lat: 47.6062, lon: -122.3321, elevation_m: 56 },
        { city: "London", lat: 51.5072, lon: -0.1276, elevation_m: 11 },
        { city: "Delhi", lat: 28.6139, lon: 77.209, elevation_m: 216 },
        { city: "Sao Paulo", lat: -23.5505, lon: -46.6333, elevation_m: 760 },
        { city: "Nairobi", lat: -1.2921, lon: 36.8219, elevation_m: 1795 },
      ],
    },
    null,
    2
  );

  const airReadme = `# Global Urban Air Quality Index (2025–2026)

## Overview
Standardized daily particulate matter (\`PM2.5\`, \`PM10\`) and nitrogen dioxide (\`NO2\`) readings collected from municipal reference monitoring stations.

## Columns
- \`date\`: ISO-8601 sampling date
- \`city\` / \`country\`: Monitoring station location
- \`pm25_ugm3\`: Fine particulate matter (µg/m³)
- \`pm10_ugm3\`: Coarse particulate matter (µg/m³)
- \`no2_ppb\`: Nitrogen dioxide concentration (parts per billion)
- \`aqi_category\`: Normalized EPA air quality category
`;

  const ds1v1 = await storeFilesForVersion(ds1Id, 1, [
    { name: "air_quality_readings.csv", mimeType: "text/csv", content: v1Csv },
    { name: "README.md", mimeType: "text/markdown", content: airReadme },
  ]);

  const ds1v2 = await storeFilesForVersion(ds1Id, 2, [
    { name: "air_quality_readings.csv", mimeType: "text/csv", content: v2Csv },
    {
      name: "stations_metadata.json",
      mimeType: "application/json",
      content: stationsJson,
    },
    { name: "README.md", mimeType: "text/markdown", content: airReadme },
  ]);

  await prisma.dataset.create({
    data: {
      id: ds1Id,
      slug: "global-urban-air-quality",
      title: "Global Urban Air Quality Measurements (2025–2026)",
      summary:
        "Standardized PM2.5, PM10, and NO2 readings across major metropolitan reference stations with geospatial metadata.",
      description: airReadme,
      authors: "Elena Vance, Marcus Chen, Priya Nair",
      license: "CC-BY-4.0",
      visibility: "PUBLIC",
      viewCount: 342,
      downloadCount: 89,
      ownerId: demoUser.id,
      tags: {
        create: ["climate", "air-quality", "time-series", "csv"].map((name) => ({
          tag: { connectOrCreate: { where: { name }, create: { name } } },
        })),
      },
      versions: {
        create: [
          {
            versionNumber: 1,
            changelog: "Initial 2025 release with 5 reference cities.",
            totalBytes: BigInt(ds1v1.totalBytes),
            publishedAt: new Date("2025-11-10T12:00:00Z"),
            files: { create: ds1v1.records },
          },
          {
            versionNumber: 2,
            changelog:
              "Added 2026 Q1 measurements, Sao Paulo & Nairobi stations, and stations_metadata.json.",
            totalBytes: BigInt(ds1v2.totalBytes),
            publishedAt: new Date("2026-03-04T15:30:00Z"),
            files: { create: ds1v2.records },
          },
        ],
      },
    },
  });

  // 2. NLP Sentiment Benchmark Corpus
  const ds2Id = crypto.randomUUID();
  const nlpSamples = JSON.stringify(
    {
      dataset: "open-nlp-sentiment-benchmark",
      split: "validation",
      records: [
        {
          id: "rev_001",
          domain: "software",
          text: "The local-first workflow is remarkably fast and zero-config.",
          label: "positive",
          confidence: 0.98,
        },
        {
          id: "rev_002",
          domain: "hardware",
          text: "Battery life meets specifications, though the charger is bulky.",
          label: "neutral",
          confidence: 0.87,
        },
        {
          id: "rev_003",
          domain: "research",
          text: "Reproducibility scripts failed due to missing checksums.",
          label: "negative",
          confidence: 0.94,
        },
        {
          id: "rev_004",
          domain: "software",
          text: "Clean API design with predictable streaming downloads.",
          label: "positive",
          confidence: 0.96,
        },
      ],
    },
    null,
    2
  );

  const labelDistCsv = [
    "split,positive,neutral,negative,total",
    "train,4200,2800,3000,10000",
    "validation,840,560,600,2000",
    "test,850,550,600,2000",
  ].join("\n");

  const nlpDatasheet = `# Open NLP Sentiment Benchmark Corpus

A balanced three-class sentiment classification benchmark spanning software, hardware, and academic research reviews.

## Intended Use
- Evaluating zero-shot and fine-tuned sentiment classifiers
- Calibration testing using annotator confidence scores
`;

  const ds2v1 = await storeFilesForVersion(ds2Id, 1, [
    {
      name: "validation_samples.json",
      mimeType: "application/json",
      content: nlpSamples,
    },
    {
      name: "label_distribution.csv",
      mimeType: "text/csv",
      content: labelDistCsv,
    },
    { name: "DATASHEET.md", mimeType: "text/markdown", content: nlpDatasheet },
  ]);

  await prisma.dataset.create({
    data: {
      id: ds2Id,
      slug: "open-nlp-sentiment-benchmark",
      title: "Open NLP Sentiment Benchmark Corpus",
      summary:
        "Annotated multi-domain sentiment classification samples with inter-annotator confidence scores and split statistics.",
      description: nlpDatasheet,
      authors: "Elena Vance, David Okafor",
      license: "MIT",
      visibility: "PUBLIC",
      viewCount: 215,
      downloadCount: 64,
      ownerId: demoUser.id,
      tags: {
        create: ["nlp", "sentiment", "benchmark", "json"].map((name) => ({
          tag: { connectOrCreate: { where: { name }, create: { name } } },
        })),
      },
      versions: {
        create: [
          {
            versionNumber: 1,
            changelog: "Initial release with validation samples and split stats.",
            totalBytes: BigInt(ds2v1.totalBytes),
            publishedAt: new Date("2026-01-22T09:15:00Z"),
            files: { create: ds2v1.records },
          },
        ],
      },
    },
  });

  // 3. Synthetic Microscopy Cell Atlas (with PNG image preview)
  const ds3Id = crypto.randomUUID();
  const samplePng = createSamplePng(192, 192);
  const annotationsCsv = [
    "cell_id,image_file,center_x,center_y,radius_px,stain_channel",
    "cell_01,sample_cell_tile.png,38,42,22,teal_gfp",
    "cell_02,sample_cell_tile.png,88,52,18,indigo_dapi",
    "cell_03,sample_cell_tile.png,64,92,24,emerald_rfp",
  ].join("\n");

  const protocolTxt = `SYNTHETIC MICROSCOPY CELL ATLAS - PROTOCOL v1.0
================================================
Resolution: 192x192 RGB PNG tiles
Channels:   Simulated GFP (teal), DAPI (indigo), RFP (emerald)
Purpose:    Unit testing segmentation pipelines and image preview viewers.
`;

  const ds3v1 = await storeFilesForVersion(ds3Id, 1, [
    {
      name: "sample_cell_tile.png",
      mimeType: "image/png",
      content: samplePng,
    },
    {
      name: "annotations.csv",
      mimeType: "text/csv",
      content: annotationsCsv,
    },
    {
      name: "protocol.txt",
      mimeType: "text/plain",
      content: protocolTxt,
    },
  ]);

  await prisma.dataset.create({
    data: {
      id: ds3Id,
      slug: "synthetic-microscopy-cell-atlas",
      title: "Synthetic Microscopy Cell Atlas (Sample)",
      summary:
        "Fluorescence-style synthetic microscopy tiles paired with centroid and radius annotations for segmentation testing.",
      description: `## About This Dataset\n\nProvides lightweight synthetic fluorescence tiles (\`PNG\`) alongside ground-truth centroid annotations (\`CSV\`) and imaging protocol notes (\`TXT\`). Ideal for smoke-testing computer vision pipelines and verifying in-browser image previews.`,
      authors: "Elena Vance, Sofia Lindqvist",
      license: "CC0-1.0",
      visibility: "PUBLIC",
      viewCount: 178,
      downloadCount: 41,
      ownerId: demoUser.id,
      tags: {
        create: ["imaging", "biology", "computer-vision", "png"].map((name) => ({
          tag: { connectOrCreate: { where: { name }, create: { name } } },
        })),
      },
      versions: {
        create: [
          {
            versionNumber: 1,
            changelog: "Initial sample tile with ground-truth annotations.",
            totalBytes: BigInt(ds3v1.totalBytes),
            publishedAt: new Date("2026-02-18T18:00:00Z"),
            files: { create: ds3v1.records },
          },
        ],
      },
    },
  });

  console.log("Seed completed successfully! Demo login: demo@datasethub.local / password123");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
