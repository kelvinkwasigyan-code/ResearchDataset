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
