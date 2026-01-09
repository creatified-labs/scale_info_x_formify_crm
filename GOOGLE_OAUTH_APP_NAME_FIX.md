# Fix Google OAuth to Show App Name Instead of URL

## Problem
When users connect Google Calendar, the OAuth consent screen shows your app's URL instead of a friendly app name like "Formify CRM" or your Whop app name.

## Solution
This is configured in **Google Cloud Console**, not in code. Follow these steps:

---

## Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with the OAuth credentials from your `.env.local`)
3. Your Client ID: `867145626009-q4s3injmeunf1ecafsrso21f8olrjqeq.apps.googleusercontent.com`

---

## Step 2: Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**

2. Click **"Edit App"** (or create if not exists)

3. **Update these fields:**

   ### App Information
   - **App name**: `Formify CRM` (or your preferred Whop app name)
   - **User support email**: `no-reply@formifycrm.com`
   - **App logo**: Upload your Formify CRM logo (optional but recommended)
   - **Application home page**: `https://scale-info-x-formify-crm.vercel.app` (or your production URL)
   - **Application privacy policy link**: `https://scale-info-x-formify-crm.vercel.app/privacy` (create if needed)
   - **Application terms of service link**: `https://scale-info-x-formify-crm.vercel.app/terms` (create if needed)

   ### Developer Contact Information
   - **Developer contact email**: Your email address

4. Click **"Save and Continue"**

---

## Step 3: Configure Scopes (if needed)

1. On the **Scopes** page, ensure you have:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

2. These scopes should already be configured since your app is working

3. Click **"Save and Continue"**

---

## Step 4: Publish the App

### For Internal/Testing Use
1. On the **OAuth consent screen** page
2. Under **Publishing status**, keep it as **"Testing"**
3. Add your test users (the email addresses that will connect)
4. This is fine for Whop apps used by specific customers

### For Public Use (Recommended for Whop Apps)
1. Click **"Publish App"**
2. This makes the consent screen cleaner (no "unverified app" warning)
3. For basic scopes like Calendar, verification is usually not required
4. If Google asks for verification, you can proceed without it for now

---

## Step 5: Verify the Change

1. In your app, disconnect Google Calendar if already connected
2. Click "Connect Google Calendar" again
3. You should now see **"Formify CRM"** (or your chosen name) on the consent screen
4. Instead of seeing a URL or "unverified app" warning

---

## Important Notes

### The Consent Screen Shows:
- ✅ **App name** you set in OAuth consent screen
- ✅ **App logo** (if uploaded)
- ✅ **Scopes** being requested (Calendar access)
- ✅ **Your Google Cloud project name** (as subtitle)

### Common Issues:

**Still showing URL?**
- Clear browser cache/cookies
- Make sure you saved changes in Google Cloud Console
- Wait 5-10 minutes for changes to propagate
- Try in incognito mode

**Showing "unverified app" warning?**
- This is normal for testing mode
- Either: Add users to test users list
- Or: Publish the app (no verification needed for Calendar scopes)

**Want to remove the warning entirely?**
- Publish the app (not just testing mode)
- Basic scopes like Calendar don't require verification
- Your users will see a cleaner consent screen

---

## Current Configuration

From your `.env.local`:
- **App Name in Code**: `Agency CRM` (from `NEXT_PUBLIC_APP_NAME`)
- **Redirect URI**: `https://scale-info-x-formify-crm.vercel.app/api/google-oauth-callback`
- **Client ID**: `867145626009-q4s3injmeunf1ecafsrso21f8olrjqeq.apps.googleusercontent.com`

**Recommended App Name for Consent Screen**:
- Use `Formify CRM` or your Whop app's branded name
- This is what users will see when connecting Google Calendar

---

## Optional: Update App Name in Environment

If you want to match your environment variable to the OAuth screen:

```bash
# In Vercel environment variables and .env.local
NEXT_PUBLIC_APP_NAME="Formify CRM"
```

This is used in various places in your app's UI.

---

## After Making Changes

Test the flow:
1. Go to Integrations settings
2. Click "Connect Google Calendar"
3. Verify the OAuth consent screen shows your app name
4. Complete the connection

---

## Need Help?

If you're still seeing the URL or having issues:
1. Check that you're editing the correct Google Cloud project
2. Verify the Client ID matches your `.env.local`
3. Clear browser cache completely
4. Try in a different browser or incognito mode

---

**Last Updated**: 2026-01-09
