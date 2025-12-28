"use client";

import { Button } from "@/components/ui/button";
import { useUpgrade } from "@/lib/entitlements/client";
import { useEffect } from "react";
import { track } from "@/lib/track";
import { detectWhopContext } from "@/lib/embed";

export function PreviewBanner({ used, limit }: { used: number; limit: number; }) {
  const { startTrial } = useUpgrade();
  const nearingLimit = used >= 8 && used < limit;
  const isWhop = typeof window !== "undefined" && detectWhopContext();

  useEffect(() => {
    if (nearingLimit && !isWhop) {
      track("preview_banner_view");
    }
  }, [nearingLimit, isWhop]);

  if (!nearingLimit || isWhop) return null;

  return (
    <div className="p-3 border rounded-lg bg-amber-50 text-amber-900 flex items-center justify-between gap-3">
      <div className="text-sm">
        You’re close to the Preview limit — start your free Solo/Pro trial to keep accepting bookings.
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => { track("preview_banner_cta_click", { plan: "solo" }); startTrial('solo'); }}>Start Solo trial</Button>
        <Button size="sm" variant="secondary" onClick={() => { track("preview_banner_cta_click", { plan: "pro" }); startTrial('pro'); }}>Start Pro trial</Button>
      </div>
    </div>
  );
}
