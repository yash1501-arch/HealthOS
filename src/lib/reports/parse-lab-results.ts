import type { LabFlag, ParsedLabResult } from "@/types/reports"

const LAB_LINE_PATTERNS = [
  /^(.+?)\s+([\d.]+)\s*([a-zA-Z/%μµ]+)?\s*(?:\(?\s*([\d.\-–to ]+)\s*\)?)?$/i,
  /^(.+?)[:\s]+([\d.]+)\s*([a-zA-Z/%μµ]+)?(?:\s*\(?\s*([\d.\-–to ]+)\s*\)?)?$/i,
]

export async function parseLabResultsFromText(rawText: string): Promise<ParsedLabResult[]> {
  const llmResults = await tryLlmParse(rawText)
  if (llmResults.length > 0) return llmResults

  return parseWithHeuristics(rawText)
}

async function tryLlmParse(rawText: string): Promise<ParsedLabResult[]> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey || rawText.length < 20) return []

  try {
    if (process.env.OPENAI_API_KEY) {
      return await parseWithOpenAi(rawText, process.env.OPENAI_API_KEY)
    }
    return await parseWithAnthropic(rawText, process.env.ANTHROPIC_API_KEY!)
  } catch (error) {
    console.error("LLM lab parse failed, falling back to heuristics:", error)
    return []
  }
}

async function parseWithOpenAi(rawText: string, apiKey: string): Promise<ParsedLabResult[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract lab test results from medical report text. Return JSON: {\"results\":[{\"testName\",\"testCategory\",\"value\",\"unit\",\"referenceRange\",\"flag\"}]}. flag must be normal|low|high|critical|unknown. Use null for missing numeric values. Do not diagnose.",
        },
        { role: "user", content: rawText.slice(0, 12000) },
      ],
      temperature: 0.1,
    }),
  })

  if (!res.ok) return []
  const body = await res.json()
  const content = body.choices?.[0]?.message?.content
  if (!content) return []
  return normalizeParsedResults(JSON.parse(content).results ?? [])
}

async function parseWithAnthropic(rawText: string, apiKey: string): Promise<ParsedLabResult[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Extract lab test results as JSON only: {"results":[{"testName","testCategory","value","unit","referenceRange","flag"}]}. flag: normal|low|high|critical|unknown.\n\n${rawText.slice(0, 12000)}`,
        },
      ],
    }),
  })

  if (!res.ok) return []
  const body = await res.json()
  const text = body.content?.[0]?.text
  if (!text) return []
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []
  return normalizeParsedResults(JSON.parse(jsonMatch[0]).results ?? [])
}

function parseWithHeuristics(rawText: string): ParsedLabResult[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  const results: ParsedLabResult[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    if (line.length < 4 || line.length > 120) continue
    if (/^(test|result|value|unit|reference|page|date|patient|doctor)/i.test(line)) continue

    for (const pattern of LAB_LINE_PATTERNS) {
      const match = line.match(pattern)
      if (!match) continue

      const testName = cleanTestName(match[1])
      const value = parseFloat(match[2])
      if (!testName || Number.isNaN(value)) continue

      const key = testName.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      const unit = match[3]?.trim()
      const referenceRange = match[4]?.replace(/\s+/g, " ").trim()
      const flag = inferFlag(value, referenceRange)

      results.push({
        testName,
        testCategory: inferCategory(testName),
        value,
        unit,
        referenceRange,
        flag,
        isAbnormal: flag === "low" || flag === "high" || flag === "critical",
      })
      break
    }
  }

  return results
}

function normalizeParsedResults(items: unknown[]): ParsedLabResult[] {
  if (!Array.isArray(items)) return []

  return items
    .map((item): ParsedLabResult | null => {
      const row = item as Record<string, unknown>
      const testName = cleanTestName(String(row.testName ?? ""))
      if (!testName) return null

      const valueRaw = row.value
      const value =
        typeof valueRaw === "number"
          ? valueRaw
          : typeof valueRaw === "string"
            ? parseFloat(valueRaw)
            : null

      const flag = normalizeFlag(String(row.flag ?? "unknown"))
      const referenceRange = row.referenceRange ? String(row.referenceRange) : undefined

      return {
        testName,
        testCategory: row.testCategory ? String(row.testCategory) : inferCategory(testName),
        value: value !== null && !Number.isNaN(value) ? value : null,
        unit: row.unit ? String(row.unit) : undefined,
        referenceRange,
        flag,
        isAbnormal: flag === "low" || flag === "high" || flag === "critical",
      }
    })
    .filter((item): item is ParsedLabResult => item !== null)
}

function cleanTestName(name: string): string {
  return name.replace(/[*:_-]+/g, " ").replace(/\s+/g, " ").trim()
}

function inferCategory(testName: string): string | undefined {
  const lower = testName.toLowerCase()
  if (/vitamin|b12|folate|iron|ferritin|calcium|magnesium/.test(lower)) return "Vitamins & Minerals"
  if (/glucose|hba1c|insulin|sugar/.test(lower)) return "Metabolic"
  if (/cholesterol|ldl|hdl|triglyceride|lipid/.test(lower)) return "Lipid Panel"
  if (/hemoglobin|wbc|rbc|platelet|mcv|hematocrit/.test(lower)) return "Blood Count"
  if (/tsh|t3|t4|thyroid/.test(lower)) return "Thyroid"
  if (/creatinine|bun|egfr|uric/.test(lower)) return "Kidney"
  if (/alt|ast|bilirubin|liver/.test(lower)) return "Liver"
  return undefined
}

function inferFlag(value: number, referenceRange?: string): LabFlag {
  if (!referenceRange) return "unknown"

  const rangeMatch = referenceRange.match(/([\d.]+)\s*[-–to]+\s*([\d.]+)/i)
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1])
    const max = parseFloat(rangeMatch[2])
    if (!Number.isNaN(min) && value < min) return value < min * 0.7 ? "critical" : "low"
    if (!Number.isNaN(max) && value > max) return value > max * 1.3 ? "critical" : "high"
    return "normal"
  }

  const upperMatch = referenceRange.match(/<\s*([\d.]+)/)
  if (upperMatch) {
    const max = parseFloat(upperMatch[1])
    if (!Number.isNaN(max) && value > max) return "high"
    return "normal"
  }

  const lowerMatch = referenceRange.match(/>\s*([\d.]+)/)
  if (lowerMatch) {
    const min = parseFloat(lowerMatch[1])
    if (!Number.isNaN(min) && value < min) return "low"
    return "normal"
  }

  return "unknown"
}

function normalizeFlag(flag: string): LabFlag {
  const lower = flag.toLowerCase()
  if (lower === "normal") return "normal"
  if (lower === "low") return "low"
  if (lower === "high") return "high"
  if (lower === "critical") return "critical"
  return "unknown"
}
