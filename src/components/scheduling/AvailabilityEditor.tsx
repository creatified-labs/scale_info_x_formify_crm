"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { AvailabilityRule } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLocalMode } from "@/lib/localMode";
import { readLocal, writeLocal } from "@/lib/localStore";
import { AvailabilitySchedulesManager } from "./AvailabilitySchedulesManager";


const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const AvailabilityEditor = () => {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const { toast } = useToast();
  const localMode = isLocalMode();

  const LOCAL_KEYS = {
    rules: "local.availability.rules",
    overrides: "local.availability.overrides",
    anonUserId: "anon_user_id",
  } as const;

  const loadLocalRules = (): AvailabilityRule[] => {
    return readLocal<AvailabilityRule[]>(LOCAL_KEYS.rules, []);
  };

  const persistLocalRules = (rulesToPersist: AvailabilityRule[]) => {
    writeLocal(LOCAL_KEYS.rules, rulesToPersist);
  };

  const loadLocalOverrides = (): any[] => {
    return readLocal<any[]>(LOCAL_KEYS.overrides, []);
  };

  const persistLocalOverrides = (overrides: any[]) => {
    writeLocal(LOCAL_KEYS.overrides, overrides);
  };

  const getEffectiveUserId = async (): Promise<string> => {
    if (!localMode) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user.id;
    }
    let anon = readLocal<string | null>(LOCAL_KEYS.anonUserId, null);
    if (!anon) {
      anon = crypto.randomUUID();
      writeLocal(LOCAL_KEYS.anonUserId, anon);
    }
    return anon;
  };

  const loadRules = async () => {
    setLoading(true);
    if (localMode) {
      setRules(loadLocalRules());
      setLoading(false);
      return;
    }

    if (!selectedScheduleId) {
      setRules([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("availability_rules")
      .select("*")
      .eq("schedule_id", selectedScheduleId)
      .order("weekday");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load availability rules",
        variant: "destructive",
      });
    } else {
      setRules((data || []) as AvailabilityRule[]);
    }
    setLoading(false);
  };

  const loadBlockedDates = async () => {
    if (localMode) {
      setBlockedDates(loadLocalOverrides());
      return;
    }

    if (!selectedScheduleId) {
      setBlockedDates([]);
      return;
    }

    const { data, error } = await supabase
      .from("availability_overrides")
      .select("*")
      .eq("schedule_id", selectedScheduleId)
      .eq("is_available", false);

    if (!error && data) {
      setBlockedDates(data);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRules();
    loadBlockedDates();
  }, [selectedScheduleId]);
  const addRule = async (weekday: number) => {
    if (localMode) {
      const localRules = loadLocalRules();
      const newRule: AvailabilityRule = {
        id: crypto.randomUUID(),
        schedule_id: "local",
        user_id: "local",
        weekday,
        start_time: "09:00",
        end_time: "17:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        created_at: new Date().toISOString(),
      } as AvailabilityRule;
      const updated = [...localRules, newRule];
      persistLocalRules(updated);
      setRules(updated);
      toast({ title: "Availability added", description: `${WEEKDAYS[weekday]} hours created (local)` });
      return;
    }

    if (!selectedScheduleId) return;

    const userId = await getEffectiveUserId();

    const { error } = await supabase
      .from("availability_rules")
      .insert({
        schedule_id: selectedScheduleId,
        user_id: userId,
        weekday,
        start_time: "09:00",
        end_time: "17:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add rule",
        variant: "destructive",
      });
    } else {
      toast({ title: "Availability added", description: `${WEEKDAYS[weekday]} hours created` });
      // Optimistically add the new rule to state instead of reloading
      const { data: newRule } = await supabase
        .from("availability_rules")
        .select("*")
        .eq("schedule_id", selectedScheduleId)
        .eq("weekday", weekday)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (newRule) {
        setRules(prev => [...prev, newRule as AvailabilityRule]);
      }
    }
  };

  const deleteRule = async (id: string) => {
    if (localMode) {
      const updated = loadLocalRules().filter((rule) => rule.id !== id);
      persistLocalRules(updated);
      setRules(updated);
      toast({ title: "Availability removed", description: "Rule deleted (local)" });
      return;
    }

    const { error } = await supabase
      .from("availability_rules")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      });
    } else {
      // Optimistically remove from state instead of reloading
      setRules(prev => prev.filter(rule => rule.id !== id));
    }
  };

  const handleLocalRuleChange = (id: string, field: string, value: string) => {
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)));
  };

  const updateRule = async (id: string) => {
    const targetRule = rules.find((rule) => rule.id === id);
    if (!targetRule) return;

    if (localMode) {
      const updated = loadLocalRules().map((rule) =>
        rule.id === id ? { ...rule, start_time: targetRule.start_time, end_time: targetRule.end_time } : rule
      );
      persistLocalRules(updated);
      toast({ title: "Availability updated", description: "Rule modified (local)" });
      return;
    }

    const { error } = await supabase
      .from("availability_rules")
      .update({ start_time: targetRule.start_time, end_time: targetRule.end_time })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive",
      });
    } else {
      toast({ title: "Availability updated", description: "Rule modified" });
    }
  };

  const blockDate = async () => {
    if (!selectedDate) return;

    if (localMode) {
      const overrides = loadLocalOverrides();
      const newOverride = {
        id: crypto.randomUUID(),
        schedule_id: "local",
        user_id: "local",
        date: format(selectedDate, "yyyy-MM-dd"),
        is_available: false,
      };
      const updated = [...overrides, newOverride];
      persistLocalOverrides(updated);
      setBlockedDates(updated);
      toast({ title: "Date blocked", description: `${format(selectedDate, "PPP")}` });
      setSelectedDate(undefined);
      return;
    }

    if (!selectedScheduleId) return;

    const userId = await getEffectiveUserId();
    const { error } = await supabase
      .from("availability_overrides")
      .insert({
        schedule_id: selectedScheduleId,
        user_id: userId,
        date: format(selectedDate, "yyyy-MM-dd"),
        is_available: false,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to block date",
        variant: "destructive",
      });
    } else {
      toast({ title: "Date blocked", description: format(selectedDate, "PPP") });
      setSelectedDate(undefined);
      loadBlockedDates();
    }
  };

  const unblockDate = async (id: string) => {
    if (localMode) {
      const updated = loadLocalOverrides().filter((override) => override.id !== id);
      persistLocalOverrides(updated);
      setBlockedDates(updated);
      toast({ title: "Date unblocked", description: "Date removed (local)" });
      return;
    }

    const { error } = await supabase
      .from("availability_overrides")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unblock date",
        variant: "destructive",
      });
    } else {
      toast({ title: "Date unblocked" });
      loadBlockedDates();
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
    <div className="space-y-8">
      {!localMode ? (
        <AvailabilitySchedulesManager
          onSelectSchedule={setSelectedScheduleId}
          selectedScheduleId={selectedScheduleId || undefined}
          rules={rules}
          onAddRule={addRule}
          onUpdateRule={updateRule}
          onDeleteRule={deleteRule}
          onRuleChange={handleLocalRuleChange}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Availability Rules</h2>
            <p className="text-sm text-muted-foreground">
              Set weekly hours for your schedule
            </p>
          </div>

          <div className="space-y-3">
            {WEEKDAYS.map((day, idx) => {
              const dayRules = rules.filter(r => r.weekday === idx);
              
              return (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{day}</h3>
                    {dayRules.length === 0 ? (
                      <Badge variant="secondary">Unavailable</Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium gap-1 flex items-center">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                        Hours active
                      </Badge>
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
                            onChange={(e) => handleLocalRuleChange(rule.id, 'start_time', e.target.value)}
                            onBlur={() => updateRule(rule.id)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={rule.end_time}
                            onChange={(e) => handleLocalRuleChange(rule.id, 'end_time', e.target.value)}
                            onBlur={() => updateRule(rule.id)}
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
      )}
    </div>
  );
};
