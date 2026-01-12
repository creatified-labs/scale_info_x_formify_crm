# Whop Integration Guide

This document outlines the complete Whop integration setup for your CRM application.

## Overview

Your app is a **Whop Dashboard View** application that:
- Runs embedded in Whop's iframe
- Receives authentication via `x-whop-user-token` header
- Supports owner and closer roles
- Includes a static Experience View page (coming soon)

## Required Whop Permissions

You need to configure these permissions in the [Whop Developer Dashboard](https://whop.com/dashboard/developer):

### Required Permissions:
1. **Read User Data** - To verify user identity and get profile information
2. **Read Memberships** - To check which products/experiences users have access to
3. **Read Company Data** - To verify team member access and company information

### How to Configure:
1. Go to https://whop.com/dashboard/developer
2. Select your app: `app_KWetO0HVFn9Ix5`
3. Click on the **Permissions** tab
4. Click **Add permissions**
5. Select the permissions listed above
6. For each permission, write a brief explanation:
   - "To authenticate users and verify their identity"
   - "To check user access to products and experiences"
   - "To verify team member roles and company access"
7. Mark all as **Required**
8. Click **Save**

## Installation

After configuring permissions, install your app:
1. Visit: `https://whop.com/apps/app_KWetO0HVFn9Ix5/install`
2. Select your company: `biz_5c2wnbWihQovAt`
3. Approve the requested permissions

## Implementation Status

### ✅ Completed:
- [x] Whop SDK packages installed (`@whop-apps/sdk`, `@whop-apps/core`, `@whop-apps/iframe`)
- [x] Environment variables configured (`WHOP_API_KEY`, `NEXT_PUBLIC_WHOP_APP_ID`, `NEXT_PUBLIC_WHOP_COMPANY_ID`)
- [x] Comprehensive Whop SDK wrapper (`/src/lib/whop.ts`)
- [x] Authentication middleware (`/src/middleware/whop-auth.ts`)
- [x] Webhook signature verification (security)
- [x] Production environment variable validation
- [x] Access control implemented on protected API routes

### 🚧 To Do:
- [ ] Configure permissions in Whop Developer Dashboard (see section below)
- [ ] Create static Experience View page
- [ ] Implement Dashboard View with owner/closer role separation
- [ ] Test authentication flow end-to-end
- [ ] Test payment verification integration

## File Structure

```
src/
├── lib/
│   ├── whop.ts                    # Main Whop SDK wrapper
│   ├── whop-sdk.ts                # Legacy SDK utilities
│   └── whop-bootstrap.ts          # Bootstrap logic
├── middleware/
│   └── whop-auth.ts               # Authentication middleware
├── app/
│   ├── dashboard/[companyId]/     # Dashboard View (owners/closers)
│   └── experience/[experienceId]/ # Experience View (customers)
```

## Authentication Flow

### 1. User Access
When a user accesses your app through Whop:
- Whop embeds your app in an iframe
- Whop sends `x-whop-user-token` header with every request
- Your app validates this token using `whopSDK.verifyUserToken()`

### 2. Authorization
For protected routes:
- **Dashboard View**: Requires `admin` access level (team members only)
- **Experience View**: Requires `customer` or `admin` access level (valid membership)

### 3. Resource IDs
- **Company ID**: `biz_5c2wnbWihQovAt` - Your main company
- **Product IDs**: `prod_xxxx` - Specific products users can purchase
- **Experience IDs**: `exp_xxxx` - Customer-facing experiences

## Usage Examples

### Server Component Authentication
```typescript
import { headers } from 'next/headers';
import { whopSDK } from '@/lib/whop';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const headersList = await headers();
  
  // Verify user token
  const { userId } = await whopSDK.verifyUserToken(headersList);
  
  // Check admin access
  const access = await whopSDK.checkAccess(companyId, userId);
  
  if (access.access_level !== 'admin') {
    return <div>Admin access required</div>;
  }
  
  return <div>Welcome to the dashboard!</div>;
}
```

### API Route Protection (Implemented)
The middleware functions are now used in protected API routes:

**Example: `/api/whop/company/[companyId]/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireDashboardAccess } from "@/middleware/whop-auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await context.params;

  // Verify user has admin access to this company
  const auth = await requireDashboardAccess(request, companyId);
  if (auth instanceof NextResponse) {
    return auth; // Return error response (401 or 403)
  }

  // User is authenticated and authorized - proceed with request
  console.log(`✅ Authorized user ${auth.userId} accessing company ${companyId}`);

  // ... rest of route logic
}
```

**Protected Routes:**
- ✅ `/api/whop/company/[companyId]` - Requires dashboard access
- ✅ Webhook signature verification on `/api/webhooks/whop`

### Check Product Access
```typescript
const productId = 'prod_xxxxxxxxxxxxx';
const access = await whopSDK.checkAccess(productId, userId);

if (access.has_access) {
  // User has valid membership to this product
  console.log('Access level:', access.access_level); // 'customer' or 'admin'
}
```

## Access Levels

### `customer`
- User has a valid membership
- For experiences: Access to any product connected to the experience
- For products: Access to that specific product
- For companies: Access to any product on the company

### `admin`
- User is a team member (any role including moderator)
- Full access to Dashboard View
- Can manage company settings

### `no_access`
- User has no valid membership or team access
- `has_access` will be `false`

## Role Separation (Owner vs Closer)

To implement owner/closer roles:

1. **Check access level**: All team members have `admin` access
2. **Check specific role**: Use Whop's team member API to get role details
3. **Implement UI restrictions**: Show/hide features based on role

```typescript
// Get user's team role
const userToken = headersList.get('x-whop-user-token');
const user = await whopSDK.getUser(userToken!);

// Check if user is owner (you'll need to implement role checking)
const isOwner = user.role === 'owner'; // Adjust based on Whop's API

if (isOwner) {
  // Show owner-only features
} else {
  // Show closer features only
}
```

## Payment Verification

Your existing `check-whop-payment` Edge Function can be used to verify payments:

```typescript
const response = await fetch('/functions/v1/check-whop-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  body: JSON.stringify({
    email: booking.invitee_email,
  }),
});
```

## Testing

### Local Development
1. Use Whop's dev proxy for local testing
2. Set up environment variables in `.env.local`
3. Test with real Whop user tokens

### Production
1. Deploy to Vercel
2. Configure app URL in Whop Developer Dashboard
3. Install app on your company
4. Test authentication and authorization flows

## Next Steps

1. **Configure Permissions** (CRITICAL)
   - Go to Whop Developer Dashboard
   - Add required permissions
   - Install app on your company

2. **Create Experience View**
   - Build static page for customers
   - Add access verification

3. **Implement Dashboard Routing**
   - Set up `/dashboard/[companyId]` routes
   - Add owner/closer role separation
   - Protect routes with authentication middleware

4. **Test Integration**
   - Verify authentication works
   - Test access control
   - Validate payment checking

## Security Features

### Webhook Signature Verification
All webhooks from Whop are now verified using HMAC SHA-256 signatures:
- Required in production (enforced automatically)
- Uses `WHOP_WEBHOOK_SECRET` environment variable
- Rejects invalid webhooks with 401 Unauthorized
- Skipped in development for easier testing

### Production Environment Validation
The app automatically validates production configuration on startup:
- Throws error if `NEXT_PUBLIC_WHOP_COMPANY_ID` is set in production
- Prevents multi-company data leakage
- Shows clear remediation instructions
- Implemented in [`src/lib/whop-bootstrap.ts`](src/lib/whop-bootstrap.ts)

### API Route Protection
Protected routes use Whop authentication middleware:
- Validates `x-whop-user-token` header
- Checks admin access level via Whop API
- Returns proper HTTP status codes (401/403)
- Middleware located in [`src/middleware/whop-auth.ts`](src/middleware/whop-auth.ts)

## Support

- [Whop Documentation](https://docs.whop.com/developer)
- [Whop Developer Dashboard](https://whop.com/dashboard/developer)
- [API Reference](https://docs.whop.com/api-reference)
