"use client";

import { ExternalLink } from "lucide-react";

export const PoweredByBadge = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg text-xs text-muted-foreground"
      >
        <span>Powered by</span>
        <span className="font-semibold text-foreground">FormifyCRM</span>
        <ExternalLink className="w-3 h-3" />
      </div>
    </div>
  );
};
