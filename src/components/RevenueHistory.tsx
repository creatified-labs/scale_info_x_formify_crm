"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Calendar, PoundSterling } from "lucide-react";
import { RevenueEntry } from "@/types/revenue";
import { useData } from "@/contexts/DataContext";

interface EntriesListProps {
  entries: RevenueEntry[];
  onUpdateEntry: (entry: RevenueEntry) => void;
  onDeleteEntry: (entryId: string) => void;
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

export const EntriesList = ({ entries, onUpdateEntry, onDeleteEntry }: EntriesListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RevenueEntry>>({});
  const { categories, goals } = useData();
  
  const revenueGoals = goals.filter(g => g.goalType === 'revenue');

  const handleEdit = (entry: RevenueEntry) => {
    setEditingId(entry.id);
    setEditForm({
      date: entry.date,
      amount: entry.amount,
      description: entry.description || "",
      category: entry.category || "",
      goalId: entry.goalId || "",
    });
  };

  const handleSave = () => {
    if (editingId && editForm.date && editForm.amount) {
      const originalEntry = entries.find(e => e.id === editingId);
      if (originalEntry) {
        const selectedCategory = categories.find(cat => cat.id === editForm.category);
        const updatedEntry: RevenueEntry = {
          ...originalEntry,
          date: editForm.date,
          amount: editForm.amount,
          description: editForm.description?.trim() || undefined,
          category: editForm.category?.trim() || undefined,
          categoryName: selectedCategory?.name,
          categoryColor: selectedCategory?.color,
          goalId: editForm.goalId?.trim() || undefined,
        };
        onUpdateEntry(updatedEntry);
      }
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

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
              {editingId === entry.id ? (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-responsive">Amount (£)</Label>
                      <Input
                        value={entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        disabled
                        className="w-full bg-muted text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        Amounts can only be changed from the Call Tracker or when adding the entry.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-responsive">Entry Date</Label>
                        <Input
                          value={new Date(entry.date).toISOString().split("T")[0]}
                          disabled
                          className="w-full bg-muted text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground">
                          Dates are locked to when the revenue was recorded.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-responsive">Source</Label>
                        <Input
                          value={SOURCE_BADGES[getEntrySource(entry)].label}
                          disabled
                          className="w-full bg-muted text-muted-foreground"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-category-${entry.id}`} className="text-responsive">Category</Label>
                    <Select 
                      value={editForm.category || ""} 
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-goal-${entry.id}`} className="text-responsive">Link to Goal (optional)</Label>
                    <Select 
                      value={editForm.goalId || ""} 
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, goalId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No goal linked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No goal</SelectItem>
                        {revenueGoals.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            {goal.description || `${goal.type} goal - £${goal.targetAmount.toLocaleString()}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-description-${entry.id}`}>Description</Label>
                    <Textarea
                      id={`edit-description-${entry.id}`}
                      placeholder="Add notes..."
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} className="button-smooth">Save</Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="button-smooth">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-lg font-semibold text-foreground">
                        £{entry.amount.toLocaleString()}
                      </div>
                      {entry.categoryName && (
                        <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: `${entry.categoryColor}20`, color: entry.categoryColor }}>
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.categoryColor }} />
                          {entry.categoryName}
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
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(entry)}
                      className="text-primary hover:text-primary button-smooth"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive button-smooth"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};