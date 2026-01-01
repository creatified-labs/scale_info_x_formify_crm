"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { EventAvailabilityRule } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/track";
import { Input } from "@/components/ui/input";

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface EventAvailabilityEditorProps {
  eventTypeId: string;
}

export const EventAvailabilityEditor = ({ eventTypeId }: EventAvailabilityEditorProps) => {
  const [rules, setRules] = useState<EventAvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_availability_rules")
      .select("*")
      .eq("event_type_id", eventTypeId)
      .order("weekday");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load event availability rules",
        variant: "destructive",
      });
    } else {
      setRules((data || []) as EventAvailabilityRule[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
  }, [eventTypeId]);

  const addRule = async (weekday: number) => {
    try {
      const newRules = [
        ...rules,
        { id: crypto.randomUUID(), event_type_id: eventTypeId, weekday, start_time: "09:00", end_time: "17:00", created_at: new Date().toISOString() } as any,
      ];
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upsert-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ event_type_id: eventTypeId, rules: newRules.map(r => ({ weekday: r.weekday, start_time: r.start_time, end_time: r.end_time })) })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 403) track('feature_blocked', { feature: 'upsert-availability', code: j?.code || 'FORBIDDEN' });
        throw new Error(j?.message || j?.error || 'Failed to save availability');
      }
      await updateUseCustomAvailability(token, newRules.length > 0);
      toast({ title: "Availability updated" });
      loadRules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const newRules = rules.filter(r => r.id !== id);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upsert-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ event_type_id: eventTypeId, rules: newRules.map(r => ({ weekday: r.weekday, start_time: r.start_time, end_time: r.end_time })) })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 403) track('feature_blocked', { feature: 'upsert-availability', code: j?.code || 'FORBIDDEN' });
        throw new Error(j?.message || j?.error || 'Failed to delete rule');
      }
      await updateUseCustomAvailability(token, newRules.length > 0);
      toast({ title: "Availability updated" });
      loadRules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateRule = async (id: string, field: string, value: string) => {
    try {
      const newRules = rules.map(r => r.id === id ? ({ ...r, [field]: value } as any) : r);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upsert-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ event_type_id: eventTypeId, rules: newRules.map(r => ({ weekday: r.weekday, start_time: r.start_time, end_time: r.end_time })) })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 403) track('feature_blocked', { feature: 'upsert-availability', code: j?.code || 'FORBIDDEN' });
        throw new Error(j?.message || j?.error || 'Failed to update rule');
      }
      await updateUseCustomAvailability(token, newRules.length > 0);
      toast({ title: "Availability updated" });
      loadRules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateUseCustomAvailability = async (token: string, enabled: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-event-type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: eventTypeId, use_custom_availability: enabled }),
      });
    } catch (err) {
      console.warn('Failed to toggle use_custom_availability', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Custom Availability for This Event</h3>
        <p className="text-sm text-muted-foreground">
          Set specific hours for this event type (overrides global availability)
        </p>
      </div>

      <div className="space-y-3">
        {WEEKDAYS.map((day, idx) => {
          const dayRules = rules.filter(r => r.weekday === idx);
          
          return (
            <Card key={idx} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{day}</h4>
                {dayRules.length === 0 ? (
                  <Badge variant="secondary">Unavailable</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addRule(idx)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Hours
                  </Button>
                )}
              </div>

              {dayRules.length === 0 ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => addRule(idx)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Set Available Hours
                </Button>
              ) : (
                <div className="space-y-2">
                  {dayRules.map((rule) => (
                    <div key={rule.id} className="flex items-center gap-3">
                      <Input
                        type="time"
                        value={rule.start_time}
                        onChange={(e) => updateRule(rule.id, 'start_time', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={rule.end_time}
                        onChange={(e) => updateRule(rule.id, 'end_time', e.target.value)}
                        className="w-32"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
