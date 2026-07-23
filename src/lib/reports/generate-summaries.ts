import type { ParsedLabResult } from "@/types/reports"

export async function generateReportSummaries(
  rawText: string,
  labResults: ParsedLabResult[],
  reportType: string
): Promise<{ patientSummary: string; doctorSummary: string; modelVersion: string }> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  if (apiKey && labResults.length > 0) {
    try {
      if (process.env.OPENAI_API_KEY) {
        return await generateWithOpenAi(rawText, labResults, reportType, process.env.OPENAI_API_KEY)
      }
      return await generateWithAnthropic(rawText, labResults, reportType, process.env.ANTHROPIC_API_KEY!)
    } catch (error) {
      console.error("LLM summary generation failed:", error)
    }
  }

  return generateTemplateSummaries(labResults, reportType)
}

async function generateWithOpenAi(
  rawText: string,
  labResults: ParsedLabResult[],
  reportType: string,
  apiKey: string
): Promise<{ patientSummary: string; doctorSummary: string; modelVersion: string }> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You explain medical lab reports to patients without diagnosing. Return JSON with patientSummary (plain language, 2-4 sentences) and doctorSummary (brief clinical note). Never claim certainty or replace a doctor.",
        },
        {
          role: "user",
          content: JSON.stringify({ reportType, labResults, excerpt: rawText.slice(0, 4000) }),
        },
      ],
      temperature: 0.2,
    }),
  })

  if (!res.ok) throw new Error("OpenAI summary request failed")
  const body = await res.json()
  const content = JSON.parse(body.choices?.[0]?.message?.content ?? "{}")
  return {
    patientSummary: String(content.patientSummary ?? ""),
    doctorSummary: String(content.doctorSummary ?? ""),
    modelVersion: model,
  }
}

async function generateWithAnthropic(
  rawText: string,
  labResults: ParsedLabResult[],
  reportType: string,
  apiKey: string
): Promise<{ patientSummary: string; doctorSummary: string; modelVersion: string }> {
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest"
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Explain this ${reportType} report without diagnosing. Return JSON only: {"patientSummary","doctorSummary"}\n\n${JSON.stringify({ labResults, excerpt: rawText.slice(0, 4000) })}`,
        },
      ],
    }),
  })

  if (!res.ok) throw new Error("Anthropic summary request failed")
  const body = await res.json()
  const text = body.content?.[0]?.text ?? "{}"
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const content = JSON.parse(jsonMatch?.[0] ?? "{}")
  return {
    patientSummary: String(content.patientSummary ?? ""),
    doctorSummary: String(content.doctorSummary ?? ""),
    modelVersion: model,
  }
}

function generateTemplateSummaries(
  labResults: ParsedLabResult[],
  reportType: string
): { patientSummary: string; doctorSummary: string; modelVersion: string } {
  if (labResults.length === 0) {
    return {
      patientSummary:
        reportType === "blood_report"
          ? "We uploaded your report, but couldn't confidently extract lab values. You can review the original file and add values manually if needed."
          : "Your report was uploaded. Imaging and narrative reports may not include structured lab values — review the summary with your healthcare provider.",
      doctorSummary: "Report uploaded. Structured lab extraction incomplete — manual review recommended.",
      modelVersion: "heuristic-v1",
    }
  }

  const abnormal = labResults.filter((r) => r.isAbnormal)
  const normalCount = labResults.length - abnormal.length

  const patientSummary =
    abnormal.length === 0
      ? `We extracted ${labResults.length} test result${labResults.length === 1 ? "" : "s"} from your report. All parsed values appear within their reference ranges. Discuss these results with your healthcare provider for context.`
      : `We extracted ${labResults.length} test result${labResults.length === 1 ? "" : "s"}. ${abnormal.length} value${abnormal.length === 1 ? "" : "s"} appear outside the reference range, including ${abnormal
          .slice(0, 3)
          .map((r) => r.testName)
          .join(", ")}. This information is for understanding only — please discuss next steps with your doctor.`

  const doctorSummary = [
    `${labResults.length} values parsed.`,
    `${normalCount} within range, ${abnormal.length} flagged.`,
    abnormal.length > 0
      ? abnormal.map((r) => `${r.testName}: ${r.value ?? "—"} ${r.unit ?? ""} (${r.flag})`.trim()).join("; ")
      : "No abnormal flags detected in parsed values.",
  ].join(" ")

  return { patientSummary, doctorSummary, modelVersion: "heuristic-v1" }
}
