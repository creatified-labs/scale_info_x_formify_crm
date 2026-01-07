"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AvailabilitySchedule } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvailabilityScheduleSelectorProps {
  value?: string; // schedule_id
  onChange: (scheduleId: string | undefined) => void;
}

export const AvailabilityScheduleSelector = ({
  value,
  onChange,
}: AvailabilityScheduleSelectorProps) => {
  const [schedules, setSchedules] = useState<AvailabilitySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSchedules = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("availability_schedules")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      });
      console.error("Load schedules error:", error);
    } else {
      setSchedules(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const defaultSchedule = schedules.find((s) => s.is_default);
  const selectedSchedule = schedules.find((s) => s.id === value);

  return (
    <div className="space-y-2">
      <Select
        value={value || "default"}
        onValueChange={(val) => onChange(val === "default" ? undefined : val)}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select schedule..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">
            <div className="flex items-center gap-2">
              <span>Use Default Schedule</span>
              {defaultSchedule && (
                <span className="text-muted-foreground text-xs">
                  ({defaultSchedule.name})
                </span>
              )}
            </div>
          </SelectItem>
          {schedules.map((schedule) => (
            <SelectItem key={schedule.id} value={schedule.id}>
              <div className="flex items-center gap-2">
                <span>{schedule.name}</span>
                {schedule.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value
          ? `Using "${selectedSchedule?.name}" schedule`
          : `Using default schedule${defaultSchedule ? ` (${defaultSchedule.name})` : ""}`}
      </p>
    </div>
  );
};
