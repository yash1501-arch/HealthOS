import { z } from "zod"

export const severitySchema = z.enum(["low", "moderate", "high"])

export const healthScoreBreakdownSchema = z.object({
  posture: z.number().min(0).max(100),
  nutrition: z.number().min(0).max(100),
  activity: z.number().min(0).max(100),
  sleep: z.number().min(0).max(100),
  stress: z.number().min(0).max(100),
  vision: z.number().min(0).max(100),
  labs: z.number().min(0).max(100),
})

export const topConcernSchema = z.object({
  category: z.string().min(1),
  severity: severitySchema,
  description: z.string().min(1),
  evidence: z.string().min(1),
})

export const recommendationItemSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  priority: z.number().int().min(1).max(5),
  title: z.string().min(1),
  description: z.string().min(1),
  actionSteps: z.array(z.string().min(1)).min(1),
  expectedTimeline: z.string().min(1),
  evidence: z.string().min(1),
  confidence: z.number().min(0).max(100),
})

export const recommendationOutputSchema = z.object({
  healthScore: z.number().min(0).max(100),
  healthScoreBreakdown: healthScoreBreakdownSchema,
  topConcerns: z.array(topConcernSchema),
  recommendations: z.array(recommendationItemSchema),
  redFlags: z.array(z.string()),
  disclaimer: z.string().min(1),
})

export const recommendationInputSchema = z.object({
  profile: z.record(z.string(), z.unknown()).optional(),
  assessment: z.record(z.string(), z.unknown()).optional(),
  postureAnalysis: z.record(z.string(), z.unknown()).nullable().optional(),
  visionAnalysis: z.record(z.string(), z.unknown()).nullable().optional(),
  labResults: z.array(z.record(z.string(), z.unknown())).optional(),
  dietPlan: z.record(z.string(), z.unknown()).nullable().optional(),
  exercisePlan: z.record(z.string(), z.unknown()).nullable().optional(),
  weeklyCheckins: z.array(z.record(z.string(), z.unknown())).optional(),
  healthScoreBreakdown: healthScoreBreakdownSchema.optional(),
  healthScore: z.number().min(0).max(100).optional(),
})

export type HealthScoreBreakdown = z.infer<typeof healthScoreBreakdownSchema>
export type TopConcern = z.infer<typeof topConcernSchema>
export type RecommendationItem = z.infer<typeof recommendationItemSchema>
export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>
export type RecommendationInput = z.infer<typeof recommendationInputSchema>

export const labValueStatusSchema = z.enum(["normal", "high", "low", "unknown"])

export const labValueExplanationSchema = z.object({
  testName: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  status: labValueStatusSchema,
  explanation: z.string().min(1),
  lifestyleFactors: z.array(z.string()),
  dietarySuggestions: z.array(z.string()),
})

export const labTrendSchema = z.object({
  testName: z.string().min(1),
  direction: z.enum(["improving", "worsening", "stable"]),
  previousValue: z.union([z.string(), z.number(), z.null()]),
  currentValue: z.union([z.string(), z.number()]),
  note: z.string().min(1),
})

export const reportAnalysisOutputSchema = z.object({
  summary: z.string().min(1),
  patientExplanation: z.string().min(1),
  doctorSummary: z.string().min(1),
  labValueExplanations: z.array(labValueExplanationSchema),
  trends: z.array(labTrendSchema),
  concerns: z.array(z.string()),
  disclaimer: z.string().min(1),
  confidence: z.number().min(0).max(100),
})

export const reportAnalysisInputSchema = z.object({
  reportType: z.string().optional(),
  extractedText: z.string(),
  parsedLabValues: z.array(
    z.object({
      testName: z.string(),
      value: z.number(),
      unit: z.string(),
      referenceRange: z.string(),
      status: labValueStatusSchema,
      standardName: z.string().optional(),
      standardUnit: z.string().optional(),
      standardValue: z.number().optional(),
      isAbnormal: z.boolean().optional(),
      category: z.string().optional(),
    })
  ),
  previousLabValues: z.array(
    z.object({
      testName: z.string(),
      value: z.number().nullable(),
      testDate: z.string().nullable().optional(),
    })
  ),
})

// ─── Lab Result Extraction (OCR pipeline) ─────────────────────────

/**
 * Zod schema for a single parsed lab result from the OCR+LLM pipeline.
 * This is the output format expected from the LLM after PHI-stripped text is parsed.
 */
export const extractedLabResultSchema = z.object({
  testName: z.string().min(1, "Test name is required"),
  value: z.string().min(1, "Value is required"),
  unit: z.string().optional().default(""),
  referenceRange: z.string().optional().default(""),
  isAbnormal: z.boolean().optional().default(false),
  flag: z.enum(["normal", "low", "high", "critical", "unknown"]).optional().default("unknown"),
  category: z.string().optional().default(""),
})

/**
 * Zod schema for the full LLM response from the report parser.
 */
export const extractedLabResultsSchema = z.object({
  labResults: z.array(extractedLabResultSchema).min(0),
  summary: z.string().optional().default(""),
  reportDate: z.string().optional().default(""),
  institutionName: z.string().optional().default(""),
})

export type ExtractedLabResult = z.infer<typeof extractedLabResultSchema>
export type ExtractedLabResults = z.infer<typeof extractedLabResultsSchema>

export type LabValueExplanation = z.infer<typeof labValueExplanationSchema>
export type LabTrend = z.infer<typeof labTrendSchema>
export type ReportAnalysisOutput = z.infer<typeof reportAnalysisOutputSchema>
export type ReportAnalysisInput = z.infer<typeof reportAnalysisInputSchema>
