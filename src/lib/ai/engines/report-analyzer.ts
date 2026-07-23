import { prisma } from "@/lib/prisma"
import { llmClient } from "@/lib/ai/llm-client"
import { stripPHI } from "@/lib/ai/phii-filter"
import { validateAIOutput, MEDICAL_DISCLAIMER } from "@/lib/ai/safety-engine"
import type { StandardizedLabValue } from "@/lib/ai/ocr-engine"
import {
  reportAnalysisOutputSchema,
  type ReportAnalysisOutput,
} from "@/types/ai-schemas"

export interface PreviousLabValue {
  testName: string
  value: number | null
  testDate?: string | null
}

export interface ReportAnalyzerInput {
  userId: string
  reportId: string
  reportType: string
  extractedText: string
  parsedLabValues: StandardizedLabValue[]
  previousLabValues: PreviousLabValue[]
}

/**
 * Builds the LLM prompt for medical report analysis.
 */
function buildReportAnalysisPrompt(input: ReportAnalyzerInput, sanitizedText: string): string {
  return JSON.stringify(
    {
      reportType: input.reportType,
      extractedTextExcerpt: sanitizedText.slice(0, 8000),
      currentLabValues: input.parsedLabValues.map((lab) => ({
        testName: lab.standardName,
        value: lab.standardValue,
        unit: lab.standardUnit,
        referenceRange: lab.referenceRange,
        status: lab.status,
        category: lab.category,
      })),
      previousLabValues: input.previousLabValues,
      instructions:
        "Explain these lab results in plain language without diagnosing. " +
        "Compare current values to previous values where available. " +
        "Include lifestyle and dietary suggestions where appropriate. " +
        "Use cautious language and include topics the patient may discuss with their doctor.",
    },
    null,
    2
  )
}

/**
 * Persists analyzed lab results and report analysis to the database.
 */
async function persistAnalysisResults(
  input: ReportAnalyzerInput,
  analysis: ReportAnalysisOutput,
  model: string,
  processingTimeMs: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.labResult.deleteMany({ where: { reportId: input.reportId } })

    if (input.parsedLabValues.length > 0) {
      await tx.labResult.createMany({
        data: input.parsedLabValues.map((lab) => ({
          userId: input.userId,
          reportId: input.reportId,
          testName: lab.standardName,
          testCategory: lab.category,
          value: lab.standardValue,
          unit: lab.standardUnit,
          referenceRange: lab.referenceRange,
          isAbnormal: lab.isAbnormal,
          flag: lab.status === "unknown" ? null : lab.status,
        })),
      })
    }

    await tx.reportAnalysis.deleteMany({ where: { reportId: input.reportId } })
    await tx.reportAnalysis.create({
      data: {
        reportId: input.reportId,
        userId: input.userId,
        rawText: stripPHI(input.extractedText).slice(0, 50000),
        parsedData: JSON.parse(
          JSON.stringify({
            labResults: input.parsedLabValues,
            trends: analysis.trends,
            labValueExplanations: analysis.labValueExplanations,
            concerns: analysis.concerns,
          })
        ),
        patientSummary: analysis.patientExplanation,
        doctorSummary: analysis.doctorSummary,
        confidenceScore: analysis.confidence / 100,
        processingTimeMs,
        modelVersion: model,
      },
    })

    await tx.medicalReport.update({
      where: { id: input.reportId },
      data: {
        status: input.parsedLabValues.length > 0 ? "completed" : "partial",
      },
    })

    await tx.healthTimelineEntry.create({
      data: {
        userId: input.userId,
        eventType: "report_analyzed",
        referenceId: input.reportId,
        title: "Medical Report Analyzed",
        description: analysis.summary.slice(0, 280),
        eventDate: new Date(),
        metadata: {
          reportType: input.reportType,
          labResultCount: input.parsedLabValues.length,
          confidence: analysis.confidence,
        },
      },
    })
  })
}

/**
 * AI engine that analyzes extracted medical report text and lab values.
 */
export class ReportAnalyzer {
  /**
   * Analyzes a medical report with LLM assistance and persists structured results.
   */
  async analyze(
    userId: string,
    reportType: string,
    extractedText: string,
    parsedLabValues: StandardizedLabValue[],
    previousLabValues: PreviousLabValue[],
    reportId: string
  ): Promise<ReportAnalysisOutput> {
    const startedAt = Date.now()

    try {
      const input: ReportAnalyzerInput = {
        userId,
        reportId,
        reportType,
        extractedText,
        parsedLabValues,
        previousLabValues,
      }

      const sanitizedText = stripPHI(extractedText)
      const prompt = buildReportAnalysisPrompt(input, sanitizedText)

      const llmResult = await llmClient.generate({
        userId,
        role: "REPORT_ANALYZER",
        userMessage: prompt,
        interactionType: "report",
        contentCategory: "medical",
        maxTokens: 4096,
        skipRateLimit: true,
        inputContext: sanitizedText,
      })

      if (llmResult.emergencyDetected) {
        return {
          summary: "Some symptoms in this report may require urgent medical attention.",
          patientExplanation: llmResult.data.message as string,
          doctorSummary: "Emergency symptoms detected — patient advised to seek immediate care.",
          labValueExplanations: [],
          trends: [],
          concerns: ["Seek immediate medical attention"],
          disclaimer:
            "This platform cannot provide emergency care. Seek immediate medical attention.",
          confidence: 0,
        }
      }

      const parsed = reportAnalysisOutputSchema.safeParse(llmResult.data)
      if (!parsed.success) {
        throw new Error(`Invalid report analysis response: ${parsed.error.message}`)
      }

      const safety = validateAIOutput(
        JSON.stringify(parsed.data),
        "REPORT_ANALYZER",
        sanitizedText
      )

      let analysis = parsed.data
      if (safety.emergencyDetected) {
        analysis = {
          ...analysis,
          concerns: [...analysis.concerns, "Seek immediate medical attention"],
          disclaimer:
            "This platform cannot provide emergency care. Seek immediate medical attention.",
        }
      }

      if (!analysis.disclaimer.toLowerCase().includes("not medical advice")) {
        analysis = {
          ...analysis,
          disclaimer: `${analysis.disclaimer}\n\n${MEDICAL_DISCLAIMER}`,
        }
      }

      await persistAnalysisResults(
        input,
        analysis,
        llmResult.model,
        Date.now() - startedAt
      )

      return analysis
    } catch (error) {
      console.error("Report analysis failed:", error)
      throw error instanceof Error ? error : new Error("Report analysis failed")
    }
  }
}

/** Singleton report analyzer instance. */
export const reportAnalyzer = new ReportAnalyzer()
