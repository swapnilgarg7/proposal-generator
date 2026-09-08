-- Adds LINK_ISSUED to the proposal audit trail.
--
-- The trail already recorded LINK_REVOKED but had no counterpart for a link
-- being minted, so "when did this client link start working" was unanswerable
-- from the record. Share tokens are stored only as a SHA-256, which makes the
-- event the only trace that issuance happened at all.
ALTER TYPE "ProposalEventType" ADD VALUE 'LINK_ISSUED' BEFORE 'LINK_REVOKED';
