import { PrismaClient } from "../src/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { hash } from "bcryptjs";

const accelerateUrl = process.env.DATABASE_URL;
if (!accelerateUrl) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}
const prisma = new PrismaClient({ accelerateUrl }).$extends(withAccelerate());

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo user
  const passwordHash = await hash("Demo@123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@healthos.app" },
    update: {},
    create: {
      email: "demo@healthos.app",
      passwordHash,
      isVerified: true,
      consentPrivacy: true,
      consentDisclaimer: true,
      consentVision: false,
      status: "ACTIVE",
      onboardingComplete: false,
      profile: {
        create: {
          fullName: "Demo User",
          dateOfBirth: new Date("1990-01-15"),
          biologicalSex: "male",
          heightCm: 175.0,
          weightKg: 72.0,
        },
      },
      lifestyle: {
        create: {
          wakeUpTime: "06:30",
          bedTime: "22:00",
          avgSleepHours: 7.5,
          sleepQuality: "good",
          waterIntakeL: 2.0,
          sunlightMinutes: 20,
          screenTimeHours: 4.0,
          walkingSteps: 8000,
          exerciseFreq: "3-4 times/week",
          stressLevel: 5,
          smoking: "never",
          alcohol: "occasionally",
          caffeineIntake: 2,
        },
      },
      nutritionProfile: {
        create: {
          dietType: "balanced",
          foodAllergies: ["peanuts"],
          dietaryRestrictions: [],
          religiousPreferences: [],
          cookingTimeMin: 30,
          monthlyBudget: 300.0,
          favoriteFoods: ["grilled chicken", "salads", "rice"],
          foodsToAvoid: ["fried food", "soda"],
        },
      },
      medicalHistory: {
        create: {
          currentConditions: ["lower back pain"],
          pastIllnesses: [],
          pastSurgeries: [],
          currentMedications: [],
          allergies: ["peanuts"],
          familyHistory: {
            diabetes: "father",
            hypertension: "mother",
          },
        },
      },
      goals: {
        create: [
          { goal: "Improve posture and reduce back pain", priority: 1 },
          { goal: "Increase daily step count to 10,000", priority: 2 },
          { goal: "Improve sleep quality", priority: 3 },
          { goal: "Maintain balanced nutrition", priority: 4 },
        ],
      },
    },
  });

  console.log(`  ✅ Created demo user: ${user.email} (id: ${user.id})`);

  const usersCount = await prisma.user.count();
  console.log(`\n📊 Total users in database: ${usersCount}`);
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
