"use client";

import { EventType } from "@/types/scheduling";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sun, Moon, MonitorSmartphone } from "lucide-react";

interface AppearanceSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const AppearanceSection = ({ data, onChange }: AppearanceSectionProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Booking Page Theme</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose how your booking page appears to invitees
        </p>

        <RadioGroup
          value={data.theme_mode || 'auto'}
          onValueChange={(value) => onChange({ theme_mode: value as 'light' | 'dark' | 'auto' })}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="auto" id="auto" />
            <Label htmlFor="auto" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="w-5 h-5" />
                <div>
                  <p className="font-medium">Auto (Recommended)</p>
                  <p className="text-xs text-muted-foreground">
                    Matches visitor's system preference
                  </p>
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5" />
                <div>
                  <p className="font-medium">Light Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Always show booking page in light theme
                  </p>
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Always show booking page in dark theme
                  </p>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};
