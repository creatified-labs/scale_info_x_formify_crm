"use client";

import { useEffect, useState } from "react";

// Fixed deadline: January 16, 2026 at 3:00 PM UK time (GMT)
const DEADLINE = new Date('2026-01-16T15:00:00Z').getTime();

const formatRemaining = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
};

export const CountdownBanner = () => {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const tick = () => {
      setRemainingMs(Math.max(0, DEADLINE - Date.now()));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Don't show banner if deadline has passed
  if (remainingMs <= 0) {
    return null;
  }

  return (
    <div className="w-full border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6 sm:text-sm">
        <span className="font-medium">
          Please confirm payment with Creatified within 48 hours to keep tracking & converting.
        </span>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 font-mono text-[11px] sm:text-xs">
          {formatRemaining(remainingMs)}
        </span>
      </div>
    </div>
  );
};
