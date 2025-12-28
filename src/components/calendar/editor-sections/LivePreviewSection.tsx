"use client";

import { useState } from "react";
import { EventType } from "@/types/scheduling";
import { Button } from "@/components/ui/button";
import { Smartphone, Tablet, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildBookingPath } from "@/lib/urls";

interface LivePreviewSectionProps {
  data: Partial<EventType>;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const LivePreviewSection = ({ data }: LivePreviewSectionProps) => {
  const [device, setDevice] = useState<DeviceType>('desktop');

  const getPreviewUrl = () => {
    if (!data.slug) return '';
    return buildBookingPath(data.slug);
  };

  const getDeviceDimensions = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] h-[667px]';
      case 'tablet':
        return 'w-[768px] h-[1024px]';
      case 'desktop':
        return 'w-full h-[800px]';
    }
  };

  const getThemeClass = () => {
    const themeMode = data.theme_mode || 'auto';
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'light') return '';
    return ''; // Auto uses system default
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Live Preview</h3>
          <p className="text-sm text-muted-foreground">
            See how your booking page looks across different devices
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={device === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDevice('mobile')}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
          <Button
            variant={device === 'tablet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDevice('tablet')}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={device === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDevice('desktop')}
          >
            <Monitor className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!data.slug ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            Save your event type first to see the live preview
          </p>
        </div>
      ) : (
        <div className="flex justify-center">
          <div
            className={cn(
              "border rounded-lg overflow-hidden shadow-lg transition-all mx-auto bg-background",
              getDeviceDimensions(),
              device !== 'desktop' && 'max-w-full'
            )}
          >
            <iframe
              src={getPreviewUrl()}
              className={cn("w-full h-full", getThemeClass())}
              title="Booking Page Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
};
