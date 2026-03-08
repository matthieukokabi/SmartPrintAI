# Prisma Migration Workflow

## One-time baseline for existing production DB
1. Create a baseline migration folder name.
2. Generate SQL from current Prisma schema:
   - `mkdir -p prisma/migrations/<baseline_name>`
   - `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<baseline_name>/migration.sql`
3. Mark baseline as already applied on production:
   - `npx prisma migrate resolve --applied <baseline_name>`
4. Verify status:
   - `npm run db:migrate:status`

## Ongoing development
- Create a new migration:
  - `npm run db:migrate:dev -- --name <migration_name>`

## Production deploy
1. Pull latest code.
2. Run deploy-safe migration command:
   - `npm run db:migrate:deploy-safe`
3. Restart app service.
4. Verify health endpoints.
