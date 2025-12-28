# Google Meet Integration Setup Guide

## ✅ What's Already Done

1. **Database Schema** - `user_integrations` table created for storing OAuth tokens
2. **Supabase Edge Functions** - Deployed to handle Google OAuth flow
   - `google-auth-url` - Generates OAuth authorization URL
   - `google-exchange-token` - Exchanges authorization code for access tokens
3. **Frontend Integration** - OAuth flow implemented in IntegrationsSettings component
4. **Environment Variables** - Google credentials configured in `.env.local`

## 🔧 Required Setup Steps

### 1. Configure Google Cloud Console

You need to update your Google Cloud Console OAuth redirect URIs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (check your `.env.local` file for `GOOGLE_CLIENT_ID`)
5. Add these **Authorized redirect URIs**:
   ```
   http://localhost:3000/oauth/callback
   https://rwmmiosgsncsxiehkyyd.supabase.co/functions/v1/google-exchange-token
   https://your-production-domain.com/oauth/callback
   ```

### 2. Enable Required Google APIs

In Google Cloud Console, enable these APIs:
- **Google Calendar API**
- **Google Meet API** (if available)

### 3. Set Supabase Secrets

Run these commands to set the secrets in Supabase (use your actual values from `.env.local`):

```bash
supabase secrets set GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="your-google-client-secret"
supabase secrets set GOOGLE_REDIRECT_URI="https://rwmmiosgsncsxiehkyyd.supabase.co/functions/v1/google-exchange-token"
```

## 🚀 How to Use

### For Users

1. Navigate to **Scheduling** → **Integrations** in your app
2. Click **"Connect Google Calendar"**
3. Authorize the app in the Google OAuth popup
4. Your Google Calendar will now sync with bookings

### OAuth Flow

1. User clicks "Connect Google Calendar"
2. App calls `google-auth-url` Edge Function to get authorization URL
3. User is redirected to Google OAuth consent screen
4. After approval, Google redirects to `google-exchange-token` Edge Function
5. Edge Function exchanges code for tokens and stores in `user_integrations` table
6. User is redirected back to `/oauth/callback` page
7. Integration is now active

## 📊 Database Schema

```sql
user_integrations
├── id (UUID)
├── user_id (UUID) → auth.users
├── provider (TEXT) - 'google'
├── email (TEXT) - User's Google email
├── access_token (TEXT) - OAuth access token
├── refresh_token (TEXT) - OAuth refresh token
├── expires_at (TIMESTAMPTZ) - Token expiration
├── scope (TEXT) - Granted scopes
├── metadata (JSONB) - Additional user info
└── created_at/updated_at (TIMESTAMPTZ)
```

## 🔐 Security

- Row Level Security (RLS) enabled on `user_integrations` table
- Users can only access their own integrations
- Tokens are stored securely in Supabase
- OAuth uses PKCE flow for additional security

## 🐛 Troubleshooting

### "Failed to connect Google"
- Check that redirect URIs are configured correctly in Google Cloud Console
- Verify Supabase secrets are set correctly
- Check browser console for detailed error messages

### "Missing authorization code"
- Ensure user completes the OAuth flow
- Check that Google Cloud Console has the correct redirect URIs

### "Token exchange failed"
- Verify GOOGLE_CLIENT_SECRET is correct
- Check that the authorization code hasn't expired (they expire quickly)

## 📝 Environment Variables

**Local Development (.env.local):**
```
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/oauth/callback"
NEXT_PUBLIC_ENABLE_GOOGLE_MEET="true"
```

**Note:** Your actual credentials are already configured in your `.env.local` file.

**Production (Supabase Secrets):**
Set via `supabase secrets set` command (see above)

## 🎯 Next Steps

1. Complete Google Cloud Console setup (add redirect URIs)
2. Set Supabase secrets
3. Test the OAuth flow in localhost
4. Deploy to production and test again
5. Monitor integration usage in Supabase Dashboard

## 📚 Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
