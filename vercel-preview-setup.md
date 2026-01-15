# Vercel Preview Environments Setup

This guide will help you set up staged production environments for your Whop app.

## Overview

Vercel automatically creates preview deployments for:
- Every push to non-production branches
- Every pull request

You can have separate Supabase environments for production and preview.

## Setup Steps

### 1. Create Preview Supabase Project (Optional but Recommended)

For true isolation, create a separate Supabase project for previews:

1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Name it: `scale-info-x-formify-crm-preview`
4. Copy the new project's credentials

### 2. Configure Vercel Environment Variables

Go to your Vercel project settings:
https://vercel.com/your-team/scale-info-x-formify-crm/settings/environment-variables

#### Production Variables (Already set)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

#### Preview Variables (Add these)
For each variable above, create a **Preview** version:
- Select "Preview" environment
- Use your preview Supabase project's credentials

### 3. Configure Branch-Specific Deployments

In your Vercel project settings:

**Production Branch:** `main` (or `master`)
**Preview Branches:** All other branches

### 4. Test the Setup

```bash
# Create a new branch
git checkout -b feature/test-preview

# Make a change
echo "test" >> README.md

# Commit and push
git add .
git commit -m "test: preview deployment"
git push origin feature/test-preview
```

Vercel will automatically:
1. Create a preview deployment
2. Use the Preview environment variables
3. Give you a unique URL like: `https://scale-info-x-formify-crm-abc123.vercel.app`

### 5. Migration Strategy for Previews

When testing migrations in preview:

1. **Apply to preview database first:**
   ```bash
   # Set preview DB URL
   export SUPABASE_DB_URL="your-preview-db-url"

   # Run migration
   ./scripts/apply-migration.sh
   ```

2. **Test thoroughly in preview**

3. **Apply to production when ready:**
   ```bash
   # Set production DB URL
   export SUPABASE_DB_URL="your-production-db-url"

   # Run migration
   ./scripts/apply-migration.sh
   ```

## Simplified Setup (Single Database)

If you don't want separate databases, you can use the same Supabase for both:

1. **Keep the same environment variables for all environments**
2. **Use branch protection on main** to prevent accidental changes
3. **Test in preview deployments** before merging to main

### Vercel Settings for Single Database

Environment Variables (ALL environments):
- ✅ Production
- ✅ Preview
- ✅ Development

This way, all deployments use the same database.

## Current Migration Status

The migration we just created will:
- ✅ Sync bookings to call_logs automatically
- ✅ Update analytics tables in real-time
- ✅ Work across all environments

## Recommended Workflow

1. **Develop on feature branch** → Preview deployment
2. **Test in preview** → Verify analytics work
3. **Merge to main** → Production deployment
4. **Monitor** → Check analytics in production

## Useful Commands

```bash
# Check current Vercel deployments
vercel list

# Deploy preview manually
vercel --prod=false

# Deploy to production manually
vercel --prod

# Check environment variables
vercel env ls
```

## Next Steps After Migration

1. ✅ Apply migration to production database
2. ✅ Verify bookings are synced to call_logs
3. ✅ Test analytics display
4. ✅ Create a preview branch to test future changes
