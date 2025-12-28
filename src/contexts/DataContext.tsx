"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { RevenueEntry, Goal } from "@/types/revenue";
import { Call } from "@/types/calls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCompanyId } from "@/lib/company";
import { track } from "@/lib/track";
import { callStatusToBookingStatus } from "@/lib/status";
import { Button } from "@/components/ui/button";

type DbRevenueRow = {
  id: string;
  entry_date: string;
  amount: number;
  description?: string | null;
  category?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

type DbGoalRow = {
  id: string;
  goal_type: Goal["goalType"];
  period_type: Goal["type"];
  target_amount: number;
  period_key?: string | null;
  deadline?: string | null;
  description?: string | null;
  category?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  category_type?: Goal["categoryType"] | null;
  created_at: string;
};

type DbCallRow = {
  id: string;
  company_id: string;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  call_type: Call["callType"];
  call_date: string;
  call_time?: string | null;
  duration_minutes?: number | null;
  status: Call["status"];
  is_converted?: boolean | null;
  conversion_amount?: number | null;
  notes?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  join_url?: string | null;
  booking_id?: string | null;
};

type LocalRevenuePayload = Omit<RevenueEntry, "createdAt"> & { createdAt: string };
type LocalGoalPayload = Omit<Goal, "createdAt"> & { createdAt: string };
type LocalCallPayload = Omit<Call, "createdAt"> & { createdAt: string };

interface DataContextType {
  revenueEntries: RevenueEntry[];
  goals: Goal[];
  calls: Call[];
  loading: boolean;
  addRevenueEntry: (entry: Omit<RevenueEntry, 'id' | 'createdAt'>) => Promise<void>;
  updateRevenueEntry: (entry: RevenueEntry) => Promise<void>;
  deleteRevenueEntry: (entryId: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addCall: (call: Omit<Call, 'id' | 'createdAt'>) => Promise<void>;
  updateCall: (call: Call) => Promise<void>;
  deleteCall: (callId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const sb = supabase as any;

  const showAuthRequiredToast = (
    title: string,
    description?: string,
    opts?: { id?: string }
  ) => {
    const toastId = opts?.id ?? "auth-required";
    toast.dismiss(toastId);
    toast.custom(
      (id) => (
        <div className="w-[320px] rounded-lg border bg-background p-4 shadow-lg">
          <div className="space-y-3">
            <div className="text-sm font-medium">{title}</div>
            {description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{description}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.dismiss(id)}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.dismiss(id);
                  if (typeof window !== "undefined") {
                    const target = `${window.location.origin}/signup`;
                    window.location.assign(target);
                  }
                }}
              >
                Create account
              </Button>
            </div>
          </div>
        </div>
      ),
      { id: toastId, duration: Infinity }
    );
  };

  // Edge function helper
  const callFunction = async (name: string, method: 'POST' | 'GET', payload?: any, query?: Record<string, string>) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`;
    const url = query ? `${base}?${new URLSearchParams(query).toString()}` : base;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      if (res.status === 403 && (j?.code === 'PLAN_UPGRADE_REQUIRED' || String(j?.code || '').includes('PREVIEW'))) {
        toast.error(j?.message || 'Upgrade required to use this feature');
        track('feature_blocked', { feature: name, code: j?.code || 'FORBIDDEN' });
      } else {
        toast.error(j?.error || 'Request failed');
      }
      throw new Error(j?.error || `Function ${name} failed`);
    }
    return res.json().catch(() => ({}));
  };

  const mapRevenueFromDb = (row: DbRevenueRow): RevenueEntry => ({
    id: row.id,
    date: row.entry_date,
    amount: Number(row.amount),
    description: row.description || undefined,
    category: row.category || undefined,
    categoryName: row.category_name || undefined,
    categoryColor: row.category_color || undefined,
    createdAt: new Date(row.created_at),
    metadata: row.metadata || undefined,
  });

  const mapGoalFromDb = (row: DbGoalRow): Goal => ({
    id: row.id,
    goalType: row.goal_type,
    type: row.period_type,
    targetAmount: Number(row.target_amount),
    period: row.period_key || undefined,
    deadline: row.deadline || undefined,
    description: row.description || undefined,
    category: row.category || undefined,
    categoryName: row.category_name || undefined,
    categoryColor: row.category_color || undefined,
    categoryType: row.category_type || undefined,
    createdAt: new Date(row.created_at),
  });

  const mapCallFromDb = (row: DbCallRow): Call => ({
    id: row.id,
    clientName: row.client_name,
    email: row.client_email || undefined,
    phone: row.client_phone || undefined,
    callType: row.call_type,
    date: row.call_date,
    time: row.call_time || "",
    duration: row.duration_minutes ?? 30,
    status: row.status,
    isConverted: row.is_converted ?? undefined,
    conversionAmount: row.conversion_amount ?? undefined,
    notes: row.notes || undefined,
    createdAt: new Date(row.created_at),
    joinUrl: row.join_url || undefined,
    bookingId: row.booking_id || undefined,
  });

  // Fetch all data via RLS tables
  const fetchData = useCallback(async () => {
    const background = hydrated;
    try {
      if (!background) {
        setLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRevenueEntries([]);
        setGoals([]);
        setCalls([]);
        return;
      }

      const companyId = await getCompanyId({ allowFallback: false });
      if (!companyId) {
        setRevenueEntries([]);
        setGoals([]);
        setCalls([]);
        return;
      }

      const [revenueRes, goalsRes, callsRes] = await Promise.all([
        sb
          .from("revenue_entries")
          .select("*")
          .eq("company_id", companyId)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false }),
        sb
          .from("sales_goals")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
        sb
          .from("call_logs")
          .select("*")
          .eq("company_id", companyId)
          .order("call_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (callsRes.error) throw callsRes.error;

      setRevenueEntries((revenueRes.data ?? []).map((row: any) => mapRevenueFromDb(row as DbRevenueRow)));
      setGoals((goalsRes.data ?? []).map((row: any) => mapGoalFromDb(row as DbGoalRow)));
      setCalls((callsRes.data ?? []).map((row: any) => mapCallFromDb(row as DbCallRow)));
    } catch (error: any) {
      console.error('Error loading data:', error);
      setRevenueEntries([]);
      setGoals([]);
      setCalls([]);
    } finally {
      if (!background) {
        setLoading(false);
      }
      if (!hydrated) {
        setHydrated(true);
      }
    }
  }, [hydrated, sb]);

  const syncBookingToCalls = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Load data on mount and set up periodic refresh + storage event listener
  useEffect(() => {
    void fetchData();

    const handleStorageChange = () => {
      void fetchData();
    };
    const handleManualRefresh = () => {
      void fetchData();
    };

    const handleBookingsRefresh = () => {
      void fetchData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('call-tracker-refresh', handleManualRefresh as EventListener);
    window.addEventListener('bookings-refresh', handleBookingsRefresh as EventListener);

    const interval = setInterval(() => {
      void fetchData();
    }, 30000);

    const channel = sb
      .channel('bookings-calls-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        () => {
          void syncBookingToCalls();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('call-tracker-refresh', handleManualRefresh as EventListener);
      window.removeEventListener('bookings-refresh', handleBookingsRefresh as EventListener);
      clearInterval(interval);
      sb.removeChannel(channel);
    };
  }, [fetchData, sb, syncBookingToCalls]);

  const addRevenueEntry = async (entry: Omit<RevenueEntry, 'id' | 'createdAt'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAuthRequiredToast("Sign in required", "Sign back in to add revenue entries.");
        return;
      }
      const companyId = await getCompanyId({ allowFallback: false });
      if (!companyId) {
        showAuthRequiredToast(
          "We couldn’t find your company",
          "Sign back in so we can refresh your workspace access.",
          { id: "missing-company" }
        );
        return;
      }

      const insertPayload = {
        company_id: companyId,
        entry_date: entry.date,
        amount: entry.amount,
        description: entry.description ?? null,
        category: entry.category ?? null,
        category_name: entry.categoryName ?? null,
        category_color: entry.categoryColor ?? null,
        metadata: entry.metadata ?? null,
      };

      const { data, error } = await sb
        .from('revenue_entries')
        .insert(insertPayload)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setRevenueEntries([mapRevenueFromDb(data as DbRevenueRow), ...revenueEntries]);
      }
      toast.success('Revenue entry added');
    } catch (error: any) {
      console.error('Error adding revenue entry:', error);
      toast.error(error.message || 'Failed to add revenue entry');
    }
  };

  const updateRevenueEntry = async (entry: RevenueEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAuthRequiredToast("Sign in required", "Sign back in to update revenue entries.");
        return;
      }

      const updatePayload = {
        entry_date: entry.date,
        amount: entry.amount,
        description: entry.description ?? null,
        category: entry.category ?? null,
        category_name: entry.categoryName ?? null,
        category_color: entry.categoryColor ?? null,
        metadata: entry.metadata ?? null,
      };

      const { error } = await sb
        .from('revenue_entries')
        .update(updatePayload)
        .eq('id', entry.id);
      if (error) throw error;

      setRevenueEntries(revenueEntries.map((e) => (e.id === entry.id ? entry : e)));
      toast.success('Revenue entry updated');
    } catch (error: any) {
      console.error('Error updating revenue entry:', error);
      toast.error(error.message || 'Failed to update revenue entry');
    }
  };

  const deleteRevenueEntry = async (entryId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAuthRequiredToast("Sign in required", "Sign back in to delete revenue entries.");
        return;
      }

      const { error } = await sb
        .from('revenue_entries')
        .delete()
        .eq('id', entryId);
      if (error) throw error;

      setRevenueEntries(revenueEntries.filter((e) => e.id !== entryId));
      toast.success('Revenue entry deleted');
    } catch (error: any) {
      console.error('Error deleting revenue entry:', error);
      toast.error(error.message || 'Failed to delete revenue entry');
    }
  };

  const addGoal = async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    try {
      const companyId = await getCompanyId({ allowFallback: false });
      if (!companyId) {
        showAuthRequiredToast(
          "We couldn’t find your company",
          "Sign back in so we can refresh your workspace access.",
          { id: "missing-company" }
        );
        return;
      }

      const payload = {
        action: 'create',
        payload: {
          company_id: companyId,
          title: goal.description || goal.categoryName || 'Goal',
          target_amount: goal.targetAmount,
          period_key: goal.period ?? null,
          deadline: goal.deadline ?? null,
          description: goal.description ?? null,
          category: goal.category ?? null,
          category_name: goal.categoryName ?? null,
          category_color: goal.categoryColor ?? null,
          category_type: goal.categoryType ?? null,
        }
      };
      const created = await callFunction('goals-write', 'POST', payload);
      setGoals([mapGoalFromDb(created as DbGoalRow), ...goals]);
      toast.success('Goal created');
    } catch (error: any) {
      console.error('Error adding goal:', error);
      toast.error(error.message || 'Failed to create goal');
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await callFunction('goals-write', 'POST', { action: 'delete', payload: { id: goalId } });

      setGoals(goals.filter((g) => g.id !== goalId));
      toast.success('Goal deleted');
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      toast.error(error.message || 'Failed to delete goal');
    }
  };

  const addCall = async (call: Omit<Call, 'id' | 'createdAt'>) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        // Public booking flow is unauthenticated; skip creating the internal call log without showing a toast.
        return;
      }

      const companyId = await getCompanyId({ allowFallback: false });
      if (!companyId) {
        showAuthRequiredToast(
          "We couldn’t find your company",
          "Sign back in so we can refresh your workspace access.",
          { id: "missing-company" }
        );
        return;
      }

      const insertPayload = {
        company_id: companyId,
        client_name: call.clientName,
        client_email: call.email ?? null,
        client_phone: call.phone ?? null,
        call_type: call.callType,
        call_date: call.date,
        call_time: call.time || null,
        duration_minutes: call.duration ?? 30,
        status: call.status,
        is_converted: call.isConverted ?? false,
        conversion_amount: call.conversionAmount ?? null,
        notes: call.notes ?? null,
        booking_id: call.bookingId ?? null,
        join_url: call.joinUrl ?? null,
      };

      const { data, error } = await sb
        .from('call_logs')
        .insert(insertPayload)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setCalls([mapCallFromDb(data as DbCallRow), ...calls]);
      }
      if (!call.bookingId) {
        toast.success('Call added');
      }
    } catch (error: any) {
      console.error('Error adding call:', error);
      toast.error(error.message || 'Failed to add call');
    }
  };

  const updateCall = async (call: Call) => {
    try {
      const updatePayload = {
        client_name: call.clientName,
        client_email: call.email ?? null,
        client_phone: call.phone ?? null,
        call_type: call.callType,
        call_date: call.date,
        call_time: call.time || null,
        duration_minutes: call.duration ?? 30,
        status: call.status,
        is_converted: call.isConverted ?? false,
        conversion_amount: call.conversionAmount ?? null,
        notes: call.notes ?? null,
        booking_id: call.bookingId ?? null,
        join_url: call.joinUrl ?? null,
      };

      const { error } = await sb
        .from('call_logs')
        .update(updatePayload)
        .eq('id', call.id);
      if (error) throw error;

      setCalls(calls.map((c) => (c.id === call.id ? call : c)));
      if (call.bookingId) {
        const syncTasks: Promise<unknown>[] = [];

        const bookingStatus = call.status ? callStatusToBookingStatus(call.status) : undefined;
        const startDate = new Date(`${call.date}T${call.time || '00:00'}`);
        const hasValidStart = !Number.isNaN(startDate.getTime());
        const endDate = hasValidStart ? new Date(startDate.getTime() + (call.duration ?? 30) * 60000) : null;

        const bookingUpdatePayload: Record<string, unknown> = {
          booking_id: call.bookingId,
        };

        if (call.clientName) bookingUpdatePayload.invitee_name = call.clientName;
        if (call.email) bookingUpdatePayload.invitee_email = call.email;
        if (call.phone !== undefined) bookingUpdatePayload.invitee_phone = call.phone || null;
        if (call.callType) bookingUpdatePayload.chosen_call_type = call.callType;
        if (hasValidStart) {
          bookingUpdatePayload.start_time = startDate.toISOString();
          if (endDate) {
            bookingUpdatePayload.end_time = endDate.toISOString();
          }
        }
        if (bookingStatus) bookingUpdatePayload.status = bookingStatus;
        bookingUpdatePayload.notes = call.notes ?? null;
        bookingUpdatePayload.video_join_url = call.joinUrl ?? null;

        syncTasks.push(
          callFunction('update-booking', 'POST', bookingUpdatePayload).catch((err) =>
            console.error('Error syncing booking details:', err)
          )
        );

        if (call.isConverted !== undefined) {
          syncTasks.push(
            callFunction('convert-booking', 'POST', {
              booking_id: call.bookingId,
              is_converted: call.isConverted,
              conversion_amount: call.isConverted ? (call.conversionAmount ?? 0) : null,
            }).catch((err) => console.error('Error syncing booking conversion:', err))
          );
        }

        if (syncTasks.length) {
          await Promise.allSettled(syncTasks);
        }

        window.dispatchEvent(new Event('bookings-refresh'));
      }

      if (call.isConverted && call.conversionAmount) {
        const existingRevenue = revenueEntries.find((e) => e.metadata?.callId === call.id);
        if (existingRevenue) {
          await updateRevenueEntry({
            ...existingRevenue,
            date: call.date,
            amount: call.conversionAmount,
            description: `Conversion from ${call.callType}: ${call.clientName}`,
          });
        } else {
          await addRevenueEntry({
            date: call.date,
            amount: call.conversionAmount,
            description: `Conversion from ${call.callType}: ${call.clientName}`,
            category: 'calls',
            categoryName: 'Calls',
            categoryColor: 'hsl(142, 76%, 36%)',
            metadata: { callId: call.id },
          });
        }
      } else {
        const revenueEntry = revenueEntries.find((e) => e.metadata?.callId === call.id);
        if (revenueEntry) {
          await deleteRevenueEntry(revenueEntry.id);
        }
      }

      toast.success('Call updated');
    } catch (error: any) {
      console.error('Error updating call:', error);
      toast.error(error.message || 'Failed to update call');
    }
  };

  const deleteCall = async (callId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAuthRequiredToast("Sign in required", "Sign back in to manage calls.");
        return;
      }

      const target = calls.find((c) => c.id === callId);

      const { error } = await sb
        .from('call_logs')
        .delete()
        .eq('id', callId);
      if (error) throw error;

      const revenueEntry = revenueEntries.find((e) => e.metadata?.callId === callId);
      if (revenueEntry) {
        await deleteRevenueEntry(revenueEntry.id);
      }

      setCalls(calls.filter((c) => c.id !== callId));

      if (target?.bookingId) {
        try {
          await callFunction('delete-booking', 'POST', { booking_id: target.bookingId });
          window.dispatchEvent(new Event('bookings-refresh'));
        } catch (bookingErr) {
          console.error('Error deleting linked booking:', bookingErr);
        }
      }

      toast.success('Call deleted');
    } catch (error: any) {
      console.error('Error deleting call:', error);
      toast.error(error.message || 'Failed to delete call');
    }
  };

  const value = {
    revenueEntries,
    goals,
    calls,
    loading,
    addRevenueEntry,
    updateRevenueEntry,
    deleteRevenueEntry,
    addGoal,
    deleteGoal,
    addCall,
    updateCall,
    deleteCall,
    refetch: fetchData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}