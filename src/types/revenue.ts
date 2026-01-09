export interface RevenueEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  amount: number;
  description?: string;
  category?: string; // Now references category ID
  categoryName?: string; // Display name for category
  categoryColor?: string; // Color for category
  createdAt: Date;
  metadata?: Record<string, unknown>;
  goalId?: string; // Linked goal ID
  bookingId?: string; // Linked booking ID
  eventTypeId?: string; // Event type that generated this revenue
  eventTypeName?: string; // Event type name for display
}

export interface Goal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'deadline';
  targetAmount: number;
  period?: string; // YYYY-MM-DD for daily, YYYY-WW for weekly, YYYY-MM for monthly, YYYY for yearly
  deadline?: string; // YYYY-MM-DD for specific deadline goals
  description?: string;
  category?: string; // Goal category ID (revenue, sales, profit, etc.)
  categoryName?: string; // Display name for goal category
  categoryColor?: string; // Color for goal category
  categoryType?: 'revenue' | 'sales' | 'profit' | 'clients' | 'custom';
  goalType: 'revenue' | 'clients' | 'calls'; // What we're measuring: revenue amount, client count, or calls booked
  createdAt: Date;
}

export interface GoalProgress {
  goal: Goal;
  currentAmount: number;
  progressPercentage: number;
  daysRemaining?: number;
  isCompleted: boolean;
}