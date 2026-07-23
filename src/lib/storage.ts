/**
 * Storage abstraction — automatically uses S3 or local disk
 * based on the STORAGE_BACKEND environment variable.
 *
 * STORAGE_BACKEND=local  → saves to ./uploads/ (default)
 * STORAGE_BACKEND=s3     → saves to S3/R2/MinIO
 * STORAGE_BACKEND=r2     → alias for s3
 */

import { mkdir, writeFile, readFile, unlink } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { isCloudStorage } from "./storage-types"
import { saveToS3, readFromS3, deleteFromS3, getS3PublicUrl } from "./storage-s3"

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")

// ─── Local Storage ──────────────────────────────────────────────

function resolveLocalPath(fileKey: string): string {
  const normalized = path.normalize(fileKey).replace(/^(\.\.(\/|\\|$))+/, "")
  const fullPath = path.join(UPLOAD_ROOT, normalized)
  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid file key")
  }
  return fullPath
}

async function saveLocal(key: string, buffer: Buffer): Promise<void> {
  const fullPath = resolveLocalPath(key)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, buffer)
}

async function readLocal(key: string): Promise<Buffer> {
  return readFile(resolveLocalPath(key))
}

async function deleteLocal(key: string): Promise<void> {
  try {
    await unlink(resolveLocalPath(key))
  } catch {
    // File may already be removed
  }
}

function localFileUrl(key: string): string {
  return `/api/reports/file?key=${encodeURIComponent(key)}`
}

// ─── Auto-detecting Storage ─────────────────────────────────────

export async function saveReportFile(
  userId: string,
  file: Buffer,
  mimeType: string,
  originalName: string
): Promise<{ fileKey: string; fileSizeBytes: number }> {
  const ext = path.extname(originalName) || mimeToExt(mimeType)
  const fileKey = `reports/${userId}/${randomUUID()}${ext}`

  if (isCloudStorage()) {
    await saveToS3(fileKey, file, mimeType)
  } else {
    await saveLocal(fileKey, file)
  }

  return { fileKey, fileSizeBytes: file.length }
}

export async function readReportFile(fileKey: string): Promise<Buffer> {
  if (isCloudStorage()) {
    return readFromS3(fileKey)
  }
  return readLocal(fileKey)
}

export async function deleteReportFile(fileKey: string): Promise<void> {
  if (isCloudStorage()) {
    await deleteFromS3(fileKey)
  } else {
    await deleteLocal(fileKey)
  }
}

export function getReportFileUrl(fileKey: string): string {
  if (isCloudStorage()) {
    return getS3PublicUrl(fileKey) || `/api/reports/file?key=${encodeURIComponent(fileKey)}`
  }
  return `/api/reports/file?key=${encodeURIComponent(fileKey)}`
}

function mimeToExt(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf": return ".pdf"
    case "image/jpeg": return ".jpg"
    case "image/png": return ".png"
    default: return ""
  }
}
