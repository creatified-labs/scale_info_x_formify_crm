"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, PoundSterling } from "lucide-react";
import { RevenueEntry } from "@/types/revenue";
import { useData } from "@/contexts/DataContext";
import { useCurrency } from "@/hooks/useCurrency";

interface EntriesListProps {
  entries: RevenueEntry[];
  onDeleteEntry?: (entryId: string) => void;
}

const SOURCE_BADGES = {
  booking: { label: "Booking Conversion", color: "bg-blue-500/15 text-blue-400" },
  manual: { label: "Manual Entry", color: "bg-emerald-500/15 text-emerald-400" },
  call: { label: "Call Tracker", color: "bg-purple-500/15 text-purple-400" },
} as const;
type EntrySource = keyof typeof SOURCE_BADGES;

const getEntrySource = (entry: RevenueEntry): EntrySource => {
  const metadataSource = (entry.metadata as { source?: string } | undefined)?.source;
  if (metadataSource && metadataSource in SOURCE_BADGES) {
    return metadataSource as EntrySource;
  }
  if (entry.id.startsWith("booking-")) {
    return "booking";
  }
  return "manual";
};

export const EntriesList = ({ entries, onDeleteEntry }: EntriesListProps) => {
  const { categories, goals } = useData();
  const { symbol: currencySymbol } = useCurrency();

  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (entries.length === 0) {
    return (
      <Card className="card-smooth">
        <CardContent className="py-8 text-center content-spacing">
          <PoundSterling className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No entries yet</h3>
          <p className="text-muted-foreground text-responsive">Your entries will appear here once you add some revenue.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-smooth">
      <CardHeader className="content-spacing">
        <CardTitle className="flex items-center gap-2 text-responsive">
          <Calendar className="w-6 h-6 flex-shrink-0" />
          Entries ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="text-lg font-semibold text-foreground">
                      {currencySymbol}{entry.amount.toLocaleString()}
                    </div>
                    {entry.categoryName && (
                      <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: `${entry.categoryColor}20`, color: entry.categoryColor }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.categoryColor }} />
                        {entry.categoryName}
                      </span>
                    )}
                    {entry.eventTypeName && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        📅 {entry.eventTypeName}
                      </span>
                    )}
                    {entry.bookingId && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                        🎯 From Booking
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(() => {
                        const sourceKey = getEntrySource(entry);
                        const badge = SOURCE_BADGES[sourceKey];
                        return (
                          <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mt-2 italic">{entry.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};