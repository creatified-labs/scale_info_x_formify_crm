import { Goal, GoalRule, RevenueEntry } from '@/types/revenue';

/**
 * Evaluates whether a revenue entry matches a specific goal rule
 */
export function matchesRule(entry: RevenueEntry, rule: GoalRule): boolean {
  switch (rule.type) {
    case 'date_range': {
      const ruleValue = rule.value as { start?: string; end?: string };
      const entryDate = new Date(entry.date);
      
      if (ruleValue.start) {
        const startDate = new Date(ruleValue.start);
        if (entryDate < startDate) return false;
      }
      
      if (ruleValue.end) {
        const endDate = new Date(ruleValue.end);
        if (entryDate > endDate) return false;
      }
      
      return true;
    }
    
    case 'event_type': {
      const eventTypeId = rule.value as string;
      return entry.eventTypeId === eventTypeId;
    }
    
    case 'category': {
      const categoryId = rule.value as string;
      return entry.category === categoryId;
    }
    
    case 'amount_range': {
      const ruleValue = rule.value as { min?: number; max?: number };
      
      if (ruleValue.min !== undefined && entry.amount < ruleValue.min) {
        return false;
      }
      
      if (ruleValue.max !== undefined && entry.amount > ruleValue.max) {
        return false;
      }
      
      return true;
    }
    
    case 'source': {
      const sourceValue = rule.value as string;
      const entrySource = (entry.metadata as { source?: string } | undefined)?.source;
      return entrySource === sourceValue;
    }
    
    default:
      return false;
  }
}

/**
 * Evaluates whether a revenue entry matches ALL rules of a goal
 */
export function entryMatchesGoal(entry: RevenueEntry, goal: Goal): boolean {
  // If goal has no rules, it doesn't auto-match
  if (!goal.rules || goal.rules.length === 0) {
    return false;
  }
  
  // Entry must match ALL rules (AND logic)
  return goal.rules.every(rule => matchesRule(entry, rule));
}

/**
 * Filters revenue entries to only those matching a goal's rules
 */
export function filterEntriesByGoalRules(
  entries: RevenueEntry[],
  goal: Goal
): RevenueEntry[] {
  if (!goal.rules || goal.rules.length === 0) {
    return entries;
  }
  
  return entries.filter(entry => entryMatchesGoal(entry, goal));
}

/**
 * Calculates goal progress considering both explicit links and rule-based matching
 */
export function calculateGoalProgress(
  goal: Goal,
  allEntries: RevenueEntry[]
): { matchingEntries: RevenueEntry[]; totalAmount: number } {
  let matchingEntries: RevenueEntry[];
  
  if (goal.autoLink && goal.rules && goal.rules.length > 0) {
    // Auto-link mode: include entries matching rules OR explicitly linked
    matchingEntries = allEntries.filter(entry => 
      entry.goalId === goal.id || entryMatchesGoal(entry, goal)
    );
  } else {
    // Manual mode: only include explicitly linked entries
    matchingEntries = allEntries.filter(entry => entry.goalId === goal.id);
  }
  
  const totalAmount = matchingEntries.reduce((sum, entry) => sum + entry.amount, 0);
  
  return { matchingEntries, totalAmount };
}
