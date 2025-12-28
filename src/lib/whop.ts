/**
 * Minimal Whop client helpers.
 * NOTE: Do not use these in the browser with WHOP_API_KEY. Keep server-only.
 */
export type StartTrialParams = {
  planId: string
  userEmail?: string | null
  companyExternalId: string
  trialDays?: number
}

/**
 * This module is intended for server-side only usage. On the client, call the
 * Supabase Edge Function `start-trial` instead.
 */
export async function startTrialServer(params: StartTrialParams & { apiKey: string }) {
  const { planId, userEmail, companyExternalId, trialDays = 7, apiKey } = params
  const res = await fetch('https://api.whop.com/api/v2/trials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      plan_id: planId,
      external_ref: companyExternalId,
      trial_days: trialDays,
      customer: userEmail ? { email: userEmail } : undefined,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Whop API error (${res.status}): ${text}`)
  }
  return res.json().catch(() => ({}))
}
