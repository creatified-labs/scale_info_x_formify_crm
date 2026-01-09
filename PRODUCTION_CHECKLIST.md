# Production Deployment Checklist

## Pre-Deployment Steps

### 1. Environment Variables
- [ ] **CRITICAL**: Remove or leave `NEXT_PUBLIC_WHOP_COMPANY_ID` empty in Vercel production environment
  - This should ONLY be set in local development
  - Production will auto-detect company from Whop iframe context

- [ ] Verify all required environment variables are set in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_WHOP_APP_ID`
  - `WHOP_API_KEY`
  - `WHOP_WEBHOOK_SECRET`
  - `RESEND_API_KEY` (for emails)
  - `RESEND_FROM_EMAIL`
  - `RESEND_FROM_NAME`
  - `TWILIO_ACCOUNT_SID` (for SMS)
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
  - `GOOGLE_CLIENT_ID` (for calendar)
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (update to production URL)

### 2. Database & Migrations
- [ ] Ensure all Supabase migrations are applied to production database
- [ ] Verify Row Level Security (RLS) policies are enabled on all tables
- [ ] Test that new companies can be created without conflicts
- [ ] Confirm no test data exists in production database

### 3. Whop Integration
- [ ] App is registered and approved in Whop dashboard
- [ ] Whop webhook URL is configured to point to production: `https://your-domain.com/api/webhooks/whop`
- [ ] Whop OAuth redirect URI is set to production URL
- [ ] Whop app permissions are correctly configured:
  - Company access
  - User info access

### 4. Code Verification
- [ ] Mock data seeding is disabled (removed from AuthContext)
- [ ] Dev-auth routes are protected by `NODE_ENV === 'development'` check
- [ ] No hardcoded test company IDs in production code paths
- [ ] All console logs include proper context tags (e.g., `[whop-session]`, `[Auth]`)

### 5. First-Time User Experience
- [ ] Test new user signup flow through Whop
- [ ] Verify fresh install creates:
  - New company record with correct Whop org ID
  - New user with proper metadata (company_id, whop_org_id)
  - Default event type (30 Minute Meeting)
  - Profile record for RLS
- [ ] Confirm new users see empty state (no mock data)
- [ ] Test that user can:
  - View dashboard
  - Create bookings
  - Add revenue entries
  - Access all features

## Testing New Installation

### Test Scenario 1: Brand New User
1. Install app through Whop as a completely new company
2. Verify app loads without errors
3. Check browser console for any bootstrap errors
4. Confirm empty dashboard (no mock data)
5. Create a test booking to verify database permissions
6. Add manual revenue entry to verify write access

### Test Scenario 2: Existing User, New Company
1. Have existing user install to a different Whop company
2. Verify session switches to new company context
3. Confirm data isolation (can't see other company's data)
4. Test CRUD operations work correctly

### Test Scenario 3: Returning User
1. Existing user returns to app
2. Session should restore automatically
3. Previous data should be visible
4. No bootstrap errors in console

## Common Bootstrap Issues & Solutions

### Issue: "No company ID available"
**Cause**: App is not receiving Whop context or NEXT_PUBLIC_WHOP_COMPANY_ID is set in production
**Solution**:
- Ensure app is accessed through Whop iframe
- Remove NEXT_PUBLIC_WHOP_COMPANY_ID from Vercel production environment
- Check Whop app configuration

### Issue: "Failed to create company"
**Cause**: Database permissions or duplicate company
**Solution**:
- Check Supabase logs for detailed error
- Verify RLS policies allow company creation
- Check if company with same whop_company_id already exists

### Issue: "Failed to set session"
**Cause**: Invalid tokens or Supabase configuration
**Solution**:
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check that user was created successfully in auth.users
- Ensure password was set properly

### Issue: User sees test data
**Cause**: Mock data seeding is still enabled or test data in database
**Solution**:
- Verify seedMockData() is NOT called in production
- Clean up any test data from production database
- Check localStorage for `formify_mock_data_seeded` key

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor Vercel logs for bootstrap errors
- [ ] Check Supabase logs for database errors
- [ ] Track successful user signups in Whop dashboard
- [ ] Monitor error reporting service (if configured)

### First Week
- [ ] Review user feedback on onboarding experience
- [ ] Check for any repeated error patterns
- [ ] Verify webhook deliveries from Whop
- [ ] Confirm email/SMS notifications are working

## Rollback Plan

If critical issues are discovered:
1. Revert deployment in Vercel
2. Identify root cause using logs
3. Fix issues in development
4. Re-test before re-deploying

## Support Information

If users report setup issues, collect:
- Browser console logs (especially [whop-session] and [Auth] tags)
- Whop company ID (biz_xxx)
- Timestamp of installation attempt
- Any error messages shown to user
- Screenshot of issue if visual

## Security Reminders

- [ ] Never commit `.env.local` to git
- [ ] Never expose service role keys in client-side code
- [ ] Ensure RLS is enabled on ALL tables
- [ ] Review Supabase security best practices
- [ ] Keep all dependencies updated

---

## Bootstrap Flow Documentation

### How New User Setup Works

1. **User installs app from Whop**
   - Whop redirects to app URL with company context
   - App loads in Whop iframe

2. **AuthContext initializes** ([AuthContext.tsx:23-158](src/contexts/AuthContext.tsx#L23-L158))
   - Checks for existing Supabase session
   - If no session, calls `bootstrapWhopUser()`

3. **Bootstrap process** ([whop-bootstrap.ts:11-167](src/lib/whop-bootstrap.ts#L11-L167))
   - Reads company ID from Whop iframe context
   - Calls `/api/whop-session` with company ID

4. **Server creates setup** ([whop-session/route.ts:17-464](src/app/api/whop-session/route.ts#L17-L464))
   - Validates Whop user token (if available)
   - Creates/finds company record
   - Creates/finds user record
   - Creates default event type for new companies
   - Creates profile for RLS
   - Generates session tokens

5. **Client establishes session**
   - Receives tokens from server
   - Calls `supabase.auth.setSession()`
   - User is now authenticated and can access app

### Key Files
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) - Main auth flow
- [src/lib/whop-bootstrap.ts](src/lib/whop-bootstrap.ts) - Client-side bootstrap logic
- [src/app/api/whop-session/route.ts](src/app/api/whop-session/route.ts) - Server-side setup

---

**Last Updated**: 2026-01-09
**Status**: ✅ Ready for production deployment
