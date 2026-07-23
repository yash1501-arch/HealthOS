import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRateLimitBackend } from "@/lib/rate-limiter"

// ─── GET /api/health — System health & capacity check ──────────

export async function GET() {
  const rateLimitBackend = await getRateLimitBackend()

  const checks: Record<string, string | number | boolean> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    memoryMax: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    rateLimitBackend,
    storageType: process.env.STORAGE_BACKEND || "local",
    redisConfigured: !!process.env.REDIS_URL,
  }

  // Check database connectivity
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = "connected"
    checks.databaseLatencyMs = Date.now() - start
  } catch (error) {
    checks.database = "disconnected"
    checks.status = "degraded"
  }

  // Check if Accelerate is being used (indicates connection pooling)
  const dbUrl = (process.env.DATABASE_URL || "").startsWith("prisma+postgres://")
  checks.connectionPooling = dbUrl ? "accelerate" : "direct"

  // Estimate capacity
  const memPercent = Number(checks.memoryUsage) / Number(checks.memoryMax)
  if (memPercent > 0.8) checks.status = "warning"

  return NextResponse.json({ data: checks })
}
