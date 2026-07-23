import { PrismaClient } from "@/generated/prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")

  const isAccelerate = url.startsWith("prisma+postgres://")
  const isDirect = url.startsWith("postgresql://")

  if (!isAccelerate && !isDirect) {
    throw new Error(
      "DATABASE_URL must start with 'prisma+postgres://' (Accelerate) or 'postgresql://' (direct)"
    )
  }

  if (isDirect) {
    // Direct PostgreSQL connection using the PrismaPg adapter
    // Supports PgBouncer by appending ?pgbouncer=true to the connection string
    const connectionUrl = url.includes("sslmode=") ? url : `${url}?sslmode=require`
    const pool = new pg.Pool({ connectionString: connectionUrl })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
  }

  // Prisma Accelerate connection (with built-in connection pooling)
  // Uses the prisma+postgres:// protocol
  const client = new PrismaClient({
    accelerateUrl: url,
  })

  // $extends(withAccelerate()) wraps the client — API is compatible
  return client.$extends(withAccelerate()) as unknown as PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
