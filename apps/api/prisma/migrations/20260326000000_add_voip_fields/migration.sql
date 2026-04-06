-- AlterTable
ALTER TABLE "Call" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'initiating';
ALTER TABLE "Call" ADD COLUMN "callSid" TEXT;
ALTER TABLE "Call" ADD COLUMN "fromNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Call" ADD COLUMN "toNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Call" ADD COLUMN "recordingUrl" TEXT;
ALTER TABLE "Call" ADD COLUMN "recordingSid" TEXT;
ALTER TABLE "Call" ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'outbound';
ALTER TABLE "Call" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Call" ADD COLUMN "contactId" TEXT;
ALTER TABLE "Call" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: make duration default to 0
ALTER TABLE "Call" ALTER COLUMN "duration" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Call_callSid_key" ON "Call"("callSid");
CREATE INDEX "Call_tenantId_idx" ON "Call"("tenantId");
CREATE INDEX "Call_callSid_idx" ON "Call"("callSid");
