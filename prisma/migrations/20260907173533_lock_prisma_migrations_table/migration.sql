-- Prisma creates _prisma_migrations without RLS, leaving it readable over
-- PostgREST by `anon`. It holds no user data, but it does disclose the schema's
-- entire evolution -- migration names, timestamps and checksums -- which is free
-- reconnaissance for anyone poking at the API with the publishable key.
--
-- Prisma connects as the table owner and owners bypass RLS, so locking this has
-- no effect on migrate/deploy.

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."_prisma_migrations" FROM anon, authenticated;
