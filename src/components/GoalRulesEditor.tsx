"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Filter } from "lucide-react";
import { GoalRule } from "@/types/revenue";
import { useData } from "@/contexts/DataContext";

interface GoalRulesEditorProps {
  rules: GoalRule[];
  autoLink: boolean;
  onRulesChange: (rules: GoalRule[]) => void;
  onAutoLinkChange: (autoLink: boolean) => void;
  eventTypes?: Array<{ id: string; name: string }>;
}

export const GoalRulesEditor = ({
  rules,
  autoLink,
  onRulesChange,
  onAutoLinkChange,
  eventTypes = [],
}: GoalRulesEditorProps) => {
  const { categories } = useData();

  const addRule = () => {
    onRulesChange([...rules, { type: 'category', value: '' }]);
  };

  const removeRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<GoalRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    onRulesChange(newRules);
  };

  const renderRuleValue = (rule: GoalRule, index: number) => {
    switch (rule.type) {
      case 'event_type':
        return (
          <Select
            value={rule.value as string}
            onValueChange={(value) => updateRule(index, { value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((et) => (
                <SelectItem key={et.id} value={et.id}>
                  {et.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'category':
        return (
          <Select
            value={rule.value as string}
            onValueChange={(value) => updateRule(index, { value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
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
        );

      case 'source':
        return (
          <Select
            value={rule.value as string}
            onValueChange={(value) => updateRule(index, { value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="booking">Booking Conversion</SelectItem>
              <SelectItem value="manual">Manual Entry</SelectItem>
              <SelectItem value="call">Call Tracker</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'amount_range': {
        const range = (rule.value as { min?: number; max?: number }) || {};
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Min (£)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Min"
                value={range.min ?? ''}
                onChange={(e) =>
                  updateRule(index, {
                    value: { ...range, min: e.target.value ? parseFloat(e.target.value) : undefined },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max (£)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Max"
                value={range.max ?? ''}
                onChange={(e) =>
                  updateRule(index, {
                    value: { ...range, max: e.target.value ? parseFloat(e.target.value) : undefined },
                  })
                }
              />
            </div>
          </div>
        );
      }

      case 'date_range': {
        const dateRange = (rule.value as { start?: string; end?: string }) || {};
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={dateRange.start ?? ''}
                onChange={(e) =>
                  updateRule(index, {
                    value: { ...dateRange, start: e.target.value || undefined },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={dateRange.end ?? ''}
                onChange={(e) =>
                  updateRule(index, {
                    value: { ...dateRange, end: e.target.value || undefined },
                  })
                }
              />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Card className="card-smooth">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="w-5 h-5" />
          Automated Goal Rules
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Define rules to automatically match revenue entries to this goal
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="auto-link"
            checked={autoLink}
            onCheckedChange={(checked) => onAutoLinkChange(checked === true)}
          />
          <Label htmlFor="auto-link" className="text-sm font-normal cursor-pointer">
            Enable automatic matching (entries matching all rules will count toward this goal)
          </Label>
        </div>

        {autoLink && (
          <>
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Rule Type</Label>
                      <Select
                        value={rule.type}
                        onValueChange={(value) =>
                          updateRule(index, {
                            type: value as GoalRule['type'],
                            value: value === 'amount_range' ? {} : value === 'date_range' ? {} : '',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="event_type">Event Type</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                          <SelectItem value="source">Source</SelectItem>
                          <SelectItem value="amount_range">Amount Range</SelectItem>
                          <SelectItem value="date_range">Date Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(index)}
                      className="text-destructive hover:text-destructive mt-5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Value</Label>
                    {renderRuleValue(rule, index)}
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRule}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>

            {rules.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <strong>Note:</strong> Revenue entries must match <strong>all</strong> rules to be
                automatically included in this goal. For example, if you set "Category = Sales" and
                "Amount Range = £100-£500", only sales entries between £100-£500 will count.
              </div>
            )}
          </>
        )}

        {!autoLink && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Automatic matching is disabled. Only revenue entries you manually link to this goal will
            count toward its progress.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
