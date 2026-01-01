"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { addMinutes, format } from "date-fns";
import { CalendarIcon, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/track";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { differenceInMinutes, isBefore, isSameDay, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface TimeBlock {
  id: string;
  owner_user_id: string;
  scope: 'global_for_host' | 'event_only';
  event_type_id?: string;
  date: string;
  start_minutes: number;
  end_minutes: number;
  note?: string;
  tz_at_create: string;
  created_at: string;
}

interface TimeRange {
  start: string;
  end: string;
}

interface TimeBlocksEditorProps {
  userId: string;
  scope: 'global_for_host' | 'event_only';
  eventTypeId?: string;
}

export const TimeBlocksEditor = ({ userId, scope, eventTypeId }: TimeBlocksEditorProps) => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([{ start: "09:00", end: "17:00" }]);
  const [note, setNote] = useState("");

  useEffect(() => {
    loadBlocks();
  }, [userId, scope, eventTypeId]);

  const loadBlocks = async () => {
    try {
      let query = supabase
        .from('time_blocks')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('scope', scope)
        .order('date', { ascending: true });

      if (scope === 'event_only' && eventTypeId) {
        query = query.eq('event_type_id', eventTypeId);
      } else if (scope === 'global_for_host') {
        query = query.is('event_type_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBlocks((data || []) as TimeBlock[]);
    } catch (error: any) {
      toast({
        title: "Error loading time blocks",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTimeRange = () => {
    setTimeRanges([...timeRanges, { start: "09:00", end: "17:00" }]);
  };

  const removeTimeRange = (index: number) => {
    setTimeRanges(timeRanges.filter((_, i) => i !== index));
  };

  const updateTimeRange = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...timeRanges];
    updated[index][field] = value;
    setTimeRanges(updated);
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const validateTimeRanges = (): boolean => {
    for (const range of timeRanges) {
      const start = timeToMinutes(range.start);
      const end = timeToMinutes(range.end);
      
      if (start >= end) {
        toast({
          title: "Invalid time range",
          description: "End time must be after start time",
          variant: "destructive",
        });
        return false;
      }

      if (start < 0 || start >= 1440 || end <= 0 || end > 1440) {
        toast({
          title: "Invalid time range",
          description: "Times must be between 00:00 and 24:00",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const saveTimeBlocks = async () => {
    if (!selectedDate) {
      toast({
        title: "Select a date",
        description: "Please select a date for the time block",
        variant: "destructive",
      });
      return;
    }

    if (!validateTimeRanges()) {
      return;
    }

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const blocksPayload = timeRanges.map(r => ({
        date: dateStr,
        start_time: r.start,
        end_time: r.end,
        reason: note || undefined,
        tz_at_create: timezone,
        scope,
        event_type_id: scope === 'event_only' ? eventTypeId ?? null : null,
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upsert-time-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({
          scope,
          event_type_id: scope === 'event_only' ? eventTypeId ?? null : null,
          blocks: blocksPayload,
        })
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        if (res.status === 403) track('feature_blocked', { feature: 'upsert-time-blocks', code: j?.code || 'FORBIDDEN' });
        throw new Error(j.error || 'Failed to save time blocks');
      }

      toast({
        title: "Time blocks saved",
        description: `Blocked ${timeRanges.length} time range(s) on ${format(selectedDate, 'PPP')}`,
      });

      // Reset form
      setSelectedDate(undefined);
      setTimeRanges([{ start: "09:00", end: "17:00" }]);
      setNote("");
      await loadBlocks();
    } catch (error: any) {
      toast({
        title: "Error saving time blocks",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteBlock = async (id: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      if (scope === 'event_only' && eventTypeId) {
        // Rebuild blocks minus the deleted one and upsert
        const remaining = blocks.filter(b => b.id !== id)
          .map(b => ({ date: format(new Date(b.date), 'yyyy-MM-dd'), start_time: minutesToTime(b.start_minutes), end_time: minutesToTime(b.end_minutes), reason: b.note }))
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upsert-time-blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ event_type_id: eventTypeId, blocks: remaining })
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as any));
          if (res.status === 403) track('feature_blocked', { feature: 'upsert-time-blocks', code: j?.code || 'FORBIDDEN' });
          throw new Error(j.error || 'Failed to delete time block');
        }
      } else {
        // Keep existing delete endpoint for global scope for now
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-time-block`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
          body: JSON.stringify({ id })
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as any));
          throw new Error(j.error || 'Failed to delete time block');
        }
      }

      toast({
        title: "Time block deleted",
      });

      loadBlocks();
    } catch (error: any) {
      toast({
        title: "Error deleting time block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading time blocks...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Time Block</CardTitle>
          <CardDescription>
            Block specific time ranges on a date. These times will not be available for booking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
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
                  {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Time Ranges</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTimeRange}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Range
              </Button>
            </div>

            {timeRanges.map((range, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="time"
                    value={range.start}
                    onChange={(e) => updateTimeRange(index, 'start', e.target.value)}
                  />
                </div>
                <span className="text-muted-foreground">to</span>
                <div className="flex-1">
                  <Input
                    type="time"
                    value={range.end}
                    onChange={(e) => updateTimeRange(index, 'end', e.target.value)}
                  />
                </div>
                {timeRanges.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimeRange(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Reason for blocking this time..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          <Button onClick={saveTimeBlocks} className="w-full">
            Save Time Block{timeRanges.length > 1 ? 's' : ''}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Time Blocks</CardTitle>
          <CardDescription>
            {scope === 'global_for_host' 
              ? 'These blocks apply to all your event types'
              : 'These blocks only apply to this event type'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No time blocks configured
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time Range</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell>{format(new Date(block.date), 'PPP')}</TableCell>
                    <TableCell>
                      {minutesToTime(block.start_minutes)} - {minutesToTime(block.end_minutes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {block.note || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
