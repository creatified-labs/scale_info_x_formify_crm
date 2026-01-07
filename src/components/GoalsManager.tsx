"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Edit, Trash2, CheckCircle, Calendar, Info } from "lucide-react";
import { Goal, GoalProgress, GoalRule } from "@/types/revenue";
import { format } from "date-fns";
import { GoalRulesEditor } from "@/components/GoalRulesEditor";
import { useEffect, useState as useReactState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GoalsManagerProps {
  goals: Goal[];
  goalProgress: GoalProgress[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export const GoalsManager = ({ goals, goalProgress, onAddGoal, onDeleteGoal }: GoalsManagerProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [goalType, setGoalType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'deadline'>('monthly');
  const [goalCategory, setGoalCategory] = useState<'revenue' | 'clients' | 'calls'>('revenue');
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [goalRules, setGoalRules] = useState<GoalRule[]>([]);
  const [autoLink, setAutoLink] = useState(false);
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch event types for rule configuration
  useEffect(() => {
    const fetchEventTypes = async () => {
      const { data } = await supabase
        .from('event_types')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      
      if (data) {
        setEventTypes(data);
      }
    };
    fetchEventTypes();
  }, []);

  const getCurrentPeriod = (type: Goal['type']): string => {
    const now = new Date();
    switch (type) {
      case 'daily':
        return now.toISOString().split('T')[0];
      case 'weekly':
        const year = now.getFullYear();
        const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
      case 'monthly':
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      case 'yearly':
        return now.getFullYear().toString();
      default:
        return now.toISOString().split('T')[0];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetAmount || parseFloat(targetAmount) <= 0 || isSubmitting) {
      return;
    }

    if (goalType === 'deadline' && !deadline) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddGoal({
        type: goalType,
        targetAmount: parseFloat(targetAmount),
        ...(goalType === 'deadline' 
          ? { deadline } 
          : { period: getCurrentPeriod(goalType) }
        ),
        description: description.trim() || undefined,
        goalType: goalCategory,
        rules: goalRules.length > 0 ? goalRules : undefined,
        autoLink: autoLink,
      });
      
      // Reset form
      setTargetAmount("");
      setDescription("");
      setDeadline("");
      setGoalCategory('revenue');
      setGoalRules([]);
      setAutoLink(false);
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRuleDescription = (rule: GoalRule): string => {
    switch (rule.type) {
      case 'event_type': {
        const eventType = eventTypes.find(et => et.id === rule.value);
        return `Event Type: ${eventType?.name || 'Unknown'}`;
      }
      case 'category':
        return `Category: ${rule.value}`;
      case 'source': {
        const sourceLabels: Record<string, string> = {
          booking: 'Booking Conversion',
          manual: 'Manual Entry',
          call: 'Call Tracker'
        };
        return `Source: ${sourceLabels[rule.value as string] || rule.value}`;
      }
      case 'amount_range': {
        const range = rule.value as { min?: number; max?: number };
        if (range.min !== undefined && range.max !== undefined) {
          return `Amount: £${range.min} - £${range.max}`;
        } else if (range.min !== undefined) {
          return `Amount: £${range.min}+`;
        } else if (range.max !== undefined) {
          return `Amount: up to £${range.max}`;
        }
        return 'Amount range set';
      }
      case 'date_range': {
        const dateRange = rule.value as { start?: string; end?: string };
        if (dateRange.start && dateRange.end) {
          return `Date: ${format(new Date(dateRange.start), 'MMM d')} - ${format(new Date(dateRange.end), 'MMM d, yyyy')}`;
        } else if (dateRange.start) {
          return `Date: from ${format(new Date(dateRange.start), 'MMM d, yyyy')}`;
        } else if (dateRange.end) {
          return `Date: until ${format(new Date(dateRange.end), 'MMM d, yyyy')}`;
        }
        return 'Date range set';
      }
      default:
        return 'Rule configured';
    }
  };

  const formatPeriod = (goal: Goal): string => {
    if (goal.type === 'deadline' && goal.deadline) {
      return `Deadline: ${format(new Date(goal.deadline), 'MMMM d, yyyy')}`;
    }

    // Handle missing period
    if (!goal.period) {
      return '';
    }

    switch (goal.type) {
      case 'daily':
        return new Date(goal.period).toLocaleDateString();
      case 'weekly':
        const [year, week] = goal.period.split('-W');
        return `Week ${week}, ${year}`;
      case 'monthly':
        const [monthYear, month] = goal.period.split('-');
        return new Date(parseInt(monthYear), parseInt(month) - 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });
      case 'yearly':
        return goal.period;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Goals Manager</h2>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="button-smooth">
          <Plus className="w-4 h-4 mr-2" />
          Set New Goal
        </Button>
      </div>

      {showAddForm && (
        <Card className="card-smooth">
          <CardHeader>
            <CardTitle>Set New Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goalCategory">Goal Type</Label>
                  <Select value={goalCategory} onValueChange={(value: any) => setGoalCategory(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue Goal</SelectItem>
                      <SelectItem value="clients">Client Goal</SelectItem>
                      <SelectItem value="calls">Calls Booked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="goalType">Goal Period</Label>
                  <Select value={goalType} onValueChange={(value: any) => setGoalType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="deadline">Specific Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">
                    Target {goalCategory === 'revenue' ? 'Amount (£)' : goalCategory === 'calls' ? 'Calls' : 'Number of Clients'}
                  </Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    step={goalCategory === 'revenue' ? "0.01" : "1"}
                    min="0"
                    placeholder={goalCategory === 'revenue' ? "0.00" : "0"}
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              {goalType === 'deadline' && (
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Goal Deadline
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="goalDescription">Description (optional)</Label>
                <Textarea
                  id="goalDescription"
                  placeholder="Describe your goal..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {goalCategory === 'revenue' && (
                <GoalRulesEditor
                  rules={goalRules}
                  autoLink={autoLink}
                  onRulesChange={setGoalRules}
                  onAutoLinkChange={setAutoLink}
                  eventTypes={eventTypes}
                />
              )}
              
              <div className="flex gap-2">
                <Button type="submit" className="button-smooth" disabled={isSubmitting}>
                  {isSubmitting ? 'Setting Goal...' : 'Set Goal'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="button-smooth" disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="goals-grid">
        {goalProgress.map((progress) => (
          <Card key={progress.goal.id} className={`card-smooth ${progress.isCompleted ? "border-green-500" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize flex items-center gap-2 text-responsive">
                  {progress.isCompleted && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                  <span className="truncate">{progress.goal.type} {progress.goal.goalType} Goal</span>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground button-smooth flex-shrink-0"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="end" className="max-w-sm z-50">
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-sm mb-1">Goal Details</p>
                            <div className="space-y-1 text-xs">
                              <p><span className="text-muted-foreground">Type:</span> {progress.goal.type} {progress.goal.goalType}</p>
                              <p><span className="text-muted-foreground">Target:</span> {progress.goal.goalType === 'revenue' ? '£' : ''}{progress.goal.targetAmount.toLocaleString()}{progress.goal.goalType === 'clients' ? ' clients' : progress.goal.goalType === 'calls' ? ' calls' : ''}</p>
                              <p><span className="text-muted-foreground">Period:</span> {formatPeriod(progress.goal)}</p>
                              {progress.goal.description && (
                                <p><span className="text-muted-foreground">Description:</span> {progress.goal.description}</p>
                              )}
                            </div>
                          </div>
                          
                          {progress.goal.autoLink && progress.goal.rules && progress.goal.rules.length > 0 ? (
                            <div className="pt-2 border-t">
                              <p className="font-semibold text-sm mb-1 text-blue-600 dark:text-blue-400">Auto-Matching Rules</p>
                              <p className="text-xs text-muted-foreground mb-2">All rules must match:</p>
                              <ul className="space-y-1 text-xs">
                                {progress.goal.rules.map((rule, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-blue-400">•</span>
                                    <span>{formatRuleDescription(rule)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">Manual Linking:</span> Only revenue entries you manually link will count toward this goal.
                              </p>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteGoal(progress.goal.id)}
                    className="text-destructive hover:text-destructive button-smooth flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-responsive">
                {formatPeriod(progress.goal)}
              </p>
              {progress.goal.description && (
                <p className="text-sm text-muted-foreground italic text-responsive mt-1">
                  {progress.goal.description}
                </p>
              )}
              {progress.goal.autoLink && progress.goal.rules && progress.goal.rules.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 cursor-help">
                        <CheckCircle className="w-3 h-3" />
                        <span>Auto-matching enabled ({progress.goal.rules.length} rule{progress.goal.rules.length > 1 ? 's' : ''})</span>
                        <Info className="w-3 h-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">Active Rules (all must match):</p>
                        <ul className="space-y-1 text-xs">
                          {progress.goal.rules.map((rule, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-blue-400">•</span>
                              <span>{formatRuleDescription(rule)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          Revenue entries matching all rules will automatically count toward this goal.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <div className="text-right">
                  <div className="number-display text-primary text-lg">
                    {progress.goal.goalType === 'revenue' ? '£' : ''}{progress.currentAmount.toLocaleString()}{progress.goal.goalType === 'clients' ? ' clients' : progress.goal.goalType === 'calls' ? ' calls' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    / {progress.goal.goalType === 'revenue' ? '£' : ''}{progress.goal.targetAmount.toLocaleString()}{progress.goal.goalType === 'clients' ? ' clients' : progress.goal.goalType === 'calls' ? ' calls' : ''}
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-primary">
                  {progress.progressPercentage.toFixed(1)}% complete
                </span>
                {progress.daysRemaining !== undefined && progress.daysRemaining > 0 && (
                  <span className="text-muted-foreground">
                    {progress.daysRemaining} days left
                  </span>
                )}
              </div>
              
              {progress.progressPercentage >= 100 && (
                <div className="text-sm text-green-600 font-medium flex items-center gap-1 animate-fade-in">
                  <CheckCircle className="w-4 h-4" />
                  Goal achieved! 🎉
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {goalProgress.length === 0 && (
        <Card className="card-smooth">
          <CardContent className="py-8 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals set yet</h3>
            <p className="text-muted-foreground mb-4">Set your first revenue goal to start tracking progress!</p>
            <Button onClick={() => setShowAddForm(true)} className="button-smooth">
              <Plus className="w-4 h-4 mr-2" />
              Set Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};