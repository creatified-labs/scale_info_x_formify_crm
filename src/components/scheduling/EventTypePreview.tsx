"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, Phone, MapPin, Link as LinkIcon } from "lucide-react";
import { CallType, InviteeQuestion } from "@/types/scheduling";

interface EventTypePreviewProps {
  name: string;
  description: string;
  duration: string;
  allowedCallTypes: CallType[];
  defaultCallType: CallType;
  phoneRequired: boolean;
  inPersonLocation: string;
  customLinkLabel: string;
  questions: InviteeQuestion[];
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
  questions,
}: EventTypePreviewProps) => {
  const getCallTypeIcon = (type: CallType) => {
    switch (type) {
      case 'zoom':
      case 'google_meet':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in_person':
        return <MapPin className="w-4 h-4" />;
      case 'custom':
        return <LinkIcon className="w-4 h-4" />;
    }
  };

  const getCallTypeLabel = (type: CallType) => {
    switch (type) {
      case 'zoom':
        return 'Zoom Meeting';
      case 'google_meet':
        return 'Google Meet';
      case 'phone':
        return 'Phone Call';
      case 'in_person':
        return 'In-Person Meeting';
      case 'custom':
        return customLinkLabel || 'Custom Link';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b">
        <h2 className="text-2xl font-bold mb-2">{name || "Event Name"}</h2>
        <div className="flex items-center justify-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{duration || "30"} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Select date & time</span>
          </div>
        </div>
        {description && (
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Call Type Selector */}
          {allowedCallTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Call Type</Label>
              <Select value={defaultCallType} disabled>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {getCallTypeIcon(defaultCallType)}
                      <span>{getCallTypeLabel(defaultCallType)}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allowedCallTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {getCallTypeIcon(type)}
                        <span>{getCallTypeLabel(type)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Location info for in-person */}
          {defaultCallType === 'in_person' && inPersonLocation && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <div className="font-medium">Location</div>
                  <div className="text-muted-foreground">{inPersonLocation}</div>
                </div>
              </div>
            </div>
          )}

          {/* Required fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preview-name">Name *</Label>
              <Input id="preview-name" placeholder="Your name" disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preview-email">Email *</Label>
              <Input id="preview-email" type="email" placeholder="you@example.com" disabled />
            </div>

            {/* Phone if required */}
            {phoneRequired && defaultCallType === 'phone' && (
              <div className="space-y-2">
                <Label htmlFor="preview-phone">Phone Number *</Label>
                <Input id="preview-phone" type="tel" placeholder="+1 (555) 000-0000" disabled />
              </div>
            )}
          </div>

          {/* Custom Questions */}
          {questions.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              {questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label>
                    {question.label}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {question.type === 'short_text' && (
                    <Input placeholder={question.placeholder} disabled />
                  )}
                  {question.type === 'long_text' && (
                    <Textarea placeholder={question.placeholder} rows={3} disabled />
                  )}
                  {question.type === 'email' && (
                    <Input type="email" placeholder={question.placeholder} disabled />
                  )}
                  {question.type === 'phone' && (
                    <Input type="tel" placeholder={question.placeholder} disabled />
                  )}
                  {question.type === 'dropdown' && (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {question.options?.map((opt, idx) => (
                          <SelectItem key={idx} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {question.type === 'checkbox' && (
                    <div className="space-y-2">
                      {question.options?.map((opt, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Checkbox id={`preview-${question.id}-${idx}`} disabled />
                          <label htmlFor={`preview-${question.id}-${idx}`} className="text-sm">
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {question.type === 'multi_select' && (
                    <div className="space-y-2">
                      {question.options?.map((opt, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Checkbox id={`preview-${question.id}-${idx}`} disabled />
                          <label htmlFor={`preview-${question.id}-${idx}`} className="text-sm">
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button className="w-full" size="lg" disabled>
            Schedule Event
          </Button>
        </div>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        This is a preview of how your booking page will appear to invitees
      </p>
    </div>
  );
};
