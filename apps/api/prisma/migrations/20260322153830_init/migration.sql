-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SELLER');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('T1', 'T2', 'T3', 'CONTRACTED', 'LOST');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "pinHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SELLER',
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "stage" "Stage" NOT NULL DEFAULT 'T1',
    "score" INTEGER NOT NULL DEFAULT 0,
    "area" TEXT NOT NULL DEFAULT '',
    "floors" TEXT NOT NULL DEFAULT '',
    "construction" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "insulation" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentSystem" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentSystemOther" TEXT NOT NULL DEFAULT '',
    "connectedTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consumptionType" TEXT NOT NULL DEFAULT '',
    "consumptionAmount" TEXT NOT NULL DEFAULT '',
    "consumptionUnit" TEXT NOT NULL DEFAULT '',
    "electricConnection" TEXT NOT NULL DEFAULT '',
    "pvPower" TEXT NOT NULL DEFAULT '',
    "batteries" TEXT NOT NULL DEFAULT '',
    "inverter" TEXT NOT NULL DEFAULT '',
    "annualProduction" TEXT NOT NULL DEFAULT '',
    "hasSolarPanels" BOOLEAN NOT NULL DEFAULT false,
    "t1Step" INTEGER NOT NULL DEFAULT 0,
    "t1Checks" JSONB NOT NULL DEFAULT '{}',
    "t1Notes" JSONB NOT NULL DEFAULT '{}',
    "budgetLevel" TEXT NOT NULL DEFAULT '',
    "primaryType" TEXT NOT NULL DEFAULT '',
    "secondaryType" TEXT NOT NULL DEFAULT '',
    "positiveReaction" TEXT NOT NULL DEFAULT '',
    "t1Resistances" TEXT NOT NULL DEFAULT '',
    "t2Step" INTEGER NOT NULL DEFAULT 0,
    "t2Checks" JSONB NOT NULL DEFAULT '{}',
    "t2Notes" JSONB NOT NULL DEFAULT '{}',
    "timeline" TEXT NOT NULL DEFAULT '',
    "technicalSolution" TEXT NOT NULL DEFAULT '',
    "priceReaction" TEXT NOT NULL DEFAULT '',
    "t2Resistances" TEXT NOT NULL DEFAULT '',
    "t3Step" INTEGER NOT NULL DEFAULT 0,
    "t3Checks" JSONB NOT NULL DEFAULT '{}',
    "t3Notes" JSONB NOT NULL DEFAULT '{}',
    "calculatedConsumption" TEXT NOT NULL DEFAULT '',
    "installedPower" TEXT NOT NULL DEFAULT '',
    "offeredAmount" TEXT NOT NULL DEFAULT '',
    "paymentVariant" TEXT NOT NULL DEFAULT '',
    "installmentAmount" TEXT NOT NULL DEFAULT '',
    "fullPaymentAmount" TEXT NOT NULL DEFAULT '',
    "depositAmount" TEXT NOT NULL DEFAULT '',
    "offerReaction" TEXT NOT NULL DEFAULT '',
    "t3Resistances" TEXT NOT NULL DEFAULT '',
    "lossReason" TEXT NOT NULL DEFAULT '',
    "lossNote" TEXT NOT NULL DEFAULT '',
    "nextContact" TIMESTAMP(3),
    "importNote" TEXT NOT NULL DEFAULT '',
    "formNotes" TEXT NOT NULL DEFAULT '',
    "fisaData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resistance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resistance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex
CREATE INDEX "Client_tenantId_stage_idx" ON "Client"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "Client_tenantId_assignedToId_idx" ON "Client"("tenantId", "assignedToId");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_updatedAt_idx" ON "Client"("updatedAt");

-- CreateIndex
CREATE INDEX "ActivityLog_clientId_idx" ON "ActivityLog"("clientId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "Call_clientId_idx" ON "Call"("clientId");

-- CreateIndex
CREATE INDEX "Resistance_clientId_idx" ON "Resistance"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Target_tenantId_userId_month_key" ON "Target"("tenantId", "userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_tenantId_key_key" ON "MessageTemplate"("tenantId", "key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resistance" ADD CONSTRAINT "Resistance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resistance" ADD CONSTRAINT "Resistance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
