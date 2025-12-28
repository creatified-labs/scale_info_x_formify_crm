/**
 * Whop API utilities for server-side requests
 * Uses the app's API key for authenticated requests
 */

/**
 * Get current user data from Whop using their user token
 * This should be called with the user's access token from OAuth or JWT
 */
export async function getWhopUser(userToken: string) {
  try {
    const response = await fetch("https://api.whop.com/api/v5/me/user", {
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch Whop user:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Whop user:", error);
    return null;
  }
}

/**
 * Get user's memberships from Whop
 */
export async function getWhopUserMemberships(userToken: string) {
  try {
    const response = await fetch("https://api.whop.com/api/v5/me/memberships", {
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch Whop memberships:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Whop memberships:", error);
    return null;
  }
}

/**
 * Check if user has access to a specific resource
 */
export async function checkWhopAccess(userId: string, resourceId: string) {
  try {
    const response = await fetch(
      `https://api.whop.com/api/v5/apps/access?user_id=${userId}&resource_id=${resourceId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to check Whop access:", response.status);
      return { has_access: false, access_level: null };
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking Whop access:", error);
    return { has_access: false, access_level: null };
  }
}

/**
 * Verify and decode the Whop user token from headers
 * The token is passed in the x-whop-user-token header
 */
export function extractWhopUserToken(headers: Headers): string | null {
  return headers.get("x-whop-user-token") || null;
}
