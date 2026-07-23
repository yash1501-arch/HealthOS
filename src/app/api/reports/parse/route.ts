/**
 * POST /api/reports/parse
 *
 * End-to-end secure medical report parsing pipeline:
 * 1. Accept a file upload (PDF or image) via FormData
 * 2. Detect file type and extract text (pdf-parse for PDF, tesseract.js for images)
 * 3. Strip PHI with aggressive regex patterns (defense-in-depth)
 * 4. Parse remaining clinical data via LLM into structured JSON
 * 5. Persist results to Prisma (MedicalReport, ReportAnalysis, LabResult)
 * 6. Return structured data to the client
 *
 * Security boundaries:
 * - PHI is stripped BEFORE the text is sent to any external LLM
 * - The LLM client has its own PHI filter as a secondary layer
 * - Audit logging tracks all AI interactions
 * - File size and type validation at the boundary
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { saveReportFile } from "@/lib/storage"
import { stripPHI, type StripPHIResult } from "@/lib/ai/phi-filter"
import { reportParser } from "@/lib/ai/report-parser"
import { logAIInteraction } from "@/lib/ai/audit-logger"
import { MAX_REPORT_FILE_BYTES, ALLOWED_REPORT_MIME_TYPES } from "@/lib/reports/constants"

// ─── Request Validation ─────────────────────────────────────────

interface ParseRequestValidation {
  file: File
  reportType?: string
  title?: string
  reportDate?: string
  institutionName?: string
}

function validateParseRequest(formData: FormData): ParseRequestValidation {
  const file = formData.get("file") as File | null
  if (!file) {
    throw new ValidationError("No file provided")
  }

  if (file.size > MAX_REPORT_FILE_BYTES) {
    throw new ValidationError(
      `File too large (max ${MAX_REPORT_FILE_BYTES / 1024 / 1024}MB)`
    )
  }

  if (!ALLOWED_REPORT_MIME_TYPES.includes(file.type as any)) {
    throw new ValidationError(
      `Unsupported file type: ${file.type}. Allowed: PDF, JPEG, PNG.`
    )
  }

  return {
    file,
    reportType: (formData.get("reportType") as string) || undefined,
    title: (formData.get("title") as string) || undefined,
    reportDate: (formData.get("reportDate") as string) || undefined,
    institutionName: (formData.get("institutionName") as string) || undefined,
  }
}

// ─── Text Extraction (OCR) ──────────────────────────────────────

/**
 * Extracts raw text from a file buffer using the appropriate engine.
 *
 * PDFs: Uses pdf-parse for native text extraction.
 * Images: Uses tesseract.js for OCR (works offline, no API key required).
 */
async function extractRawText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const startedAt = Date.now()
  let rawText: string

  if (mimeType === "application/pdf") {
    rawText = await extractTextFromPdf(buffer)
  } else if (mimeType === "image/jpeg" || mimeType === "image/png") {
    rawText = await extractTextFromImage(buffer)
  } else {
    throw new ValidationError(`Unsupported MIME type for text extraction: ${mimeType}`)
  }

  const elapsed = Date.now() - startedAt
  console.log(
    `[ReportParse] Text extraction (${mimeType}): ${rawText.length} chars in ${elapsed}ms`
  )

  if (!rawText.trim()) {
    throw new Error("No text could be extracted from the file. Try a clearer scan or a different format.")
  }

  return rawText
}

/**
 * Extracts text from a PDF buffer using pdf-parse.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    return result.text?.trim() ?? ""
  } catch (error) {
    console.error("[ReportParse] PDF text extraction failed:", error)
    throw new Error(
      "Could not extract text from PDF. Ensure the PDF contains selectable text, not just scanned images."
    )
  }
}

/**
 * Extracts text from an image buffer using tesseract.js (offline OCR).
 * No external API key required — runs entirely on the server.
 */
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const Tesseract = await import("tesseract.js")
    const { data } = await Tesseract.recognize(buffer, "eng", {
      logger: (info: { status: string }) => {
        if (info.status === "recognizing text") {
          // Progress logging — reduce noise in production
        }
      },
    })
    return data.text?.trim() ?? ""
  } catch (error) {
    console.error("[ReportParse] Image OCR failed:", error)
    throw new Error(
      "Could not read text from image. Try a clearer scan with better lighting and contrast."
    )
  }
}

// ─── Route Handler ──────────────────────────────────────────────

/**
 * POST /api/reports/parse
 *
 * Accepts a FormData payload with a medical report file (PDF or image),
 * extracts text, strips PHI, parses with LLM, and persists results.
 */
export async function POST(request: Request) {
  const startedAt = Date.now()

  try {
    // ── Step 0: Authenticate ──────────────────────────────────
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    // ── Step 1: Validate input ────────────────────────────────
    const formData = await request.formData()
    const { file, reportType, title, reportDate, institutionName } =
      validateParseRequest(formData)
    const buffer = Buffer.from(await file.arrayBuffer())

    // ── Step 2: Save file to storage ──────────────────────────
    const { fileKey, fileSizeBytes } = await saveReportFile(
      userId,
      buffer,
      file.type,
      file.name
    )

    // ── Step 3: Create MedicalReport record (status: processing) ─
    const report = await prisma.medicalReport.create({
      data: {
        userId,
        reportType: reportType ?? null,
        title: title || file.name,
        fileKey,
        fileSizeBytes,
        mimeType: file.type,
        reportDate: reportDate ? new Date(reportDate) : null,
        institutionName: institutionName ?? null,
        status: "processing",
      },
    })

    try {
      // ── Step 4: Extract raw text ────────────────────────────
      const rawText = await extractRawText(buffer, file.type)

      // ── Step 5: Strip PHI ───────────────────────────────────
      const phiResult: StripPHIResult = stripPHI(rawText)
      const sanitizedText = phiResult.sanitized

      console.log(
        `[ReportParse] PHI filter: ${phiResult.redactedCount} items redacted ` +
        `(${phiResult.redactions.map((r) => r.category).join(", ")})`
      )

      // ── Step 6: Parse with LLM ──────────────────────────────
      const parseStartedAt = Date.now()
      const parsedResults = await reportParser.parse(userId, sanitizedText)
      const processingTimeMs = Date.now() - parseStartedAt

      // ── Step 7: Persist to database ─────────────────────────
      await prisma.$transaction(async (tx) => {
        // 7a. Save lab results
        if (parsedResults.labResults.length > 0) {
          await tx.labResult.createMany({
            data: parsedResults.labResults.map((lab) => ({
              userId,
              reportId: report.id,
              testName: lab.testName,
              testCategory: lab.category || null,
              value: safeParseFloat(lab.value),
              unit: lab.unit || null,
              referenceRange: lab.referenceRange || null,
              isAbnormal: lab.isAbnormal,
              flag: lab.flag === "unknown" ? null : lab.flag,
              testDate: reportDate ? new Date(reportDate) : null,
            })),
          })
        }

        // 7b. Save report analysis
        await tx.reportAnalysis.create({
          data: {
            reportId: report.id,
            userId,
            rawText: sanitizedText.slice(0, 50_000),
            parsedData: {
              labResults: parsedResults.labResults,
              summary: parsedResults.summary,
              reportDate: parsedResults.reportDate,
              institutionName: parsedResults.institutionName,
              phiRedacted: phiResult.redactedCount,
              phiCategories: [...new Set(phiResult.redactions.map((r) => r.category))],
            },
            patientSummary: parsedResults.summary || null,
            confidenceScore:
              parsedResults.labResults.length > 0 ? 0.85 : 0.0,
            processingTimeMs: processingTimeMs,
            modelVersion: "gpt-4o",
          },
        })

        // 7c. Update report status
        const status =
          parsedResults.labResults.length > 0 ? "completed" : "partial"
        await tx.medicalReport.update({
          where: { id: report.id },
          data: { status },
        })

        // 7d. Add timeline entry
        await tx.healthTimelineEntry.create({
          data: {
            userId,
            eventType: "report_parsed",
            referenceId: report.id,
            title: title || file.name,
            description:
              parsedResults.summary?.slice(0, 280) ||
              `${parsedResults.labResults.length} lab values extracted`,
            eventDate: new Date(),
            metadata: {
              reportType: reportType ?? null,
              labResultCount: parsedResults.labResults.length,
              phiRedactedCount: phiResult.redactedCount,
              processingTimeMs: processingTimeMs,
            },
          },
        })
      })

      // ── Step 8: Audit log (high-level parse operation) ──────
      // Note: The LLM client (llm-client.ts) also logs the individual API call
      // with actual token counts. This is a higher-level log for the full parse pipeline.
      try {
        await logAIInteraction({
          userId,
          interactionType: "report_parse_pipeline",
          model: "gpt-4o",
          tokensUsed: 0,
          costUsd: 0,
          safetyFlags: phiResult.redactions.map((r) => r.category),
          input: `Parse report: ${file.name} (${file.type}, ${file.size} bytes, ${phiResult.redactedCount} PHI items removed)`,
          output: `${parsedResults.labResults.length} lab results extracted`,
          latencyMs: processingTimeMs,
          provider: "openai",
        })
      } catch (auditError) {
        // Audit logging should never break the response
        console.error("[ReportParse] Audit log failed:", auditError)
      }

      // ── Step 9: Return results ──────────────────────────────
      return NextResponse.json(
        {
          data: {
            reportId: report.id,
            status:
              parsedResults.labResults.length > 0 ? "completed" : "partial",
            labResults: parsedResults.labResults,
            summary: parsedResults.summary,
            phiRedactedCount: phiResult.redactedCount,
            processingTimeMs: processingTimeMs,
          },
        },
        { status: 201 }
      )
    } catch (processingError) {
      // ── Error: Mark report as failed ────────────────────────
      console.error("[ReportParse] Processing failed:", processingError)

      await prisma.reportAnalysis.upsert({
        where: { reportId: report.id },
        create: {
          reportId: report.id,
          userId,
          patientSummary:
            processingError instanceof Error
              ? processingError.message
              : "Report parsing failed",
          doctorSummary: "Parsing failed.",
          processingTimeMs: Date.now() - startedAt,
          modelVersion: "error",
        },
        update: {
          patientSummary:
            processingError instanceof Error
              ? processingError.message
              : "Report parsing failed",
          doctorSummary: "Parsing failed.",
          processingTimeMs: Date.now() - startedAt,
          modelVersion: "error",
        },
      })

      await prisma.medicalReport.update({
        where: { id: report.id },
        data: { status: "failed" },
      })

      return NextResponse.json(
        {
          error: {
            code: "PARSE_FAILED",
            message:
              processingError instanceof Error
                ? processingError.message
                : "Report parsing failed",
          },
        },
        { status: 422 }
      )
    }
  } catch (error) {
    // ── Top-level error handler ───────────────────────────────
    console.error("[ReportParse] Unexpected error:", error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.message } },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    )
  }
}

/**
 * Safely parses a string to a float, returning null for non-numeric values.
 */
function safeParseFloat(value: string): number | null {
  if (!value || typeof value !== "string") return null
  const trimmed = value.trim()
  // Skip non-numeric patterns like "Positive", "Detected", "<0.5", ">100"
  if (/^[<>]/.test(trimmed)) return null
  if (/^[A-Za-z]/.test(trimmed) && !/^[\d.]+$/.test(trimmed)) return null
  const parsed = parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

// ─── Custom Error ───────────────────────────────────────────────

class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}
