"use client";

import { EventType } from "@/types/scheduling";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { EventAvailabilityEditor } from "@/components/scheduling/EventAvailabilityEditor";
import { DateOverridesEditor } from "@/components/scheduling/DateOverridesEditor";
import { Separator } from "@/components/ui/separator";

interface EventTimesSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const EventTimesSection = ({ data, onChange }: EventTimesSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Use Custom Availability</Label>
            <p className="text-sm text-muted-foreground">
              Set specific hours for this event type
            </p>
          </div>
          <Switch
            checked={data.use_custom_availability || false}
            onCheckedChange={(checked) => onChange({ use_custom_availability: checked })}
          />
        </div>

        {!data.use_custom_availability ? (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              This event uses your global availability settings
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/scheduling?tab=availability" target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />
                Edit Global Availability
              </Link>
            </Button>
          </div>
        ) : (
          data.id && <EventAvailabilityEditor eventTypeId={data.id} />
        )}
      </div>

      <Separator />

      <div>
        <Label htmlFor="buffer-before">Buffer Before (minutes)</Label>
        <Input
          id="buffer-before"
          type="number"
          min="0"
          value={data.buffer_before || 0}
          onChange={(e) => onChange({ buffer_before: parseInt(e.target.value) || 0 })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Time to prepare before the event
        </p>
      </div>

      <div>
        <Label htmlFor="buffer-after">Buffer After (minutes)</Label>
        <Input
          id="buffer-after"
          type="number"
          min="0"
          value={data.buffer_after || 0}
          onChange={(e) => onChange({ buffer_after: parseInt(e.target.value) || 0 })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Time to wrap up after the event
        </p>
      </div>

      <div>
        <Label htmlFor="min-notice">Minimum Notice (hours)</Label>
        <Input
          id="min-notice"
          type="number"
          min="0"
          value={data.min_notice_hours || 24}
          onChange={(e) => onChange({ min_notice_hours: parseInt(e.target.value) || 24 })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          How far in advance must invitees book
        </p>
      </div>

      <div>
        <Label htmlFor="max-bookings">Max Bookings Per Day</Label>
        <Input
          id="max-bookings"
          type="number"
          min="1"
          value={data.max_bookings_per_day || ""}
          onChange={(e) => onChange({ max_bookings_per_day: e.target.value ? parseInt(e.target.value) : undefined })}
          placeholder="Unlimited"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leave empty for unlimited
        </p>
      </div>

      <div>
        <Label htmlFor="time-increment">Time Slot Increments</Label>
        <Select
          value={data.time_increment?.toString() || "15"}
          onValueChange={(value) => onChange({ time_increment: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">60 minutes</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          How often time slots should be available
        </p>
      </div>

      {data.id && (
        <>
          <Separator />
          <DateOverridesEditor eventTypeId={data.id} />
        </>
      )}
    </div>
  );
};
