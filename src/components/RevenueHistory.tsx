"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, Calendar, PoundSterling, Tag } from "lucide-react";
import { RevenueEntry } from "@/types/revenue";

interface RevenueHistoryProps {
  entries: RevenueEntry[];
  onUpdateEntry: (entry: RevenueEntry) => void;
  onDeleteEntry: (entryId: string) => void;
}

export const RevenueHistory = ({ entries, onUpdateEntry, onDeleteEntry }: RevenueHistoryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RevenueEntry>>({});

  const handleEdit = (entry: RevenueEntry) => {
    setEditingId(entry.id);
    setEditForm({
      date: entry.date,
      amount: entry.amount,
      description: entry.description || "",
      category: entry.category || "",
    });
  };

  const handleSave = () => {
    if (editingId && editForm.date && editForm.amount) {
      const originalEntry = entries.find(e => e.id === editingId);
      if (originalEntry) {
        const updatedEntry: RevenueEntry = {
          ...originalEntry,
          date: editForm.date,
          amount: editForm.amount,
          description: editForm.description?.trim() || undefined,
          category: editForm.category?.trim() || undefined,
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
          <h3 className="text-lg font-semibold mb-2">No revenue entries yet</h3>
          <p className="text-muted-foreground text-responsive">Your revenue history will appear here once you add some entries.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-smooth">
      <CardHeader className="content-spacing">
        <CardTitle className="flex items-center gap-2 text-responsive">
          <Calendar className="w-6 h-6 flex-shrink-0" />
          Revenue History ({entries.length} entries)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-all duration-300">
              {editingId === entry.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-date-${entry.id}`} className="text-responsive">Date</Label>
                      <Input
                        id={`edit-date-${entry.id}`}
                        type="date"
                        value={editForm.date || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edit-amount-${entry.id}`} className="text-responsive">Amount (£)</Label>
                      <Input
                        id={`edit-amount-${entry.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.amount || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-category-${entry.id}`} className="text-responsive">Category</Label>
                    <Input
                      id={`edit-category-${entry.id}`}
                      placeholder="e.g., Sales, Consulting"
                      value={editForm.category || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    />
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
                      {entry.category && (
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {entry.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(entry.date).toLocaleDateString()}</span>
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