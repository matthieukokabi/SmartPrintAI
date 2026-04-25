-- add_product_translations
-- Adds two nullable JSONB columns to Product for per-locale name/description.
-- Shape (when populated): { "en": "...", "fr": "...", "de": "...", "es": "..." }
-- Existing rows remain NULL until the backfill script runs.

ALTER TABLE "Product" ADD COLUMN "nameTranslations"        JSONB;
ALTER TABLE "Product" ADD COLUMN "descriptionTranslations" JSONB;
