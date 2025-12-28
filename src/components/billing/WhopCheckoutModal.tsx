"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
  title?: string;
};

export function WhopCheckoutModal({ open, onOpenChange, url, title }: Props) {
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      return () => {
        setLoaded(false);
      };
    }
    if (!url) return;
    timerRef.current = window.setTimeout(() => {
      if (!loaded) {
        window.open(url, "_blank", "noopener,noreferrer");
        onOpenChange(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [open, url, loaded, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl p-0 overflow-hidden bg-background border-border">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="text-sm font-medium text-foreground">{title || "Checkout"}</div>
        </div>
        <div className="relative h-[70vh] bg-muted flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Opening secure checkout…</div>
          {url && (
            <iframe
              src={url}
              className="absolute inset-0 w-full h-full border-0 opacity-0 pointer-events-none"
              onLoad={() => setLoaded(true)}
              allow="payment *; clipboard-write; fullscreen"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
