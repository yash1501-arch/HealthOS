import { readReportFile } from "@/lib/storage"

export async function extractTextFromReport(
  fileKey: string,
  mimeType: string | null | undefined
): Promise<string> {
  const buffer = await readReportFile(fileKey)
  const type = mimeType || "application/octet-stream"

  if (type === "application/pdf") {
    return extractTextFromPdf(buffer)
  }

  if (type === "image/jpeg" || type === "image/png") {
    return extractTextFromImage(buffer, type)
  }

  throw new Error("Unsupported file type for text extraction")
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()
  const text = result.text?.trim() ?? ""
  if (!text) {
    throw new Error("Could not extract text from PDF. Try a clearer scan.")
  }
  return text
}

async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      "Image OCR requires an OpenAI API key. Upload a PDF, or configure OPENAI_API_KEY for image analysis."
    )
  }

  const text = await extractTextWithOpenAiVision(buffer, mimeType, apiKey)
  if (!text.trim()) {
    throw new Error("Could not read image clearly. Try a clearer scan or upload a PDF.")
  }
  return text
}

async function extractTextWithOpenAiVision(
  buffer: Buffer,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const base64 = buffer.toString("base64")
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all readable text from this medical report image. Return plain text only, preserving test names, values, units, and reference ranges.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    throw new Error("Vision OCR failed")
  }

  const body = await res.json()
  return body.choices?.[0]?.message?.content?.trim() ?? ""
}
