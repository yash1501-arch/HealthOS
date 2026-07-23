import { prisma } from "@/lib/prisma"
import { llmClient } from "@/lib/ai/llm-client"
import { stripPHI } from "@/lib/ai/phii-filter"
import { validateAIOutput, MEDICAL_DISCLAIMER } from "@/lib/ai/safety-engine"
import { z } from "zod"

// ─── Types ───────────────────────────────────────────────────────

export interface TimelineQueryResult {
  answer: string
  relevantData: Array<{
    type: string
    date: string
    summary: string
    details: string
  }>
  charts: Array<{
    type: "line" | "bar" | "area"
    title: string
    data: Array<{ date: string; value: number; label: string }>
  }>
  confidence: number
  disclaimer: string
}

export interface TimelineFilters {
  types?: string[]
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

export interface TimelineEntryResult {
  id: string
  eventType: string
  category: TimelineCategory
  title: string
  description: string | null
  eventDate: Date
  metadata: Record<string, unknown> | null
}

export type TimelineCategory =
  | "posture"
  | "vision"
  | "labs"
  | "diet"
  | "exercise"
  | "checkin"
  | "routine"
  | "recommendation"
  | "medication"
  | "reminder"
  | "report"
  | "other"

const EVENT_TYPE_CATEGORY: Record<string, TimelineCategory> = {
  posture_analysis: "posture",
  vision_analysis: "vision",
  lab_result: "labs",
  lab_results: "labs",
  diet_plan_created: "diet",
  exercise_plan_created: "exercise",
  weekly_checkin: "checkin",
  checkin: "checkin",
  routine_generated: "routine",
  recommendation: "recommendation",
  medication: "medication",
  reminder: "reminder",
  medical_report: "report",
  report_uploaded: "report",
}

/**
 * Maps a DB event_type string to a display category.
 */
export function categorizeEventType(eventType: string): TimelineCategory {
  return EVENT_TYPE_CATEGORY[eventType] ?? "other"
}

// ─── Helper ──────────────────────────────────────────────────────

/**
 * Converts arbitrary values to JSON-safe primitives.
 */
function toPlainJson(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object" && typeof (value as Record<string, unknown>).toNumber === "function") {
    return Number((value as { toNumber: () => number }).toNumber())
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPlainJson(item))
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toPlainJson(nested)
    }
    return result
  }
  return value
}

/**
 * Counts entries per event type for trend data.
 */
function countByEventType(
  entries: Array<{ eventType: string; eventDate: Date }>
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    const key = categorizeEventType(e.eventType)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

/**
 * Maps entry data to timeline context for the LLM.
 */
function entriesToContext(
  entries: Array<{
    eventType: string
    title: string
    description: string | null
    eventDate: Date
    metadata: unknown
  }>,
  maxEntries = 30
): string {
  return entries
    .slice(0, maxEntries)
    .map(
      (e) =>
        `[${e.eventDate.toISOString().slice(0, 10)}] ${e.eventType}: ${e.title}${
          e.description ? ` — ${e.description}` : ""
        }`
    )
    .join("\n")
}

// ─── Timeline Engine ─────────────────────────────────────────────

/**
 * AI-powered health timeline engine.
 *
 * Supports natural-language queries against a user's health data timeline
 * and structured paginated retrieval with category filters and date ranges.
 */
export class TimelineEngine {
  /**
   * Answers a natural language question about the user's health timeline.
   *
   * Parses the question, queries relevant data from the database, builds context,
   * sends it to the LLM with the TIMELINE_QUERY role, and returns a structured answer
   * with optional chart data.
   */
  async query(
    userId: string,
    naturalLanguageQuery: string,
    timeRange?: { start?: string; end?: string }
  ): Promise<TimelineQueryResult> {
    try {
      // Determine time range from query or explicit range
      const dateFilter: { eventDate: { gte?: Date; lte?: Date } } = {
        eventDate: {},
      }

      if (timeRange?.start) {
        dateFilter.eventDate.gte = new Date(timeRange.start)
      }
      if (timeRange?.end) {
        dateFilter.eventDate.lte = new Date(timeRange.end)
      }

      // Try to detect time range from the natural language query
      const now = new Date()
      const threeMonthsAgo = new Date(now)
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      if (!dateFilter.eventDate.gte) {
        // Default to last 3 months for queries unless a range is specified
        const timeKeywords = [
          { pattern: /last\s+(\d+)\s+month/i, months: (m: number) => m },
          { pattern: /past\s+(\d+)\s+month/i, months: (m: number) => m },
          { pattern: /last\s+(\d+)\s+week/i, months: (m: number) => Math.ceil(m / 4) },
          { pattern: /past\s+(\d+)\s+week/i, months: (m: number) => Math.ceil(m / 4) },
          { pattern: /last\s+year/i, months: () => 12 },
          { pattern: /past\s+year/i, months: () => 12 },
          { pattern: /this\s+month/i, months: () => 1 },
          { pattern: /this\s+week/i, months: () => 0.25 },
          { pattern: /january|february|march|april|may|june|july|august|september|october|november|december/i, months: () => 1 },
        ]

        let detectedRange = false
        for (const { pattern, months } of timeKeywords) {
          const match = naturalLanguageQuery.match(pattern)
          if (match) {
            const numMonths = match[1] ? months(Number(match[1])) : months(0)
            const rangeStart = new Date(now)
            rangeStart.setMonth(rangeStart.getMonth() - numMonths)
            dateFilter.eventDate.gte = rangeStart
            detectedRange = true
            break
          }
        }

        if (!detectedRange) {
          dateFilter.eventDate.gte = threeMonthsAgo
        }
      }

      // Determine data type from query keywords
      const queryLower = naturalLanguageQuery.toLowerCase()
      const typeFilters: string[] = []

      const typeKeywords: Array<{ pattern: RegExp; types: string[] }> = [
        { pattern: /posture|neck|shoulder|pelvic|knee|flat.?feet/i, types: ["posture_analysis", "posture"] },
        { pattern: /vision|eye|screen/i, types: ["vision_analysis"] },
        { pattern: /blood|lab|test|cholesterol|glucose|hemoglobin|vitamin|thyroid|hba1c/i, types: ["lab_result", "lab_results", "medical_report", "report_uploaded"] },
        { pattern: /diet|meal|food|eat|nutrition|calorie|protein/i, types: ["diet_plan_created"] },
        { pattern: /exercise|workout|gym|run|walk|strength|cario/i, types: ["exercise_plan_created"] },
        { pattern: /sleep|stress|mood|check.?in|adherence/i, types: ["weekly_checkin", "checkin"] },
        { pattern: /routine|schedule|habit|daily/i, types: ["routine_generated"] },
        { pattern: /medication|medicine|drug|pill/i, types: ["medication"] },
        { pattern: /recommend|suggest|advice|tip/i, types: ["recommendation"] },
        { pattern: /report|scan|x.?ray|mri|ultrasound/i, types: ["medical_report", "report_uploaded"] },
        { pattern: /reminder|alert|notification/i, types: ["reminder"] },
      ]

      for (const { pattern, types } of typeKeywords) {
        if (pattern.test(queryLower)) {
          typeFilters.push(...types)
        }
      }

      // Query the database
      const where: Record<string, unknown> = {
        userId,
        eventDate: dateFilter.eventDate,
      }
      if (typeFilters.length > 0) {
        where.eventType = { in: typeFilters }
      }

      const entries = await (prisma.healthTimelineEntry.findMany as (
        args: Record<string, unknown>
      ) => ReturnType<typeof prisma.healthTimelineEntry.findMany>)({
        where,
        orderBy: { eventDate: "desc" } as const,
        take: 50,
      })

      // Build context from the retrieved data
      const contextEntries = entries.map((e) => ({
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        eventDate: e.eventDate,
        metadata: e.metadata as Record<string, unknown> | null,
      }))

      const entryContext = entriesToContext(contextEntries)
      const categoryCounts = countByEventType(entries)

      const prompt = JSON.stringify(
        {
          userQuery: naturalLanguageQuery,
          timeRange: {
            start: dateFilter.eventDate.gte?.toISOString().slice(0, 10) ?? "not specified",
            end: dateFilter.eventDate.lte?.toISOString().slice(0, 10) ?? "present",
          },
          dataCount: entries.length,
          categoryBreakdown: categoryCounts,
          timelineEntries: entryContext,
          instructions:
            "Answer the user's question using ONLY the timeline data provided above. " +
            "Be concise but informative. Cite specific dates and values when relevant. " +
            "If the data doesn't contain enough information to answer, say so clearly. " +
            "If trends are visible (e.g., improving sleep scores), mention them. " +
            "If chart data can be derived (e.g., scores over time), include chart definitions. " +
            "Return valid JSON matching the required schema exactly. " +
            "Use cautious, non-diagnostic language. Include a disclaimer.",
        },
        null,
        2
      )

      const llmResult = await llmClient.generate({
        userId,
        role: "TIMELINE_QUERY",
        userMessage: prompt,
        interactionType: "timeline",
        contentCategory: "medical",
        maxTokens: 4096,
        inputContext: stripPHI(
          JSON.stringify({ query: naturalLanguageQuery, entryCount: entries.length })
        ),
      })

      if (llmResult.emergencyDetected) {
        return {
          answer: "Your question raised safety concerns. Please consult a healthcare professional directly for any urgent health matters.",
          relevantData: [],
          charts: [],
          confidence: 0,
          disclaimer: "This platform cannot provide emergency care. Seek immediate medical attention.",
        }
      }

      // Zod validation
      const zodParsed = timelineQueryResultSchema.safeParse(llmResult.data)
      if (!zodParsed.success) {
        throw new Error(`Invalid timeline query response: ${zodParsed.error.message}`)
      }
      const validated = zodParsed.data

      const safety = validateAIOutput(JSON.stringify(validated), "TIMELINE_QUERY", prompt)

      let result: TimelineQueryResult = validated as TimelineQueryResult
      if (safety.warnings.length > 0) {
        try {
          const parsed = JSON.parse(safety.sanitizedOutput)
          const zodCheck = timelineQueryResultSchema.safeParse(parsed)
          if (zodCheck.success) result = zodCheck.data
        } catch {
          result = validated as TimelineQueryResult
        }
      }

      if (!result.disclaimer || !result.disclaimer.toLowerCase().includes("not medical advice")) {
        result.disclaimer = `${result.disclaimer ?? ""}\n\n${MEDICAL_DISCLAIMER}`.trim()
      }

      return result
    } catch (error) {
      console.error("Timeline query failed:", error)
      throw error instanceof Error ? error : new Error("Timeline query failed")
    }
  }

  /**
   * Retrieves paginated timeline entries with optional category and date filters.
   */
  async getTimeline(
    userId: string,
    filters: TimelineFilters = {}
  ): Promise<{ entries: TimelineEntryResult[]; total: number; page: number; pageSize: number }> {
    try {
      const { types, startDate, endDate, page = 1, pageSize = 20 } = filters

      const where: Record<string, unknown> = { userId }

      // Filter by category → map to event types
      if (types && types.length > 0) {
        const eventTypes: string[] = []
        for (const t of types) {
          const matching = Object.entries(EVENT_TYPE_CATEGORY)
            .filter(([, category]) => category === t)
            .map(([eventType]) => eventType)
          eventTypes.push(...matching)
        }
        if (eventTypes.length > 0) {
          where.eventType = { in: eventTypes }
        }
      }

      // Date range
      if (startDate || endDate) {
        const eventDate: Record<string, Date> = {}
        if (startDate) eventDate.gte = new Date(startDate)
        if (endDate) eventDate.lte = new Date(endDate)
        where.eventDate = eventDate
      }

      const [dbEntries, total] = await Promise.all([
        (prisma.healthTimelineEntry.findMany as (
          args: Record<string, unknown>
        ) => ReturnType<typeof prisma.healthTimelineEntry.findMany>)({
          where,
          orderBy: { eventDate: "desc" } as const,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        (prisma.healthTimelineEntry.count as (
          args: Record<string, unknown>
        ) => ReturnType<typeof prisma.healthTimelineEntry.count>)({
          where,
        }),
      ])

      const entries: TimelineEntryResult[] = dbEntries.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        category: categorizeEventType(e.eventType),
        title: e.title,
        description: e.description,
        eventDate: e.eventDate,
        metadata: e.metadata as Record<string, unknown> | null,
      }))

      return { entries, total, page, pageSize }
    } catch (error) {
      console.error("Failed to get timeline:", error)
      throw error instanceof Error ? error : new Error("Failed to get timeline")
    }
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────

const chartDataSchema = z.object({
  date: z.string(),
  value: z.number(),
  label: z.string(),
})

const chartSchema = z.object({
  type: z.enum(["line", "bar", "area"]),
  title: z.string().min(1),
  data: z.array(chartDataSchema).min(1),
})

const relevantDataItemSchema = z.object({
  type: z.string(),
  date: z.string(),
  summary: z.string(),
  details: z.string(),
})

const timelineQueryResultSchema = z.object({
  answer: z.string().min(1),
  relevantData: z.array(relevantDataItemSchema),
  charts: z.array(chartSchema),
  confidence: z.number().min(0).max(1),
  disclaimer: z.string(),
})

/** Singleton timeline engine instance. */
export const timelineEngine = new TimelineEngine()
