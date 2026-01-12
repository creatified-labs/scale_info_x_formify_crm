/**
 * Shared helper to refresh Google OAuth tokens
 * Use this in all edge functions that need to access Google Calendar API
 */

interface TokenRefreshResult {
  accessToken: string
  refreshed: boolean
  error?: string
}

/**
 * Get a valid Google access token, refreshing if necessary
 * @param supabaseClient - Supabase client instance
 * @param integration - User integration record with access_token, refresh_token, expires_at
 * @returns Valid access token and whether it was refreshed
 */
export async function getValidGoogleToken(
  supabaseClient: any,
  integration: {
    access_token: string
    refresh_token: string | null
    expires_at: string
  }
): Promise<TokenRefreshResult> {
  const expiresAt = new Date(integration.expires_at)
  const now = new Date()

  // Add 5 minute buffer to avoid race conditions
  const bufferMs = 5 * 60 * 1000
  const needsRefresh = expiresAt.getTime() - now.getTime() < bufferMs

  if (!needsRefresh) {
    console.log('[google-token-refresh] Token still valid, no refresh needed')
    return {
      accessToken: integration.access_token,
      refreshed: false,
    }
  }

  if (!integration.refresh_token) {
    console.error('[google-token-refresh] Token expired but no refresh token available')
    return {
      accessToken: integration.access_token,
      refreshed: false,
      error: 'Token expired and no refresh token available. Please reconnect Google Calendar.',
    }
  }

  console.log('[google-token-refresh] Token expired or expiring soon, refreshing...')

  try {
    // Refresh the token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[google-token-refresh] Token refresh failed:', errorText)
      throw new Error('Failed to refresh Google token')
    }

    const tokens = await tokenResponse.json()
    const newAccessToken = tokens.access_token

    // Calculate new expiration time
    const newExpiresAt = new Date()
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 3600))

    // Update stored token in database
    const { error: updateError } = await supabaseClient
      .from('user_integrations')
      .update({
        access_token: newAccessToken,
        expires_at: newExpiresAt.toISOString(),
        // Some token refreshes may return a new refresh token
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      })
      .eq('provider', 'google')

    if (updateError) {
      console.error('[google-token-refresh] Failed to update token in database:', updateError)
      // Continue anyway - we have the new token in memory
    } else {
      console.log('[google-token-refresh] ✅ Token refreshed successfully, expires at:', newExpiresAt.toISOString())
    }

    return {
      accessToken: newAccessToken,
      refreshed: true,
    }
  } catch (error) {
    console.error('[google-token-refresh] Error during token refresh:', error)
    return {
      accessToken: integration.access_token,
      refreshed: false,
      error: error.message || 'Token refresh failed',
    }
  }
}
