// src/bootstrap/wap.ts
import { supabase } from "@/integrations/supabase/client";

export async function ensureSupabaseSessionFromWhop(opts: {
  whopOrgId: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  profilePicture?: string | null;
  userId?: string | null;
}) {
  console.log("ensureSupabaseSessionFromWhop entered", opts);

  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const normalizedOrgId = opts.whopOrgId.trim();
  const normalizedEmail = (opts.email ?? "")
    .toString()
    .trim()
    .toLowerCase();
  const fallbackEmail = `${normalizedOrgId || crypto.randomUUID()}@noemail.formifycrm.com`;
  const loginEmail = normalizedEmail.length > 0 ? normalizedEmail : fallbackEmail;
  const displayName = (opts.name ?? opts.username ?? "")?.toString().trim() || null;

  // Call the Edge Function
  const sess = (await supabase.auth.getSession()).data.session;
  const userJwt = sess?.access_token;

  console.log("wap-bootstrap base URL", base);
  console.log("wap-bootstrap anon prefix", (anon as string)?.slice(0, 8));
  console.log("wap-bootstrap payload", {
    whop_org_id: normalizedOrgId,
    email: loginEmail,
    name: displayName,
  });

  const res = await fetch(`${base}/functions/v1/wap-bootstrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon as string,
      Authorization: `Bearer ${userJwt || (anon as string)}`,
    },
    body: JSON.stringify({
      whop_org_id: normalizedOrgId,
      email: loginEmail,
      name: displayName,
    }),
  });
  const j = await res.json();

  if (!res.ok) {
    const detail = j?.detail || j?.message;
    throw new Error(j?.error ? `${j.error}${detail ? `: ${detail}` : ""}` : "Bootstrap failed");
  }

  if (!j.token_hash && !j.action_link) throw new Error("Missing token information from bootstrap");

  try {
    console.log("bootstrap payload", {
      email_from_function: j?.email,
      company_id: j?.company_id,
      raw: j,
    });
  } catch {}

  // Debug: confirm runtime config matches expected project
  try {
    console.log("SUPABASE_BASE_URL", base);
    console.log("SUPABASE_ANON_PREFIX", (anon as string)?.slice(0, 8));
  } catch {}

  const emailForVerify = (j.email as string | undefined)?.toLowerCase() ?? loginEmail;

  let verified = false;
  try {
    if (j.email_otp && emailForVerify) {
      const { error } = await supabase.auth.verifyOtp({
        type: "email",
        token: j.email_otp as string,
        email: emailForVerify,
      });
      if (!error) verified = true;
    }

    if (!verified) {
      if (j.action_link) {
        const actionUrl = new URL(j.action_link as string);
        const authCode = actionUrl.searchParams.get("code");
        if (authCode) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(authCode);
          if (!exchangeErr) {
            verified = true;
          } else {
            console.warn("exchangeCodeForSession failed, falling back to token verify", exchangeErr);
          }
        }

        if (!verified) {
          const token =
            actionUrl.searchParams.get("token_hash") ||
            actionUrl.searchParams.get("token") ||
            (j.token_hash as string | undefined);
          await supabase.auth.verifyOtp({
            type: "magiclink",
            token_hash: token ?? (j.token_hash as string),
            email: emailForVerify,
          });
          verified = true;
        }
      } else {
        await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: j.token_hash as string,
          email: emailForVerify,
        });
        verified = true;
      }
    }
  } catch (e) {
    try {
      console.error("verifyOtp failed", e);
    } catch {}
    if (!verified && j.email_otp && emailForVerify) {
      await supabase.auth.verifyOtp({
        type: "email",
        token: j.email_otp as string,
        email: emailForVerify,
      });
      verified = true;
    } else if (!verified) {
      throw e;
    }
  }

  await supabase.auth.refreshSession();

  let retries = 4;
  let user = (await supabase.auth.getUser()).data.user;
  while (retries-- > 0 && !user?.user_metadata?.company_id) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await supabase.auth.refreshSession();
    user = (await supabase.auth.getUser()).data.user;
  }
  if (!user?.user_metadata?.company_id) {
    throw new Error("Missing company_id after bootstrap");
  }

  return {
    ok: true,
    company_id: user.user_metadata.company_id as string,
    email: j.email ?? loginEmail,
  };
}
