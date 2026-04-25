-- align_drift_and_add_order_diagnostics
-- Three changes in one migration:
--   1. Idempotent ADD of 4 Order tracking columns that drifted from
--      a past `prisma db push` and are read/written by
--      src/app/api/webhooks/printful/route.ts.
--   2. Align OwnerCredential.mustRotatePassword default to live DB
--      (was set to `true` manually in production for security).
--   3. Add 3 new Order diagnostic columns (emailSentAt,
--      printfulCalledAt, paymentProvider).

-- 1. Order tracking columns (drift reconcile, idempotent)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingNumber"  TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingCarrier" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippedAt"       TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingUrl"     TEXT;

-- 2. OwnerCredential default reconcile (idempotent — re-applying SET
--    DEFAULT to the same value is a no-op).
ALTER TABLE "OwnerCredential" ALTER COLUMN "mustRotatePassword" SET DEFAULT true;

-- 3. New Order diagnostic columns
ALTER TABLE "Order" ADD COLUMN "emailSentAt"      TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "printfulCalledAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "paymentProvider"  TEXT;
