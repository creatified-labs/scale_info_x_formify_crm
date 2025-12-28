"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Video, Phone, MapPin, Link as LinkIcon } from "lucide-react";
import { CallType } from "@/types/scheduling";

interface CallTypeSelectorProps {
  allowedTypes: CallType[];
  selectedType: CallType;
  onTypeChange: (type: CallType) => void;
  onPhoneChange?: (phone: string) => void;
  phoneValue?: string;
  phoneRequired?: boolean;
  inPersonLocation?: string;
  customLinkUrl?: string;
  customLinkLabel?: string;
}

export const CallTypeSelector = ({
  allowedTypes,
  selectedType,
  onTypeChange,
  onPhoneChange,
  phoneValue = "",
  phoneRequired = false,
  inPersonLocation,
  customLinkUrl,
  customLinkLabel,
}: CallTypeSelectorProps) => {
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
        return 'Zoom';
      case 'google_meet':
        return 'Google Meet';
      case 'phone':
        return 'Phone Call';
      case 'in_person':
        return 'In Person';
      case 'custom':
        return customLinkLabel || 'Custom Link';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="call-type">
          How would you like to meet? <span className="text-destructive">*</span>
        </Label>
        <Select value={selectedType} onValueChange={(value) => onTypeChange(value as CallType)}>
          <SelectTrigger id="call-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedTypes.map((type) => (
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

      {selectedType === 'phone' && onPhoneChange && (
        <div>
          <Label htmlFor="phone">
            Phone Number {phoneRequired && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phoneValue}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+1 (555) 000-0000"
            required={phoneRequired}
          />
        </div>
      )}

      {selectedType === 'in_person' && inPersonLocation && (
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Meeting Location</p>
              <p className="text-sm text-muted-foreground">{inPersonLocation}</p>
            </div>
          </div>
        </div>
      )}

      {selectedType === 'custom' && customLinkUrl && (
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-start gap-2">
            <LinkIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{customLinkLabel || 'Custom Link'}</p>
              <a 
                href={customLinkUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {customLinkUrl}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
