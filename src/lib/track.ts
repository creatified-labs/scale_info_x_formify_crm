import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company";

export async function track(event: string, metadata: Record<string, any> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const company_id = await getCompanyId({ allowFallback: false });
    if (!company_id) return;
    await (supabase as any)
      .from("usage_events")
      .insert({ company_id, user_id: user.id, event, metadata });
  } catch {
    /* swallow analytics errors */
  }
}
