import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth"
import { logAudit } from "@/lib/security/audit-trail"
import { checkUserRateLimit, setRateLimitHeaders } from "@/lib/security/rate-limiter"

/**
 * GET /api/user/data-export — Export all user data as downloadable JSON.
 *
 * Auth required. Rate limited to 3 per hour.
 * Logs the export in the audit trail.
 */
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    // Rate limit
    const rateCheck = await checkUserRateLimit(userId, "data_export")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Export limit reached (3/hour). Try again later." } },
        { status: 429, headers: { "X-RateLimit-Limit": String(rateCheck.limit), "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": rateCheck.resetAt.toISOString() } }
      )
    }

    // Collect ALL user data from every table
    const [
      user,
      profile,
      occupation,
      lifestyle,
      nutritionProfile,
      medicalHistory,
      painAssessments,
      goals,
      visionMedia,
      visionAnalyses,
      postureCharacteristics,
      medicalReports,
      reportAnalyses,
      labResults,
      recommendations,
      dietPlans,
      exercisePlans,
      routines,
      weeklyCheckins,
      progressMetrics,
      healthTimeline,
      consentLogs,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          isVerified: true,
          consentPrivacy: true,
          consentDisclaimer: true,
          consentVision: true,
          status: true,
          onboardingComplete: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.occupation.findUnique({ where: { userId } }),
      prisma.lifestyle.findUnique({ where: { userId } }),
      prisma.nutritionProfile.findUnique({ where: { userId } }),
      prisma.medicalHistory.findUnique({ where: { userId } }),
      prisma.painAssessment.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.visionMedia.findMany({ where: { userId } }),
      prisma.visionAnalysis.findMany({ where: { userId } }),
      prisma.postureCharacteristic.findMany({ where: { userId } }),
      prisma.medicalReport.findMany({ where: { userId } }),
      prisma.reportAnalysis.findMany({ where: { userId } }),
      prisma.labResult.findMany({ where: { userId } }),
      prisma.recommendation.findMany({ where: { userId } }),
      prisma.dietPlan.findMany({ where: { userId } }),
      prisma.exercisePlan.findMany({ where: { userId } }),
      prisma.routine.findMany({ where: { userId } }),
      prisma.weeklyCheckin.findMany({ where: { userId } }),
      prisma.progressMetric.findMany({ where: { userId } }),
      prisma.healthTimelineEntry.findMany({ where: { userId } }),
      prisma.consentLog.findMany({ where: { userId } }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      account: user,
      profile,
      occupation,
      lifestyle,
      nutritionProfile,
      medicalHistory,
      painAssessments,
      goals,
      visionMedia,
      visionAnalyses,
      postureCharacteristics,
      medicalReports,
      reportAnalyses,
      labResults,
      recommendations,
      dietPlans,
      exercisePlans,
      routines,
      weeklyCheckins,
      progressMetrics,
      healthTimeline,
      consentLogs,
      recordCounts: {
        profile: profile ? 1 : 0,
        occupation: occupation ? 1 : 0,
        lifestyle: lifestyle ? 1 : 0,
        nutritionProfile: nutritionProfile ? 1 : 0,
        medicalHistory: medicalHistory ? 1 : 0,
        painAssessments: painAssessments.length,
        goals: goals.length,
        visionMedia: visionMedia.length,
        visionAnalyses: visionAnalyses.length,
        postureCharacteristics: postureCharacteristics.length,
        medicalReports: medicalReports.length,
        reportAnalyses: reportAnalyses.length,
        labResults: labResults.length,
        recommendations: recommendations.length,
        dietPlans: dietPlans.length,
        exercisePlans: exercisePlans.length,
        routines: routines.length,
        weeklyCheckins: weeklyCheckins.length,
        progressMetrics: progressMetrics.length,
        healthTimeline: healthTimeline.length,
        consentLogs: consentLogs.length,
      },
    }

    // Log the export in audit trail
    await logAudit({
      userId,
      action: "DATA_EXPORT",
      resource: "user_data",
      details: { recordCounts: exportData.recordCounts },
    })

    const jsonStr = JSON.stringify(exportData, null, 2)

    const headers = new Headers()
    headers.set("Content-Type", "application/json")
    headers.set("Content-Disposition", `attachment; filename="healthos-export-${userId.slice(0, 8)}.json"`)
    setRateLimitHeaders(headers, rateCheck)

    return new NextResponse(jsonStr, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Data export error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
