/**
 * S3-compatible storage backend (AWS S3, Cloudflare R2, MinIO, etc.)
 *
 * Configure via environment variables:
 *   STORAGE_BACKEND=s3
 *   S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # For R2
 *   S3_REGION=auto                                            # R2 uses "auto"
 *   S3_BUCKET=healthos-uploads
 *   S3_ACCESS_KEY=<your-access-key>
 *   S3_SECRET_KEY=<your-secret-key>
 *   S3_PUBLIC_URL=https://cdn.yourdomain.com                  # Optional CDN URL
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3"
import { getStorageConfig, type StorageConfig } from "./storage-types"

let client: S3Client | null = null
let config: StorageConfig | null = null

function getClient(): { client: S3Client; config: StorageConfig } {
  if (!client || !config) {
    config = getStorageConfig()
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || "auto",
      credentials: {
        accessKeyId: config.accessKey || "",
        secretAccessKey: config.secretKey || "",
      },
      forcePathStyle: true, // Required for R2 and MinIO
      requestChecksumCalculation: "WHEN_REQUIRED" as const,
      responseChecksumValidation: "WHEN_REQUIRED" as const,
    })
  }
  return { client, config }
}

export async function saveToS3(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ key: string; size: number; url: string }> {
  const { client: s3, config: cfg } = getClient()

  await s3.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  )

  const url = cfg.publicUrl
    ? `${cfg.publicUrl}/${key}`
    : `${cfg.endpoint}/${cfg.bucket}/${key}`

  return { key, size: buffer.length, url }
}

export async function readFromS3(key: string): Promise<Buffer> {
  const { client: s3, config: cfg } = getClient()

  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      })
    )

    const chunks: Uint8Array[] = []
    for await (const chunk of result.Body as any) {
      chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk))
    }
    return Buffer.concat(chunks)
  } catch (error) {
    if (error instanceof NoSuchKey) {
      throw new Error("File not found in S3 storage")
    }
    throw error
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  const { client: s3, config: cfg } = getClient()

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      })
    )
  } catch {
    // File may already be removed
  }
}

export function getS3PublicUrl(key: string): string | null {
  const cfg = getStorageConfig()
  if (cfg.publicUrl) {
    return `${cfg.publicUrl}/${key}`
  }
  return null
}
