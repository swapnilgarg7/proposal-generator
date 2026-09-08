-- Adds the COMPARISON_TABLE block type.
--
-- Positioned before TIMELINE purely to match the enum order in schema.prisma.
-- Nothing sorts on the enum: blocks order by ProposalBlock.order, so the
-- position here is cosmetic and no existing row is touched.
--
-- Postgres 12+ permits ALTER TYPE ... ADD VALUE inside a transaction as long as
-- the new value is not itself used in that transaction. Supabase is well past
-- that, and this migration only declares the value.
ALTER TYPE "BlockType" ADD VALUE 'COMPARISON_TABLE' BEFORE 'TIMELINE';
