-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'TIER_SELECTED', 'SIGNED', 'AWAITING_PAYMENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocTheme" AS ENUM ('DARK', 'LIGHT');

-- CreateEnum
CREATE TYPE "AgreementMode" AS ENUM ('INLINE_ESIGN', 'EXTERNAL_UPWORK', 'EXTERNAL_OTHER');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('COVER', 'PROBLEM_STATEMENT', 'RICH_TEXT', 'SCOPE_OF_WORK', 'PRICING_TIERS', 'ADD_ONS', 'SERVICE_COSTS', 'TIER_LIMITS', 'TIMELINE', 'TERMS', 'BLUEPRINT_OFFER', 'PAYMENT', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('TYPED', 'DRAWN');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('DEPOSIT', 'FINAL', 'FULL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentTiming" AS ENUM ('NONE', 'DEPOSIT_BEFORE_SIGN', 'DEPOSIT_AFTER_SIGN', 'FULL_AFTER_SIGN');

-- CreateEnum
CREATE TYPE "ProposalEventType" AS ENUM ('CREATED', 'PUBLISHED', 'SENT', 'VIEWED', 'BLOCK_VIEWED', 'TIER_SELECTED', 'OTP_SENT', 'OTP_VERIFIED', 'CONSENT_GIVEN', 'SIGNED', 'APPROVED_EXTERNAL', 'PDF_SEALED', 'DOWNLOADED', 'PAYMENT_STARTED', 'PAID', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'LINK_REVOKED');

-- CreateEnum
CREATE TYPE "CatalogKind" AS ENUM ('DELIVERABLE', 'VENDOR_COST', 'SNIPPET');

-- CreateEnum
CREATE TYPE "BillingTarget" AS ENUM ('CLIENT', 'AGENCY', 'INCLUDED');

-- CreateEnum
CREATE TYPE "BlueprintStatus" AS ENUM ('PENDING', 'GENERATING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "logoPath" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#8B5CF6',
    "accentColor" TEXT NOT NULL DEFAULT '#EC4899',
    "tertiaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "email" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "taxId" TEXT,
    "governingLaw" TEXT,
    "bookingUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "defaultTheme" "DocTheme" NOT NULL DEFAULT 'DARK',
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
    "defaultTerms" TEXT,
    "signatureBlockName" TEXT,
    "signatureBlockTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarPath" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "organizationId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "logoPath" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "theme" "DocTheme" NOT NULL DEFAULT 'DARK',
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "contactId" TEXT,
    "publicTokenHash" TEXT,
    "passcodeHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "selectedTierKey" TEXT,
    "selectedTierLabel" TEXT,
    "selectedTierAmountMinor" INTEGER,
    "addOnsAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalAmountMinor" INTEGER,
    "paymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paymentProvider" "PaymentProvider",
    "paymentTiming" "PaymentTiming" NOT NULL DEFAULT 'NONE',
    "depositPercent" INTEGER,
    "agreementMode" "AgreementMode" NOT NULL DEFAULT 'INLINE_ESIGN',
    "externalAgreementUrl" TEXT,
    "externalAgreementNote" TEXT,
    "projectStartDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "publishedVersionId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_blocks" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "order" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_versions" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "pdfPath" TEXT,
    "pdfSha256" TEXT,
    "pdfBytes" INTEGER,
    "pdfRenderedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "proposal_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signerTitle" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "otpChallengeId" TEXT,
    "method" "SignatureMethod" NOT NULL,
    "imagePath" TEXT,
    "strokeData" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "geoCountry" TEXT,
    "geoRegion" TEXT,
    "consentText" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "documentHash" TEXT,
    "timestampToken" TEXT,
    "timestampTsa" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_events" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "type" "ProposalEventType" NOT NULL,
    "meta" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "prevEventHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_catalog_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "CatalogKind" NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "defaultPriceMinor" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "vendorUrl" TEXT,
    "planName" TEXT,
    "monthlyCostMinor" INTEGER,
    "setupCostMinor" INTEGER,
    "billedTo" "BillingTarget",
    "freeLimit" TEXT,
    "freeCaveat" TEXT,
    "paidLimit" TEXT,
    "paidPriceNote" TEXT,
    "recommendation" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blueprint_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "website" TEXT,
    "answers" JSONB NOT NULL,
    "status" "BlueprintStatus" NOT NULL DEFAULT 'PENDING',
    "generatedDocPath" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "error" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blueprint_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "task" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'RUNNING',
    "proposalId" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "cacheWriteTokens" INTEGER,
    "costUsdMicros" INTEGER,
    "durationMs" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseUserId_key" ON "users"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "clients_organizationId_idx" ON "clients"("organizationId");

-- CreateIndex
CREATE INDEX "contacts_clientId_idx" ON "contacts"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_publicTokenHash_key" ON "proposals"("publicTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_publishedVersionId_key" ON "proposals"("publishedVersionId");

-- CreateIndex
CREATE INDEX "proposals_organizationId_status_idx" ON "proposals"("organizationId", "status");

-- CreateIndex
CREATE INDEX "proposals_clientId_idx" ON "proposals"("clientId");

-- CreateIndex
CREATE INDEX "proposal_blocks_proposalId_order_idx" ON "proposal_blocks"("proposalId", "order");

-- CreateIndex
CREATE INDEX "proposal_versions_contentHash_idx" ON "proposal_versions"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_versions_proposalId_versionNumber_key" ON "proposal_versions"("proposalId", "versionNumber");

-- CreateIndex
CREATE INDEX "otp_challenges_proposalId_email_idx" ON "otp_challenges"("proposalId", "email");

-- CreateIndex
CREATE INDEX "signatures_proposalId_idx" ON "signatures"("proposalId");

-- CreateIndex
CREATE INDEX "signatures_versionId_idx" ON "signatures"("versionId");

-- CreateIndex
CREATE INDEX "payments_proposalId_idx" ON "payments"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_providerPaymentId_key" ON "payments"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "payment_events_eventType_idx" ON "payment_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_providerEventId_key" ON "payment_events"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "proposal_events_proposalId_at_idx" ON "proposal_events"("proposalId", "at");

-- CreateIndex
CREATE INDEX "service_catalog_items_organizationId_kind_idx" ON "service_catalog_items"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "blueprint_requests_organizationId_status_idx" ON "blueprint_requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ai_jobs_organizationId_startedAt_idx" ON "ai_jobs"("organizationId", "startedAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "proposal_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_blocks" ADD CONSTRAINT "proposal_blocks_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "proposal_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_events" ADD CONSTRAINT "proposal_events_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_catalog_items" ADD CONSTRAINT "service_catalog_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blueprint_requests" ADD CONSTRAINT "blueprint_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
