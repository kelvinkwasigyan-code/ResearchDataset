import type {
  Dataset,
  DatasetFile,
  DatasetTag,
  DatasetVersion,
  Tag,
  User,
} from "@prisma/client";

export interface SerializedFile {
  id: string;
  versionId: string;
  originalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
}

export interface SerializedVersion {
  id: string;
  datasetId: string;
  versionNumber: number;
  changelog: string;
  totalBytes: number;
  publishedAt: string;
  files: SerializedFile[];
}

export interface SerializedDataset {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  authors: string;
  license: string;
  visibility: string;
  viewCount: number;
  downloadCount: number;
  ownerId: string;
  owner?: { id: string; name: string; email?: string };
  tags: string[];
  versions: SerializedVersion[];
  createdAt: string;
  updatedAt: string;
}

type FullDataset = Dataset & {
  owner?: Pick<User, "id" | "name">;
  tags?: (DatasetTag & { tag: Tag })[];
  versions?: (DatasetVersion & { files?: DatasetFile[] })[];
};

export function serializeDataset(dataset: FullDataset): SerializedDataset {
  return {
    id: dataset.id,
    slug: dataset.slug,
    title: dataset.title,
    summary: dataset.summary,
    description: dataset.description,
    authors: dataset.authors,
    license: dataset.license,
    visibility: dataset.visibility,
    viewCount: dataset.viewCount,
    downloadCount: dataset.downloadCount,
    ownerId: dataset.ownerId,
    owner: dataset.owner
      ? { id: dataset.owner.id, name: dataset.owner.name }
      : undefined,
    tags: dataset.tags ? dataset.tags.map((t) => t.tag.name) : [],
    versions: (dataset.versions ?? [])
      .slice()
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((v) => ({
        id: v.id,
        datasetId: v.datasetId,
        versionNumber: v.versionNumber,
        changelog: v.changelog,
        totalBytes: Number(v.totalBytes),
        publishedAt: v.publishedAt.toISOString(),
        files: (v.files ?? []).map((f) => ({
          id: f.id,
          versionId: f.versionId,
          originalName: f.originalName,
          mimeType: f.mimeType,
          extension: f.extension,
          sizeBytes: f.sizeBytes,
          sha256: f.sha256,
          createdAt: f.createdAt.toISOString(),
        })),
      })),
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  };
}
