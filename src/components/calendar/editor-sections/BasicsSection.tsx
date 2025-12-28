"use client";

import { EventType } from "@/types/scheduling";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getBookingPathPrefix } from "@/lib/urls";

interface BasicsSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const BasicsSection = ({ data, onChange }: BasicsSectionProps) => {
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const bookingPrefix = getBookingPathPrefix();

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Event Name *</Label>
        <Input
          id="name"
          value={data.name || ""}
          onChange={(e) => {
            onChange({ 
              name: e.target.value,
              slug: data.slug || generateSlug(e.target.value)
            });
          }}
          placeholder="30 Minute Meeting"
        />
      </div>

      <div>
        <Label htmlFor="slug">Public URL Slug *</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground break-all">{bookingPrefix}</span>
          <Input
            id="slug"
            value={data.slug || ""}
            onChange={(e) => onChange({ slug: generateSlug(e.target.value) })}
            placeholder="30-minute-meeting"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This will be used in your booking URL
        </p>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Brief description of this event..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="duration">Duration (minutes) *</Label>
        <Select
          value={data.duration_minutes?.toString()}
          onValueChange={(value) => onChange({ duration_minutes: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">60 minutes</SelectItem>
            <SelectItem value="90">90 minutes</SelectItem>
            <SelectItem value="120">120 minutes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="color">Event Color</Label>
        <Input
          id="color"
          type="color"
          value={data.color || "#6366f1"}
          onChange={(e) => onChange({ color: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="active">Event Status</Label>
          <p className="text-xs text-muted-foreground">
            {data.is_active ? "Active - accepting bookings" : "Paused - not accepting bookings"}
          </p>
        </div>
        <Switch
          id="active"
          checked={data.is_active}
          onCheckedChange={(checked) => onChange({ is_active: checked })}
        />
      </div>
    </div>
  );
};
