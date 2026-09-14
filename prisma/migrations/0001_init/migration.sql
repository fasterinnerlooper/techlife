-- CreateEnum
CREATE TYPE "ImportMethod" AS ENUM ('PASTE_TEXT', 'UPLOAD_IMAGE', 'PASTE_URL', 'FREEFORM_DESCRIPTION', 'PHOTO_COLLECTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('CONFIRMED', 'NEEDS_REVIEW', 'POSSIBLE_DUPLICATE', 'REJECTED');

-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('STILL_OWNED', 'SOLD', 'GIVEN_AWAY', 'LOST', 'STOLEN', 'BROKEN', 'RECYCLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('EXACT', 'YEAR', 'SEASON', 'RANGE', 'RELATIVE', 'BEFORE', 'AFTER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PURCHASED', 'RECEIVED', 'STARTED_USING', 'STOPPED_USING', 'SOLD', 'LOST', 'GIVEN_AWAY', 'REPAIRED', 'RETURNED', 'IMPORTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productFamily" TEXT,
    "exactModel" TEXT,
    "releaseDate" TIMESTAMP(3),
    "specsJson" JSONB,
    "imageUrl" TEXT,
    "predecessorId" TEXT,
    "successorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CanonicalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAlias" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,

    CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,
    "ownershipStatus" "OwnershipStatus" NOT NULL DEFAULT 'UNKNOWN',
    "startDate" TIMESTAMP(3),
    "startDateText" TEXT,
    "startDatePrecision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "endDate" TIMESTAMP(3),
    "endDateText" TEXT,
    "endDatePrecision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "purchasePrice" DECIMAL(65,30),
    "purchaseCurrency" TEXT,
    "wherePurchased" TEXT,
    "colour" TEXT,
    "storageCapacity" TEXT,
    "condition" TEXT,
    "notes" TEXT,
    "memories" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "isPricePrivate" BOOLEAN NOT NULL DEFAULT true,
    "isLocationPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceSummary" TEXT,

    CONSTRAINT "OwnershipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipEvent" (
    "id" TEXT NOT NULL,
    "ownershipRecordId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "happenedAt" TIMESTAMP(3),
    "happenedAtText" TEXT,
    "datePrecision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,

    CONSTRAINT "OwnershipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "ImportMethod" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSource" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "sourceUrl" TEXT,
    "sourceText" TEXT,
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedCandidate" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "canonicalProductId" TEXT,
    "extractedName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "categoryKey" TEXT,
    "startDateText" TEXT,
    "endDateText" TEXT,
    "startDatePrecision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "endDatePrecision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "ownershipStatus" "OwnershipStatus" NOT NULL DEFAULT 'UNKNOWN',
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "status" "CandidateStatus" NOT NULL,
    "ambiguityJson" JSONB,
    "evidenceJson" JSONB,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "ownershipRecordId" TEXT NOT NULL,
    "importSourceId" TEXT,
    "snippet" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "ownershipRecordId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timeline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'My Technology Life',
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT 'My Technology Life',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_key_key" ON "Category"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalProduct_manufacturerId_name_key" ON "CanonicalProduct"("manufacturerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAlias_alias_canonicalProductId_key" ON "ProductAlias"("alias", "canonicalProductId");

-- CreateIndex
CREATE INDEX "OwnershipRecord_userId_startDate_idx" ON "OwnershipRecord"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "PublicProfile_userId_key" ON "PublicProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicProfile_slug_key" ON "PublicProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AIJob_importId_requestHash_key" ON "AIJob"("importId", "requestHash");

-- AddForeignKey
ALTER TABLE "CanonicalProduct" ADD CONSTRAINT "CanonicalProduct_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanonicalProduct" ADD CONSTRAINT "CanonicalProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipRecord" ADD CONSTRAINT "OwnershipRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipRecord" ADD CONSTRAINT "OwnershipRecord_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipEvent" ADD CONSTRAINT "OwnershipEvent_ownershipRecordId_fkey" FOREIGN KEY ("ownershipRecordId") REFERENCES "OwnershipRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSource" ADD CONSTRAINT "ImportSource_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedCandidate" ADD CONSTRAINT "ExtractedCandidate_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_ownershipRecordId_fkey" FOREIGN KEY ("ownershipRecordId") REFERENCES "OwnershipRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_ownershipRecordId_fkey" FOREIGN KEY ("ownershipRecordId") REFERENCES "OwnershipRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProfile" ADD CONSTRAINT "PublicProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIJob" ADD CONSTRAINT "AIJob_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

