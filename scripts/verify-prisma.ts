import dotenv from "dotenv";
dotenv.config({ override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

async function main() {
  const accelerateUrl = process.env.DATABASE_URL;
  if (!accelerateUrl) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }
  const prisma = new PrismaClient({ accelerateUrl }).$extends(withAccelerate());

  try {
    // Run a simple read query
    const userCount = await prisma.user.count();
    const tableCount = await prisma.$queryRawUnsafe<{table_name: string}[]>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );

    console.log(`✅ Connected to Prisma Postgres`);
    console.log(`📊 Users in database: ${userCount}`);
    console.log(`📋 Tables: ${tableCount.length}`);

    const tableNames = tableCount.map((t) => t.table_name).join(", ");
    console.log(`   ${tableNames}`);

    console.log("\n✅ Prisma Postgres is fully operational!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
