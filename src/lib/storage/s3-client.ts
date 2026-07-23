import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner"

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number]

export interface S3UploadResult {
  key: string
  url: string
  size: number
}

let cachedClient: S3Client | null = null

/**
 * Returns the configured S3-compatible client (AWS S3, Cloudflare R2, or MinIO).
 */
function getS3Client(): S3Client {
  if (cachedClient) return cachedClient

  const endpoint = process.env.S3_ENDPOINT
  const region = process.env.S3_REGION || "auto"
  const accessKey = process.env.S3_ACCESS_KEY
  const secretKey = process.env.S3_SECRET_KEY

  if (!process.env.S3_BUCKET) {
    throw new Error("S3_BUCKET environment variable is not set")
  }

  cachedClient = new S3Client({
    endpoint,
    region,
    credentials:
      accessKey && secretKey
        ? { accessKeyId: accessKey, secretAccessKey: secretKey }
        : undefined,
    forcePathStyle: Boolean(endpoint),
  })

  return cachedClient
}

/**
 * Builds the public or endpoint-based URL for an object key.
 */
function buildObjectUrl(key: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`
  }

  const bucket = process.env.S3_BUCKET
  const endpoint = process.env.S3_ENDPOINT
  if (endpoint && bucket) {
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`
  }

  const region = process.env.S3_REGION || "us-east-1"
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

/**
 * Validates upload size and MIME type before storage operations.
 */
export function validateUploadFile(
  file: Buffer,
  contentType: string
): { valid: true } | { valid: false; message: string } {
  if (file.length > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      message: `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)`,
    }
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(contentType as AllowedUploadMimeType)) {
    return {
      valid: false,
      message: "Unsupported file type. Upload PDF, JPG, PNG, or WEBP.",
    }
  }

  return { valid: true }
}

/**
 * Uploads a file buffer to S3-compatible storage and returns its URL.
 */
export async function uploadFile(
  file: Buffer,
  key: string,
  contentType: string
): Promise<S3UploadResult> {
  try {
    const validation = validateUploadFile(file, contentType)
    if (!validation.valid) {
      throw new Error(validation.message)
    }

    const bucket = process.env.S3_BUCKET
    if (!bucket) {
      throw new Error("S3_BUCKET environment variable is not set")
    }

    const client = getS3Client()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    )

    return {
      key,
      url: buildObjectUrl(key),
      size: file.length,
    }
  } catch (error) {
    console.error("S3 upload failed:", error)
    throw error instanceof Error ? error : new Error("S3 upload failed")
  }
}

/**
 * Generates a time-limited signed URL for secure file downloads.
 */
export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  try {
    const bucket = process.env.S3_BUCKET
    if (!bucket) {
      throw new Error("S3_BUCKET environment variable is not set")
    }

    const client = getS3Client()
    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    return awsGetSignedUrl(client, command, { expiresIn })
  } catch (error) {
    console.error("S3 signed URL generation failed:", error)
    throw error instanceof Error ? error : new Error("Failed to generate signed URL")
  }
}

/**
 * Deletes an object from S3-compatible storage.
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const bucket = process.env.S3_BUCKET
    if (!bucket) {
      throw new Error("S3_BUCKET environment variable is not set")
    }

    const client = getS3Client()
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )
  } catch (error) {
    console.error("S3 delete failed:", error)
    throw error instanceof Error ? error : new Error("S3 delete failed")
  }
}

/**
 * Reads an object from S3-compatible storage into a buffer.
 */
export async function readFile(key: string): Promise<Buffer> {
  try {
    const bucket = process.env.S3_BUCKET
    if (!bucket) {
      throw new Error("S3_BUCKET environment variable is not set")
    }

    const client = getS3Client()
    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )

    const chunks: Uint8Array[] = []
    for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk))
    }
    return Buffer.concat(chunks)
  } catch (error) {
    console.error("S3 read failed:", error)
    throw error instanceof Error ? error : new Error("S3 read failed")
  }
}

/**
 * Returns the public URL for a stored object key when available.
 */
export function getPublicUrl(key: string): string {
  return buildObjectUrl(key)
}
