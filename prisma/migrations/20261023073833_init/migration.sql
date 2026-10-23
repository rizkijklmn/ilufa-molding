-- CreateEnum
CREATE TYPE "MoldType" AS ENUM ('NEW', 'CUSTOM', 'USED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'ON_ORDER', 'NEGOTIATION', 'SOLD');

-- CreateTable
CREATE TABLE "Mold" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "MoldType" NOT NULL DEFAULT 'USED',
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "dimensions" TEXT,
    "weightKg" DOUBLE PRECISION,
    "cavity" INTEGER,
    "material" TEXT,
    "machineTonnage" TEXT,
    "condition" TEXT,
    "priceLabel" TEXT,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "moldType" TEXT NOT NULL,
    "productNeed" TEXT NOT NULL,
    "dimensions" TEXT,
    "cavity" TEXT,
    "machineInfo" TEXT,
    "budget" TEXT,
    "targetDate" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "moldId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mold_code_key" ON "Mold"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Mold_slug_key" ON "Mold"("slug");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_moldId_fkey" FOREIGN KEY ("moldId") REFERENCES "Mold"("id") ON DELETE SET NULL ON UPDATE CASCADE;
