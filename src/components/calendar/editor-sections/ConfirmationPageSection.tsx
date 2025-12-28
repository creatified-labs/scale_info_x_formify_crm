"use client";

import { useState } from "react";
import { EventType } from "@/types/scheduling";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ConfirmationPageSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const ConfirmationPageSection = ({ data, onChange }: ConfirmationPageSectionProps) => {
  const [confirmationType, setConfirmationType] = useState(data.redirect_url ? "redirect" : "page");

  return (
    <div className="space-y-6">
      <div>
        <Label>After Booking</Label>
        <RadioGroup
          value={confirmationType}
          onValueChange={(value) => {
            setConfirmationType(value);
            if (value === "page") {
              onChange({ redirect_url: undefined });
            }
          }}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="page" id="page" />
            <label htmlFor="page" className="text-sm">Show confirmation page</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="redirect" id="redirect" />
            <label htmlFor="redirect" className="text-sm">Redirect to URL</label>
          </div>
        </RadioGroup>
      </div>

      {confirmationType === "redirect" && (
        <div>
          <Label htmlFor="redirect-url">Redirect URL</Label>
          <Input
            id="redirect-url"
            type="url"
            value={data.redirect_url || ""}
            onChange={(e) => onChange({ redirect_url: e.target.value })}
            placeholder="https://example.com/thank-you"
          />
        </div>
      )}

      {confirmationType === "page" && (
        <div>
          <Label htmlFor="success-message">Custom Success Message</Label>
          <Textarea
            id="success-message"
            placeholder="Thank you for booking! We look forward to meeting with you."
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-1">
            This message will be shown on the confirmation page
          </p>
        </div>
      )}

      <div>
        <Label>Add to Calendar</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Invitees can add this event to their calendar
        </p>
        <div className="flex gap-2">
          <div className="px-3 py-2 bg-muted rounded text-sm">Google Calendar</div>
          <div className="px-3 py-2 bg-muted rounded text-sm">Outlook</div>
          <div className="px-3 py-2 bg-muted rounded text-sm">Apple Calendar</div>
        </div>
      </div>
    </div>
  );
};
