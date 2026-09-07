-- Deny-by-default Row Level Security on every Prisma-managed table.
--
-- Why, given all application access goes through Prisma:
--   Supabase exposes PostgREST over the same database, and our publishable key
--   ships to the browser. Without RLS, anyone who reads that key out of the page
--   source can query these tables directly over the REST API -- signed
--   contracts, client contact details, payment records, the lot.
--
-- Enabling RLS with NO policies means PostgREST (which connects as `anon` or
-- `authenticated`) can read nothing. Prisma connects as the table owner, and
-- owners bypass RLS unless FORCE ROW LEVEL SECURITY is set, so application
-- queries are unaffected.
--
-- This is the cheapest meaningful lockdown available: no policies to maintain,
-- no query changes, and it fails closed rather than open.
--
-- Tenancy isolation is a SEPARATE concern and is not handled here -- that lives
-- in lib/repositories/*, which scope every query by organizationId.

ALTER TABLE "public"."ai_jobs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."ai_jobs" FROM anon, authenticated;
ALTER TABLE "public"."blueprint_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."blueprint_requests" FROM anon, authenticated;
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."clients" FROM anon, authenticated;
ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."contacts" FROM anon, authenticated;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."organizations" FROM anon, authenticated;
ALTER TABLE "public"."otp_challenges" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."otp_challenges" FROM anon, authenticated;
ALTER TABLE "public"."payment_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."payment_events" FROM anon, authenticated;
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."payments" FROM anon, authenticated;
ALTER TABLE "public"."proposal_blocks" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."proposal_blocks" FROM anon, authenticated;
ALTER TABLE "public"."proposal_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."proposal_events" FROM anon, authenticated;
ALTER TABLE "public"."proposal_versions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."proposal_versions" FROM anon, authenticated;
ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."proposals" FROM anon, authenticated;
ALTER TABLE "public"."service_catalog_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."service_catalog_items" FROM anon, authenticated;
ALTER TABLE "public"."signatures" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."signatures" FROM anon, authenticated;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."users" FROM anon, authenticated;
