-- CreateEnum
CREATE TYPE "PractitionerSpecialty" AS ENUM ('PHYSIOTHERAPIST', 'NUTRITIONIST', 'GENERAL_PRACTITIONER');

-- CreateEnum
CREATE TYPE "PatientLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "practitioners" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "specialty" "PractitionerSpecialty" NOT NULL,
    "clinic_name" TEXT,
    "license_number" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practitioners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_links" (
    "id" TEXT NOT NULL,
    "practitioner_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "status" "PatientLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "shared_data" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practitioners_user_id_key" ON "practitioners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_links_practitioner_id_patient_id_key" ON "patient_links"("practitioner_id", "patient_id");

-- AddForeignKey
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_links" ADD CONSTRAINT "patient_links_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "practitioners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_links" ADD CONSTRAINT "patient_links_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
