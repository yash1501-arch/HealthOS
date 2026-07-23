import sharp from "sharp"
import { createWorker, type Worker } from "tesseract.js"

export type LabValueStatus = "normal" | "high" | "low" | "unknown"

export interface ParsedLabValue {
  testName: string
  value: number
  unit: string
  referenceRange: string
  status: LabValueStatus
}

export interface StandardizedLabValue extends ParsedLabValue {
  standardName: string
  standardUnit: string
  standardValue: number
  isAbnormal: boolean
  category: string
}

interface LabTestDefinition {
  standardName: string
  aliases: string[]
  defaultUnit: string
  category: string
  referenceRange: string
  /** Optional numeric bounds for flagging when report omits a range. */
  bounds?: { low: number; high: number }
}

const LAB_TEST_DEFINITIONS: LabTestDefinition[] = [
  { standardName: "Hemoglobin", aliases: ["hemoglobin", "hb", "hgb"], defaultUnit: "g/dL", category: "Blood Count", referenceRange: "12.0-17.5", bounds: { low: 12, high: 17.5 } },
  { standardName: "Hematocrit", aliases: ["hematocrit", "hct", "packed cell volume", "pcv"], defaultUnit: "%", category: "Blood Count", referenceRange: "36-50", bounds: { low: 36, high: 50 } },
  { standardName: "RBC", aliases: ["rbc", "red blood cell count", "red blood cells"], defaultUnit: "x10^6/uL", category: "Blood Count", referenceRange: "4.2-5.9", bounds: { low: 4.2, high: 5.9 } },
  { standardName: "WBC", aliases: ["wbc", "white blood cell count", "white blood cells", "leukocytes"], defaultUnit: "x10^3/uL", category: "Blood Count", referenceRange: "4.0-11.0", bounds: { low: 4, high: 11 } },
  { standardName: "Platelets", aliases: ["platelets", "plt", "platelet count"], defaultUnit: "x10^3/uL", category: "Blood Count", referenceRange: "150-400", bounds: { low: 150, high: 400 } },
  { standardName: "MCV", aliases: ["mcv", "mean corpuscular volume"], defaultUnit: "fL", category: "Blood Count", referenceRange: "80-100", bounds: { low: 80, high: 100 } },
  { standardName: "MCH", aliases: ["mch", "mean corpuscular hemoglobin"], defaultUnit: "pg", category: "Blood Count", referenceRange: "27-33", bounds: { low: 27, high: 33 } },
  { standardName: "MCHC", aliases: ["mchc"], defaultUnit: "g/dL", category: "Blood Count", referenceRange: "32-36", bounds: { low: 32, high: 36 } },
  { standardName: "RDW", aliases: ["rdw", "red cell distribution width"], defaultUnit: "%", category: "Blood Count", referenceRange: "11.5-14.5", bounds: { low: 11.5, high: 14.5 } },
  { standardName: "Neutrophils", aliases: ["neutrophils", "neutrophil count", "neut %"], defaultUnit: "%", category: "Blood Count", referenceRange: "40-70", bounds: { low: 40, high: 70 } },
  { standardName: "Lymphocytes", aliases: ["lymphocytes", "lymphocyte count", "lymph %"], defaultUnit: "%", category: "Blood Count", referenceRange: "20-40", bounds: { low: 20, high: 40 } },
  { standardName: "Monocytes", aliases: ["monocytes", "mono %"], defaultUnit: "%", category: "Blood Count", referenceRange: "2-8", bounds: { low: 2, high: 8 } },
  { standardName: "Eosinophils", aliases: ["eosinophils", "eos %"], defaultUnit: "%", category: "Blood Count", referenceRange: "1-4", bounds: { low: 1, high: 4 } },
  { standardName: "Basophils", aliases: ["basophils", "baso %"], defaultUnit: "%", category: "Blood Count", referenceRange: "0-1", bounds: { low: 0, high: 1 } },
  { standardName: "HbA1c", aliases: ["hba1c", "a1c", "glycated hemoglobin", "glycosylated hemoglobin"], defaultUnit: "%", category: "Metabolic", referenceRange: "4.0-5.6", bounds: { low: 4, high: 5.6 } },
  { standardName: "Fasting Glucose", aliases: ["fasting glucose", "glucose fasting", "fbs", "fasting blood sugar"], defaultUnit: "mg/dL", category: "Metabolic", referenceRange: "70-99", bounds: { low: 70, high: 99 } },
  { standardName: "Random Glucose", aliases: ["random glucose", "glucose random", "blood sugar"], defaultUnit: "mg/dL", category: "Metabolic", referenceRange: "70-140", bounds: { low: 70, high: 140 } },
  { standardName: "Insulin", aliases: ["insulin", "fasting insulin"], defaultUnit: "uIU/mL", category: "Metabolic", referenceRange: "2.6-24.9", bounds: { low: 2.6, high: 24.9 } },
  { standardName: "Total Cholesterol", aliases: ["total cholesterol", "cholesterol total", "serum cholesterol"], defaultUnit: "mg/dL", category: "Lipid Panel", referenceRange: "<200", bounds: { low: 0, high: 200 } },
  { standardName: "LDL Cholesterol", aliases: ["ldl", "ldl cholesterol", "ldl-c"], defaultUnit: "mg/dL", category: "Lipid Panel", referenceRange: "<100", bounds: { low: 0, high: 100 } },
  { standardName: "HDL Cholesterol", aliases: ["hdl", "hdl cholesterol", "hdl-c"], defaultUnit: "mg/dL", category: "Lipid Panel", referenceRange: ">40", bounds: { low: 40, high: 999 } },
  { standardName: "Triglycerides", aliases: ["triglycerides", "tg", "trigs"], defaultUnit: "mg/dL", category: "Lipid Panel", referenceRange: "<150", bounds: { low: 0, high: 150 } },
  { standardName: "VLDL", aliases: ["vldl", "vldl cholesterol"], defaultUnit: "mg/dL", category: "Lipid Panel", referenceRange: "5-40", bounds: { low: 5, high: 40 } },
  { standardName: "Non-HDL Cholesterol", aliases: ["non-hdl cholesterol", "non hdl"], defaultUnit: "mg/dL", category: "Lipid Panel", referenceRange: "<130", bounds: { low: 0, high: 130 } },
  { standardName: "TSH", aliases: ["tsh", "thyroid stimulating hormone"], defaultUnit: "mIU/L", category: "Thyroid", referenceRange: "0.4-4.0", bounds: { low: 0.4, high: 4 } },
  { standardName: "Free T4", aliases: ["free t4", "ft4", "thyroxine free"], defaultUnit: "ng/dL", category: "Thyroid", referenceRange: "0.8-1.8", bounds: { low: 0.8, high: 1.8 } },
  { standardName: "Free T3", aliases: ["free t3", "ft3", "triiodothyronine free"], defaultUnit: "pg/mL", category: "Thyroid", referenceRange: "2.3-4.2", bounds: { low: 2.3, high: 4.2 } },
  { standardName: "Total T4", aliases: ["total t4", "t4 total", "thyroxine"], defaultUnit: "ug/dL", category: "Thyroid", referenceRange: "4.5-12.0", bounds: { low: 4.5, high: 12 } },
  { standardName: "Total T3", aliases: ["total t3", "t3 total"], defaultUnit: "ng/dL", category: "Thyroid", referenceRange: "80-200", bounds: { low: 80, high: 200 } },
  { standardName: "Vitamin D", aliases: ["vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d", "vit d"], defaultUnit: "ng/mL", category: "Vitamins", referenceRange: "30-100", bounds: { low: 30, high: 100 } },
  { standardName: "Vitamin B12", aliases: ["vitamin b12", "b12", "cobalamin"], defaultUnit: "pg/mL", category: "Vitamins", referenceRange: "200-900", bounds: { low: 200, high: 900 } },
  { standardName: "Folate", aliases: ["folate", "folic acid"], defaultUnit: "ng/mL", category: "Vitamins", referenceRange: ">3.0", bounds: { low: 3, high: 999 } },
  { standardName: "Iron", aliases: ["iron", "serum iron"], defaultUnit: "ug/dL", category: "Minerals", referenceRange: "60-170", bounds: { low: 60, high: 170 } },
  { standardName: "Ferritin", aliases: ["ferritin"], defaultUnit: "ng/mL", category: "Minerals", referenceRange: "12-300", bounds: { low: 12, high: 300 } },
  { standardName: "TIBC", aliases: ["tibc", "total iron binding capacity"], defaultUnit: "ug/dL", category: "Minerals", referenceRange: "250-450", bounds: { low: 250, high: 450 } },
  { standardName: "Transferrin Saturation", aliases: ["transferrin saturation", "iron saturation"], defaultUnit: "%", category: "Minerals", referenceRange: "20-50", bounds: { low: 20, high: 50 } },
  { standardName: "Calcium", aliases: ["calcium", "serum calcium"], defaultUnit: "mg/dL", category: "Minerals", referenceRange: "8.6-10.2", bounds: { low: 8.6, high: 10.2 } },
  { standardName: "Magnesium", aliases: ["magnesium", "serum magnesium"], defaultUnit: "mg/dL", category: "Minerals", referenceRange: "1.7-2.2", bounds: { low: 1.7, high: 2.2 } },
  { standardName: "Phosphorus", aliases: ["phosphorus", "phosphate"], defaultUnit: "mg/dL", category: "Minerals", referenceRange: "2.5-4.5", bounds: { low: 2.5, high: 4.5 } },
  { standardName: "Creatinine", aliases: ["creatinine", "serum creatinine"], defaultUnit: "mg/dL", category: "Kidney", referenceRange: "0.6-1.2", bounds: { low: 0.6, high: 1.2 } },
  { standardName: "BUN", aliases: ["bun", "blood urea nitrogen", "urea"], defaultUnit: "mg/dL", category: "Kidney", referenceRange: "7-20", bounds: { low: 7, high: 20 } },
  { standardName: "eGFR", aliases: ["egfr", "gfr", "estimated gfr"], defaultUnit: "mL/min/1.73m2", category: "Kidney", referenceRange: ">60", bounds: { low: 60, high: 999 } },
  { standardName: "Uric Acid", aliases: ["uric acid"], defaultUnit: "mg/dL", category: "Kidney", referenceRange: "3.5-7.2", bounds: { low: 3.5, high: 7.2 } },
  { standardName: "ALT", aliases: ["alt", "sgpt", "alanine aminotransferase"], defaultUnit: "U/L", category: "Liver", referenceRange: "7-56", bounds: { low: 7, high: 56 } },
  { standardName: "AST", aliases: ["ast", "sgot", "aspartate aminotransferase"], defaultUnit: "U/L", category: "Liver", referenceRange: "10-40", bounds: { low: 10, high: 40 } },
  { standardName: "ALP", aliases: ["alp", "alkaline phosphatase"], defaultUnit: "U/L", category: "Liver", referenceRange: "44-147", bounds: { low: 44, high: 147 } },
  { standardName: "GGT", aliases: ["ggt", "gamma gt", "gamma glutamyl transferase"], defaultUnit: "U/L", category: "Liver", referenceRange: "9-48", bounds: { low: 9, high: 48 } },
  { standardName: "Total Bilirubin", aliases: ["total bilirubin", "bilirubin total"], defaultUnit: "mg/dL", category: "Liver", referenceRange: "0.1-1.2", bounds: { low: 0.1, high: 1.2 } },
  { standardName: "Direct Bilirubin", aliases: ["direct bilirubin", "conjugated bilirubin"], defaultUnit: "mg/dL", category: "Liver", referenceRange: "0.0-0.3", bounds: { low: 0, high: 0.3 } },
  { standardName: "Albumin", aliases: ["albumin", "serum albumin"], defaultUnit: "g/dL", category: "Liver", referenceRange: "3.5-5.0", bounds: { low: 3.5, high: 5 } },
  { standardName: "Total Protein", aliases: ["total protein", "serum protein"], defaultUnit: "g/dL", category: "Liver", referenceRange: "6.0-8.3", bounds: { low: 6, high: 8.3 } },
  { standardName: "CRP", aliases: ["crp", "c-reactive protein"], defaultUnit: "mg/L", category: "Inflammation", referenceRange: "<3.0", bounds: { low: 0, high: 3 } },
  { standardName: "ESR", aliases: ["esr", "sed rate", "erythrocyte sedimentation rate"], defaultUnit: "mm/hr", category: "Inflammation", referenceRange: "0-20", bounds: { low: 0, high: 20 } },
  { standardName: "Sodium", aliases: ["sodium", "na"], defaultUnit: "mEq/L", category: "Electrolytes", referenceRange: "136-145", bounds: { low: 136, high: 145 } },
  { standardName: "Potassium", aliases: ["potassium", "k"], defaultUnit: "mEq/L", category: "Electrolytes", referenceRange: "3.5-5.1", bounds: { low: 3.5, high: 5.1 } },
  { standardName: "Chloride", aliases: ["chloride", "cl"], defaultUnit: "mEq/L", category: "Electrolytes", referenceRange: "98-106", bounds: { low: 98, high: 106 } },
  { standardName: "CO2", aliases: ["co2", "bicarbonate", "hco3"], defaultUnit: "mEq/L", category: "Electrolytes", referenceRange: "23-29", bounds: { low: 23, high: 29 } },
  { standardName: "PSA", aliases: ["psa", "prostate specific antigen"], defaultUnit: "ng/mL", category: "Tumor Markers", referenceRange: "<4.0", bounds: { low: 0, high: 4 } },
  { standardName: "D-Dimer", aliases: ["d-dimer", "d dimer"], defaultUnit: "ug/mL", category: "Coagulation", referenceRange: "<0.5", bounds: { low: 0, high: 0.5 } },
  { standardName: "PT", aliases: ["pt", "prothrombin time"], defaultUnit: "sec", category: "Coagulation", referenceRange: "11-13.5", bounds: { low: 11, high: 13.5 } },
  { standardName: "INR", aliases: ["inr"], defaultUnit: "ratio", category: "Coagulation", referenceRange: "0.8-1.2", bounds: { low: 0.8, high: 1.2 } },
  { standardName: "APTT", aliases: ["aptt", "ptt", "partial thromboplastin time"], defaultUnit: "sec", category: "Coagulation", referenceRange: "25-35", bounds: { low: 25, high: 35 } },
]

let ocrWorker: Worker | null = null

/**
 * Returns a shared Tesseract worker instance for OCR operations.
 */
async function getOcrWorker(): Promise<Worker> {
  if (!ocrWorker) {
    ocrWorker = await createWorker("eng")
  }
  return ocrWorker
}

/**
 * Preprocesses an image buffer to improve OCR accuracy.
 */
async function preprocessImageForOcr(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer()
}

/**
 * Extracts text from an image buffer using Tesseract.js OCR.
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  try {
    const worker = await getOcrWorker()
    const processed = await preprocessImageForOcr(imageBuffer)
    const result = await worker.recognize(processed)
    const text = result.data.text?.trim() ?? ""
    if (!text) {
      throw new Error("Could not extract text from image. Try a clearer scan.")
    }
    return text
  } catch (error) {
    console.error("Image OCR failed:", error)
    throw error instanceof Error ? error : new Error("Image OCR failed")
  }
}

/**
 * Renders PDF pages to PNG buffers for OCR fallback processing.
 */
async function renderPdfPagesToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const { createCanvas } = await import("@napi-rs/canvas")

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer), useSystemFonts: true })
  const pdf = await loadingTask.promise
  const images: Buffer[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = createCanvas(viewport.width, viewport.height)

    // pdfjs-dist v6 expects an HTMLCanvasElement-like object for server-side rendering.
    // @napi-rs/canvas provides a compatible canvas object.
    const renderTask = page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    })

    await renderTask.promise
    images.push(canvas.toBuffer("image/png"))
  }

  return images
}

/**
 * Extracts text from a PDF buffer using pdf-parse, with OCR fallback for scanned documents.
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: pdfBuffer })
    const result = await parser.getText()
    await parser.destroy()

    const text = result.text?.trim() ?? ""
    if (text.length >= 50) {
      return text
    }

    const pageImages = await renderPdfPagesToImages(pdfBuffer)
    const ocrChunks: string[] = []
    for (const image of pageImages) {
      const pageText = await extractTextFromImage(image)
      if (pageText) ocrChunks.push(pageText)
    }

    const ocrText = ocrChunks.join("\n\n").trim()
    if (!ocrText) {
      throw new Error("Could not extract text from PDF. Try a clearer scan or upload an image.")
    }
    return ocrText
  } catch (error) {
    console.error("PDF text extraction failed:", error)
    throw error instanceof Error ? error : new Error("PDF text extraction failed")
  }
}

/**
 * Extracts text from a report file buffer based on MIME type.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractTextFromPDF(buffer)
  }
  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp"
  ) {
    return extractTextFromImage(buffer)
  }
  throw new Error("Unsupported file type for OCR")
}

/**
 * Escapes a string for safe use inside a regular expression.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Builds regex patterns for a lab test definition and its aliases.
 */
function buildLabPatterns(definition: LabTestDefinition): RegExp[] {
  const aliases = [definition.standardName, ...definition.aliases]
  return aliases.map((alias) => {
    const name = escapeRegex(alias)
    return new RegExp(
      `(?:^|\\b)${name}\\s*[:\\-]?\\s*([\\d.]+)\\s*([a-zA-Z/%μµ^0-9\\.\\-]+)?(?:\\s*\\(?\\s*([\\d.\\-–to<> ]+)\\s*\\)?)?`,
      "i"
    )
  })
}

/**
 * Determines whether a numeric value is low, high, or normal for a given reference range.
 */
function inferLabStatus(value: number, referenceRange: string, bounds?: { low: number; high: number }): LabValueStatus {
  const range = referenceRange.trim()

  const betweenMatch = range.match(/([\d.]+)\s*[-–to]+\s*([\d.]+)/i)
  if (betweenMatch) {
    const low = parseFloat(betweenMatch[1])
    const high = parseFloat(betweenMatch[2])
    if (!Number.isNaN(low) && value < low) return "low"
    if (!Number.isNaN(high) && value > high) return "high"
    return "normal"
  }

  const upperMatch = range.match(/<\s*([\d.]+)/)
  if (upperMatch) {
    const max = parseFloat(upperMatch[1])
    if (!Number.isNaN(max) && value > max) return "high"
    return "normal"
  }

  const lowerMatch = range.match(/>\s*([\d.]+)/)
  if (lowerMatch) {
    const min = parseFloat(lowerMatch[1])
    if (!Number.isNaN(min) && value < min) return "low"
    return "normal"
  }

  if (bounds) {
    if (value < bounds.low) return "low"
    if (value > bounds.high) return "high"
    return "normal"
  }

  return "unknown"
}

/**
 * Parses lab values from raw OCR text using regex patterns for common tests.
 */
export function parseLabValues(rawText: string): ParsedLabValue[] {
  const normalized = rawText.replace(/\r/g, "\n")
  const results: ParsedLabValue[] = []
  const seen = new Set<string>()

  for (const definition of LAB_TEST_DEFINITIONS) {
    for (const pattern of buildLabPatterns(definition)) {
      const match = normalized.match(pattern)
      if (!match) continue

      const value = parseFloat(match[1])
      if (Number.isNaN(value)) continue

      const key = definition.standardName.toLowerCase()
      if (seen.has(key)) break

      const unit = (match[2]?.trim() || definition.defaultUnit).replace(/\s+/g, "")
      const referenceRange = (match[3]?.trim() || definition.referenceRange).replace(/\s+/g, " ")
      const status = inferLabStatus(value, referenceRange, definition.bounds)

      results.push({
        testName: definition.standardName,
        value,
        unit,
        referenceRange,
        status,
      })
      seen.add(key)
      break
    }
  }

  return results
}

/**
 * Converts cholesterol and glucose units to standard US units where applicable.
 */
function convertToStandardUnit(
  testName: string,
  value: number,
  unit: string
): { value: number; unit: string } {
  const lowerUnit = unit.toLowerCase()
  const lowerName = testName.toLowerCase()

  if (lowerName.includes("glucose") && lowerUnit === "mmol/l") {
    return { value: Number((value * 18.0182).toFixed(1)), unit: "mg/dL" }
  }

  if (lowerName.includes("cholesterol") && lowerUnit === "mmol/l") {
    return { value: Number((value * 38.67).toFixed(1)), unit: "mg/dL" }
  }

  if (lowerName.includes("triglycerides") && lowerUnit === "mmol/l") {
    return { value: Number((value * 88.57).toFixed(1)), unit: "mg/dL" }
  }

  if (lowerName.includes("creatinine") && lowerUnit === "umol/l") {
    return { value: Number((value / 88.4).toFixed(2)), unit: "mg/dL" }
  }

  return { value, unit }
}

/**
 * Maps a parsed test name to its canonical standard name.
 */
function mapStandardName(testName: string): { standardName: string; category: string; defaultUnit: string; referenceRange: string; bounds?: { low: number; high: number } } | null {
  const lower = testName.toLowerCase().trim()
  for (const definition of LAB_TEST_DEFINITIONS) {
    if (definition.standardName.toLowerCase() === lower) {
      return definition
    }
    if (definition.aliases.some((alias) => alias.toLowerCase() === lower)) {
      return definition
    }
  }
  return null
}

/**
 * Standardizes parsed lab values to canonical names, units, and abnormal flags.
 */
export function standardizeLabValues(parsed: ParsedLabValue[]): StandardizedLabValue[] {
  return parsed.map((item) => {
    const mapped = mapStandardName(item.testName)
    const standardName = mapped?.standardName ?? item.testName
    const category = mapped?.category ?? "General"
    const referenceRange = item.referenceRange || mapped?.referenceRange || ""
    const converted = convertToStandardUnit(standardName, item.value, item.unit || mapped?.defaultUnit || "")
    const status = inferLabStatus(converted.value, referenceRange, mapped?.bounds)

    return {
      ...item,
      testName: standardName,
      standardName,
      standardUnit: converted.unit,
      standardValue: converted.value,
      unit: converted.unit,
      value: converted.value,
      referenceRange,
      status,
      category,
      isAbnormal: status === "high" || status === "low",
    }
  })
}
