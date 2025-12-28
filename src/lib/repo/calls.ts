import { supabase } from "@/integrations/supabase/client";

export interface CallInput {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'no-show' | 'cancelled' | "hasn't paid yet";
  notes?: string;
  channel?: string;
  conversionAmount?: number;
  conversionCurrency?: string;
}

export interface CallUpdate {
  id: string;
  status?: 'scheduled' | 'completed' | 'no-show' | 'cancelled' | "hasn't paid yet";
  conversionAmount?: number;
  conversionCurrency?: string;
  notes?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  date?: string;
  time?: string;
  duration?: number;
}

export interface CallFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  assignee?: string;
  source?: string;
}

/**
 * List calls for the current tenant with optional filters
 */
export async function listCalls(filters?: CallFilters) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('calls')
    .select('*')
    .eq('tenant_id', user.id)
    .order('start_utc', { ascending: false });

  if (filters?.dateFrom) {
    query = query.gte('start_utc', `${filters.dateFrom}T00:00:00Z`);
  }
  if (filters?.dateTo) {
    query = query.lte('start_utc', `${filters.dateTo}T23:59:59Z`);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.assignee) {
    query = query.eq('assignee_user_id', filters.assignee);
  }
  if (filters?.source) {
    query = query.eq('source', filters.source);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

/**
 * Get a single call by ID
 */
export async function getCall(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new call
 */
export async function createCall(input: CallInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const startDateTime = new Date(`${input.date}T${input.time}`);
  const endDateTime = new Date(startDateTime.getTime() + input.duration * 60000);

  const { data, error } = await supabase
    .from('calls')
    .insert({
      tenant_id: user.id,
      source: 'manual',
      client_name: input.clientName,
      client_email: input.clientEmail || null,
      client_phone: input.clientPhone || null,
      start_utc: startDateTime.toISOString(),
      end_utc: endDateTime.toISOString(),
      status: input.status,
      conversion_amount: input.conversionAmount || 0,
      conversion_currency: input.conversionCurrency || 'GBP',
      notes: input.notes || null,
      channel: input.channel || 'manual',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing call
 */
export async function updateCall(update: CallUpdate) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updateData: any = {};

  if (update.status !== undefined) updateData.status = update.status;
  if (update.conversionAmount !== undefined) updateData.conversion_amount = update.conversionAmount;
  if (update.conversionCurrency !== undefined) updateData.conversion_currency = update.conversionCurrency;
  if (update.notes !== undefined) updateData.notes = update.notes;
  if (update.clientName !== undefined) updateData.client_name = update.clientName;
  if (update.clientEmail !== undefined) updateData.client_email = update.clientEmail;
  if (update.clientPhone !== undefined) updateData.client_phone = update.clientPhone;

  if (update.date !== undefined && update.time !== undefined && update.duration !== undefined) {
    const startDateTime = new Date(`${update.date}T${update.time}`);
    const endDateTime = new Date(startDateTime.getTime() + update.duration * 60000);
    updateData.start_utc = startDateTime.toISOString();
    updateData.end_utc = endDateTime.toISOString();
  }

  const { data, error } = await supabase
    .from('calls')
    .update(updateData)
    .eq('id', update.id)
    .eq('tenant_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update only the status of a call
 */
export async function updateCallStatus(id: string, status: 'scheduled' | 'completed' | 'no-show' | 'cancelled' | "hasn't paid yet") {
  return updateCall({ id, status });
}

/**
 * Set conversion amount for a call
 */
export async function setConversion(id: string, amountMinor: number, currency: string = 'GBP') {
  return updateCall({ id, conversionAmount: amountMinor, conversionCurrency: currency });
}

/**
 * Delete a call
 */
export async function deleteCall(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('calls')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.id);

  if (error) throw error;
}
