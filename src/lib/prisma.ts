import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { withAccelerate } from "@prisma/extension-accelerate"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")

  // Try adapter pattern for standard postgresql:// URLs
  try {
    const adapter = new PrismaPg({ connectionString })
    return new PrismaClient({ adapter } as any).$extends(withAccelerate())
  } catch {
    // Fallback: use PrismaClient with default options.
    // This covers Accelerate URLs (prisma+postgres://) and other connection strings.
    return new PrismaClient({} as any)
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
