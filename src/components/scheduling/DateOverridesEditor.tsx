"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, CalendarIcon, Plus } from "lucide-react";
import { AvailabilityOverride } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateOverridesEditorProps {
  eventTypeId?: string;
}

export const DateOverridesEditor = ({ eventTypeId }: DateOverridesEditorProps) => {
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isAvailable, setIsAvailable] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const { toast } = useToast();

  const loadOverrides = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("availability_overrides")
      .select("*")
      .eq("user_id", user.id)
      .order("date");

    if (eventTypeId) {
      query = query.eq("event_type_id", eventTypeId);
    } else {
      query = query.is("event_type_id", null);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load date overrides",
        variant: "destructive",
      });
    } else {
      setOverrides((data || []) as AvailabilityOverride[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOverrides();
  }, [eventTypeId]);

  const addOverride = async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const override: any = {
      user_id: user.id,
      date: format(selectedDate, "yyyy-MM-dd"),
      is_available: isAvailable,
    };

    if (isAvailable) {
      override.start_time = startTime;
      override.end_time = endTime;
    }

    if (eventTypeId) {
      override.event_type_id = eventTypeId;
    }

    const { error } = await supabase
      .from("availability_overrides")
      .insert(override);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add date override",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Date override added",
      });
      setSelectedDate(undefined);
      setIsAvailable(false);
      loadOverrides();
    }
  };

  const deleteOverride = async (id: string) => {
    const { error } = await supabase
      .from("availability_overrides")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete override",
        variant: "destructive",
      });
    } else {
      loadOverrides();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading date overrides...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Date Overrides</h2>
        <p className="text-sm text-muted-foreground">
          Block off dates when you're on holiday or set custom hours for specific days
        </p>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label>Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-available">Available on this date</Label>
            <Switch
              id="is-available"
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
            />
          </div>

          {isAvailable && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button onClick={addOverride} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Override
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        <h3 className="font-semibold">Existing Overrides</h3>
        {overrides.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              No date overrides set
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {overrides.map((override) => (
              <Card key={override.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{format(new Date(override.date), "PPP")}</p>
                    {override.is_available ? (
                      <p className="text-sm text-muted-foreground">
                        Available: {override.start_time} - {override.end_time}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unavailable (Holiday/Blocked)</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteOverride(override.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
