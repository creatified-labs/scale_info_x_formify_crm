/**
 * Whop SDK Integration - Server-side only
 * Implements authentication and authorization according to Whop documentation
 * @see https://docs.whop.com/developer/guides/authentication
 */

import { headers } from 'next/headers';

/**
 * Whop SDK client for server-side operations
 * Uses WHOP_API_KEY for app-level authentication
 */
class WhopSDK {
  private apiKey: string;
  private baseUrl = 'https://api.whop.com/api/v5';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.WHOP_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[WhopSDK] WHOP_API_KEY not configured');
    }
  }

  /**
   * Verify and decode the user token from request headers
   * This validates the x-whop-user-token header sent by Whop's iframe
   * @param headersList - Next.js headers() object
   * @returns User ID if valid, throws error if invalid
   */
  async verifyUserToken(
    headersList: Awaited<ReturnType<typeof headers>>,
    options?: { dontThrow?: boolean }
  ): Promise<{ userId: string | null }> {
    try {
      const userToken = headersList.get('x-whop-user-token');
      
      if (!userToken) {
        if (options?.dontThrow) {
          return { userId: null };
        }
        throw new Error('Missing x-whop-user-token header');
      }

      // Verify token by fetching user data
      const response = await fetch(`${this.baseUrl}/me/user`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (options?.dontThrow) {
          return { userId: null };
        }
        throw new Error('Invalid user token');
      }

      const userData = await response.json();
      return { userId: userData.id };
    } catch (error) {
      if (options?.dontThrow) {
        return { userId: null };
      }
      throw error;
    }
  }

  /**
   * Check if a user has access to a resource
   * @param resourceId - Company ID (biz_xxx), Product ID (prod_xxx), or Experience ID (exp_xxx)
   * @param userId - User ID to check access for
   * @returns Access information including has_access and access_level
   */
  async checkAccess(
    resourceId: string,
    userId: string
  ): Promise<{
    has_access: boolean;
    access_level: 'customer' | 'admin' | 'no_access';
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/apps/access?user_id=${userId}&resource_id=${resourceId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('[WhopSDK] Failed to check access:', response.status);
        return { has_access: false, access_level: 'no_access' };
      }

      return await response.json();
    } catch (error) {
      console.error('[WhopSDK] Error checking access:', error);
      return { has_access: false, access_level: 'no_access' };
    }
  }

  /**
   * Get user information
   * @param userToken - User's access token from x-whop-user-token header
   */
  async getUser(userToken: string) {
    try {
      const response = await fetch(`${this.baseUrl}/me/user`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[WhopSDK] Error fetching user:', error);
      return null;
    }
  }

  /**
   * Get user's memberships
   * @param userToken - User's access token from x-whop-user-token header
   */
  async getUserMemberships(userToken: string) {
    try {
      const response = await fetch(`${this.baseUrl}/me/memberships`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[WhopSDK] Error fetching memberships:', error);
      return null;
    }
  }

  /**
   * Start a trial for a user
   * @param params - Trial parameters
   */
  async startTrial(params: {
    planId: string
    userEmail?: string | null
    companyExternalId: string
    trialDays?: number
  }) {
    const { planId, userEmail, companyExternalId, trialDays = 7 } = params
    const res = await fetch('https://api.whop.com/api/v2/trials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
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

  /**
   * Send a push notification to Whop users
   * @param params - Notification parameters
   */
  async sendPushNotification(params: {
    userIds: string[]
    title: string
    content: string
    subtitle?: string
    restPath?: string
    link?: string
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error('[WhopSDK] Failed to send push notification:', response.status, errorText)
        return false
      }

      return true
    } catch (error) {
      console.error('[WhopSDK] Error sending push notification:', error)
      return false
    }
  }
}

// Export singleton instance
export const whopSDK = new WhopSDK();

// Export types
export type AccessLevel = 'customer' | 'admin' | 'no_access';
export type ResourceType = 'company' | 'product' | 'experience';

/**
 * Legacy export for backward compatibility
 * This module is intended for server-side only usage. On the client, call the
 * Supabase Edge Function `start-trial` instead.
 */
export async function startTrialServer(params: {
  planId: string
  userEmail?: string | null
  companyExternalId: string
  trialDays?: number
  apiKey: string
}) {
  return whopSDK.startTrial(params);
}
