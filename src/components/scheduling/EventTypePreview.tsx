"use client";

import { Card } from "@/components/ui/card";
import { CallType, InviteeQuestion, EventType } from "@/types/scheduling";
import { EmbedOption1 } from "@/components/embed/EmbedOption1";
import { EmbedOption2 } from "@/components/embed/EmbedOption2";
import { EmbedOption3 } from "@/components/embed/EmbedOption3";
import { useMemo } from "react";

interface EventTypePreviewProps {
  name: string;
  description: string;
  duration: string;
  allowedCallTypes: CallType[];
  defaultCallType: CallType;
  phoneRequired: boolean;
  inPersonLocation: string;
  customLinkLabel: string;
  customLinkUrl?: string;
  questions: InviteeQuestion[];
  preferredViewStyle?: 'classic' | 'wizard' | 'progressive';
}

export const EventTypePreview = ({
  name,
  description,
  duration,
  allowedCallTypes,
  defaultCallType,
  phoneRequired,
  inPersonLocation,
  customLinkLabel,
  customLinkUrl,
  questions,
  preferredViewStyle = 'classic',
}: EventTypePreviewProps) => {
  // Create a mock EventType object for the preview
  const mockEventType = useMemo((): EventType & { branding_hide_badge?: boolean; user_timezone?: string } => ({
    id: 'preview-event',
    user_id: 'preview-user',
    name: name || 'Event Name',
    slug: 'preview-slug',
    description: description || '',
    duration_minutes: parseInt(duration) || 30,
    location_type: defaultCallType,
    location_details: {},
    is_active: true,
    buffer_before: 0,
    buffer_after: 0,
    min_notice_hours: 24,
    time_increment: 15,
    is_secret: false,
    form_fields: [],
    timezone_mode: 'auto',
    capacity: 1,
    color: '#000000',
    allowed_call_types: allowedCallTypes.length > 0 ? allowedCallTypes : [defaultCallType],
    default_call_type: defaultCallType,
    invitee_form_schema: questions,
    notifications: {
      email: { enabled: true, confirmation: true, reminders: [], followup: 0 },
      sms: { enabled: false, confirmation: false, reminders: [], followup: 0 },
    },
    templates: {
      email: {
        confirmation: { subject: '', body: '' },
        reminder: { subject: '', body: '' },
        followup: { subject: '', body: '' },
      },
      sms: { confirmation: '', reminder: '', followup: '' },
    },
    phone_required_for_phone_type: phoneRequired,
    inperson_location: inPersonLocation,
    custom_link_label: customLinkLabel,
    custom_link_url: customLinkUrl,
    branding_hide_badge: true,
    user_timezone: 'UTC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }), [name, description, duration, allowedCallTypes, defaultCallType, phoneRequired, inPersonLocation, customLinkLabel, customLinkUrl, questions]);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-muted/30">
        <p className="text-sm text-center text-muted-foreground">
          Live preview of your booking page in <span className="font-semibold">{preferredViewStyle === 'classic' ? 'Classic' : preferredViewStyle === 'wizard' ? 'Wizard' : 'Progressive'}</span> view
        </p>
      </Card>
      
      <div className="border rounded-lg overflow-hidden">
        {preferredViewStyle === 'classic' && <EmbedOption1 eventType={mockEventType} />}
        {preferredViewStyle === 'wizard' && <EmbedOption2 eventType={mockEventType} />}
        {preferredViewStyle === 'progressive' && <EmbedOption3 eventType={mockEventType} />}
      </div>
    </div>
  );
};
