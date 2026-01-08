"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateSelector } from "@/components/ui/date-selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Trash2, X, Clock } from "lucide-react";
import { track } from "@/lib/track";

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
  const [saving, setSaving] = useState(false);

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

    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const blocksPayload = timeRanges.map(r => ({
        date: dateStr,
        start_time: r.start,
        end_time: r.end,
        reason: note || undefined,
        tz_at_create: timezone,
        scope,
        event_type_id: scope === 'event_only' ? eventTypeId ?? null : null,
      }));

      const res = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'upsert-time-blocks',
          payload: {
            scope,
            event_type_id: scope === 'event_only' ? eventTypeId ?? null : null,
            blocks: blocksPayload,
            user_id: userId,
          },
          method: 'POST',
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) track('feature_blocked', { feature: 'upsert-time-blocks', code: data?.code || 'FORBIDDEN' });
        throw new Error(data.error || 'Failed to save time blocks');
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
    } finally {
      setSaving(false);
    }
  };

  const deleteBlock = async (id: string) => {
    try {
      if (scope === 'event_only' && eventTypeId) {
        // Rebuild blocks minus the deleted one and upsert
        const remaining = blocks.filter(b => b.id !== id)
          .map(b => ({
            date: format(new Date(b.date), 'yyyy-MM-dd'),
            start_time: minutesToTime(b.start_minutes),
            end_time: minutesToTime(b.end_minutes),
            reason: b.note
          }));

        const res = await fetch('/api/edge-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            functionName: 'upsert-time-blocks',
            payload: {
              scope,
              event_type_id: eventTypeId,
              blocks: remaining,
              user_id: userId,
            },
            method: 'POST',
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 403) track('feature_blocked', { feature: 'upsert-time-blocks', code: data?.code || 'FORBIDDEN' });
          throw new Error(data.error || 'Failed to delete time block');
        }
      } else {
        // Use edge proxy for global scope delete
        const res = await fetch('/api/edge-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            functionName: 'delete-time-block',
            payload: {
              id,
              user_id: userId,
            },
            method: 'POST',
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete time block');
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading time blocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Time Block Card */}
      <Card className="border-muted">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Add Time Block
          </CardTitle>
          <CardDescription>
            Block specific time ranges on a date. These times will not be available for booking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date</Label>
              <DateSelector
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                placeholder="Select a date"
              />
            </div>

            {/* Time Ranges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Time Ranges</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTimeRange}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Range
                </Button>
              </div>

              <div className="space-y-3">
                {timeRanges.map((range, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input
                      type="time"
                      value={range.start}
                      onChange={(e) => updateTimeRange(index, 'start', e.target.value)}
                      className="flex-1 h-11"
                    />
                    <span className="text-sm text-muted-foreground font-medium">to</span>
                    <Input
                      type="time"
                      value={range.end}
                      onChange={(e) => updateTimeRange(index, 'end', e.target.value)}
                      className="flex-1 h-11"
                    />
                    {timeRanges.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTimeRange(index)}
                        className="h-11 w-11 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-medium">
                Note <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="note"
                placeholder="Reason for blocking this time..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <Button
            onClick={saveTimeBlocks}
            className="w-full h-11"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>Save Time Block{timeRanges.length > 1 ? 's' : ''}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Time Blocks Card */}
      <Card className="border-muted">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Existing Time Blocks</CardTitle>
          <CardDescription>
            {scope === 'global_for_host'
              ? 'These blocks apply to all your event types'
              : 'These blocks only apply to this event type'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">No time blocks configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a time block above to block out availability
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Time Range</TableHead>
                    <TableHead className="font-semibold">Note</TableHead>
                    <TableHead className="w-[100px] text-center font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block) => (
                    <TableRow key={block.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {format(new Date(block.date), 'PPP')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{minutesToTime(block.start_minutes)}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-medium">{minutesToTime(block.end_minutes)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                        {block.note || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBlock(block.id)}
                          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
