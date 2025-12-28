"use client";

import { EventType, CallType } from "@/types/scheduling";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Video, Phone, MapPin, Link } from "lucide-react";

interface CallTypesSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const CallTypesSection = ({ data, onChange }: CallTypesSectionProps) => {
  const callTypes: { value: CallType; label: string; icon: any }[] = [
    { value: "google_meet", label: "Google Meet", icon: Video },
    { value: "zoom", label: "Zoom", icon: Video },
    { value: "phone", label: "Phone Call", icon: Phone },
    { value: "in_person", label: "In-Person", icon: MapPin },
    { value: "custom", label: "Custom Link", icon: Link },
  ];

  const allowedTypes = data.allowed_call_types || ["google_meet"];

  const toggleCallType = (type: CallType) => {
    const newTypes = allowedTypes.includes(type)
      ? allowedTypes.filter(t => t !== type)
      : [...allowedTypes, type];
    
    onChange({ 
      allowed_call_types: newTypes,
      default_call_type: newTypes.includes(data.default_call_type || "google_meet")
        ? data.default_call_type
        : newTypes[0]
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Allowed Call Types</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Select which call types invitees can choose from
        </p>
        <div className="space-y-3">
          {callTypes.map(({ value, label, icon: Icon }) => (
            <div key={value} className="flex items-center space-x-3">
              <Checkbox
                id={value}
                checked={allowedTypes.includes(value)}
                onCheckedChange={() => toggleCallType(value)}
              />
              <label
                htmlFor={value}
                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <Icon className="w-4 h-4" />
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Default Call Type</Label>
        <Select
          value={data.default_call_type || "google_meet"}
          onValueChange={(value) => onChange({ default_call_type: value as CallType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedTypes.map(type => {
              const callType = callTypes.find(ct => ct.value === type);
              return (
                <SelectItem key={type} value={type}>
                  {callType?.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {allowedTypes.includes("phone") && (
        <div className="flex items-center justify-between">
          <div>
            <Label>Require Phone Number</Label>
            <p className="text-xs text-muted-foreground">
              Ask for invitee's phone number when phone call is selected
            </p>
          </div>
          <Switch
            checked={data.phone_required_for_phone_type}
            onCheckedChange={(checked) => onChange({ phone_required_for_phone_type: checked })}
          />
        </div>
      )}

      {allowedTypes.includes("in_person") && (
        <div>
          <Label htmlFor="location">In-Person Location</Label>
          <Input
            id="location"
            value={data.inperson_location || ""}
            onChange={(e) => onChange({ inperson_location: e.target.value })}
            placeholder="123 Main St, City, State"
          />
        </div>
      )}

      {allowedTypes.includes("custom") && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="custom-label">Custom Link Label</Label>
            <Input
              id="custom-label"
              value={data.custom_link_label || ""}
              onChange={(e) => onChange({ custom_link_label: e.target.value })}
              placeholder="Join Meeting"
            />
          </div>
          <div>
            <Label htmlFor="custom-url">Custom Link URL</Label>
            <Input
              id="custom-url"
              value={data.custom_link_url || ""}
              onChange={(e) => onChange({ custom_link_url: e.target.value })}
              placeholder="https://example.com/meeting"
            />
          </div>
        </div>
      )}
    </div>
  );
};
