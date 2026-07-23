/**
 * Storage abstraction layer for horizontal scaling.
 *
 * Currently supports: local (default)
 * Ready for: s3, r2, gcs
 *
 * Set STORAGE_BACKEND=s3 in .env and configure the env vars below.
 */

export type StorageBackend = "local" | "s3" | "r2" | "gcs"

export interface StorageConfig {
  backend: StorageBackend
  endpoint?: string       // S3-compatible endpoint (R2, MinIO)
  region?: string
  bucket?: string
  accessKey?: string
  secretKey?: string
  publicUrl?: string      // CDN/public URL prefix
}

export function getStorageConfig(): StorageConfig {
  const backend = (process.env.STORAGE_BACKEND || "local") as StorageBackend

  return {
    backend,
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    bucket: process.env.S3_BUCKET,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    publicUrl: process.env.S3_PUBLIC_URL,
  }
}

export function isCloudStorage(): boolean {
  const backend = getStorageConfig().backend
  return backend === "s3" || backend === "r2" || backend === "gcs"
}
