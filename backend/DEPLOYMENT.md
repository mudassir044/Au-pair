# Deployment Guide

## For Render.com Deployment

### Build Command

Use this build command in your Render.com service settings:

```bash
cd backend && npm install && npx prisma migrate deploy && npm run build
```

### Important Notes

1. **Use `prisma migrate deploy` for production**, not `prisma db push`
   - `db push` is for development and doesn't handle migrations properly
   - `migrate deploy` applies pending migrations safely

2. **Environment Variables Required**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `NODE_ENV`: Set to "production"

3. **Migration Strategy**
   - All schema changes should be done through proper migrations
   - Never use `--accept-data-loss` in production
   - Test migrations in staging environment first

### Troubleshooting

If you encounter "data loss" warnings during deployment:

1. Check the migration files in `prisma/migrations/`
2. Ensure data migration is handled properly before column removal
3. Use `npx prisma migrate deploy` instead of `npx prisma db push`

### Scripts Available

- `npm run deploy`: Runs migrations and builds the project
- `npm run db:migrate:deploy`: Applies pending migrations to production
- `npm run build`: Builds the TypeScript project
- `npm start`: Starts the production server
