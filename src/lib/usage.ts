import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company";

export type Usage = {
  companyId: string | null;
  bookingsTotal: number;
  activeEvents: number;
};

export async function getUsageCurrentCompany(): Promise<Usage> {
  const companyId = await getCompanyId({ allowFallback: false });
  if (!companyId) return { companyId: null, bookingsTotal: 0, activeEvents: 0 };

  const { count: bookingsTotal } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .neq('status', 'canceled'); // Exclude deleted/cancelled bookings from count

  const { count: activeEvents } = await supabase
    .from('event_types')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_archived', false);

  return {
    companyId,
    bookingsTotal: bookingsTotal || 0,
    activeEvents: activeEvents || 0,
  };
}
