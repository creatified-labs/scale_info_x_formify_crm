export interface Call {
  id: string;
  clientName: string;
  email?: string;
  phone?: string;
  callType: "call" | "meeting" | "consultation";
  date: string;
  time: string;
  duration: number; // in minutes
  notes?: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "hasn't paid yet";
  isConverted?: boolean;
  conversionAmount?: number;
  joinUrl?: string;
  bookingId?: string;
  createdAt: Date;
}

export interface CallStats {
  totalCalls: number;
  completedCalls: number;
  noShowCalls: number;
  showRate: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
}