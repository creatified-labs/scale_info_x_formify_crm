"use client";

export const dynamic = 'force-dynamic';
import { useMemo, useEffect, useState } from "react";
import { GoalsManager } from "@/components/GoalsManager";
import { useData } from "@/contexts/DataContext";
import { GoalProgress } from "@/types/revenue";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, startOfDay, endOfDay } from "date-fns";

const Goals = () => {
  const { goals, addGoal, deleteGoal, revenueEntries, loading } = useData();
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingConversions, setBookingConversions] = useState<any[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'scheduled');
      
      if (data) {
        setBookings(data);
      }
    };

    const fetchConversions = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('is_converted', true)
        .not('conversion_amount', 'is', null);
      
      if (data) {
        setBookingConversions(data);
      }
    };

    fetchBookings();
    fetchConversions();
  }, []);

  // Combine revenue entries with booking conversions
  const allRevenueData = useMemo(() => {
    const bookingRevenue = bookingConversions.map(booking => ({
      id: booking.id,
      date: booking.start_time.split('T')[0],
      amount: Number(booking.conversion_amount),
      description: `Booking: ${booking.invitee_name}`,
      category: 'general',
      createdAt: new Date(booking.converted_at || booking.start_time)
    }));
    
    return [...revenueEntries, ...bookingRevenue];
  }, [revenueEntries, bookingConversions]);

  const goalProgress = useMemo((): GoalProgress[] => {
    return goals.map(goal => {
      let currentAmount = 0;
      let daysRemaining = 0;

      // Handle calls booked goals
      if (goal.goalType === 'calls') {
        let relevantBookings = bookings;

        if (goal.type === 'deadline' && goal.deadline) {
          const deadlineDate = new Date(goal.deadline);
          const createdDate = new Date(goal.createdAt);
          relevantBookings = bookings.filter(booking => {
            const bookingDate = new Date(booking.created_at);
            return bookingDate >= createdDate && bookingDate <= deadlineDate;
          });
          daysRemaining = differenceInDays(deadlineDate, new Date());
        } else if (goal.type === 'daily' && goal.period) {
          relevantBookings = bookings.filter(booking => {
            const bookingDate = new Date(booking.created_at).toISOString().split('T')[0];
            return bookingDate === goal.period;
          });
        } else if (goal.type === 'weekly' && goal.period) {
          const [year, week] = (goal.period || '').split('-W');
          const weekStart = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          relevantBookings = bookings.filter(booking => {
            const bookingDate = new Date(booking.created_at);
            return bookingDate >= weekStart && bookingDate <= weekEnd;
          });
        } else if (goal.type === 'monthly' && goal.period) {
          relevantBookings = bookings.filter(booking => {
            const bookingDate = new Date(booking.created_at).toISOString().split('T')[0];
            return bookingDate.startsWith(goal.period || '');
          });
        } else if (goal.type === 'yearly' && goal.period) {
          relevantBookings = bookings.filter(booking => {
            const bookingDate = new Date(booking.created_at).toISOString().split('T')[0];
            return bookingDate.startsWith(goal.period || '');
          });
        }

        currentAmount = relevantBookings.length;
      } else {
        // Handle revenue/client goals - include booking conversions
        let relevantEntries = allRevenueData;

        if (goal.type === 'deadline' && goal.deadline) {
          const deadlineDate = new Date(goal.deadline);
          const createdDate = new Date(goal.createdAt);
          relevantEntries = allRevenueData.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= createdDate && entryDate <= deadlineDate;
          });
          daysRemaining = differenceInDays(deadlineDate, new Date());
        } else if (goal.type === 'daily' && goal.period) {
          const goalDate = goal.period;
          relevantEntries = allRevenueData.filter(entry => entry.date === goalDate);
        } else if (goal.type === 'weekly' && goal.period) {
          const [year, week] = (goal.period || '').split('-W');
          const weekStart = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          relevantEntries = allRevenueData.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= weekStart && entryDate <= weekEnd;
          });
        } else if (goal.type === 'monthly' && goal.period) {
          relevantEntries = allRevenueData.filter(entry => entry.date.startsWith(goal.period || ''));
        } else if (goal.type === 'yearly' && goal.period) {
          relevantEntries = allRevenueData.filter(entry => entry.date.startsWith(goal.period || ''));
        }

        currentAmount = relevantEntries.reduce((sum, entry) => sum + entry.amount, 0);
      }

      const progressPercentage = (currentAmount / goal.targetAmount) * 100;
      const isCompleted = currentAmount >= goal.targetAmount;

      return {
        goal,
        currentAmount,
        progressPercentage: Math.min(progressPercentage, 100),
        isCompleted,
        daysRemaining: daysRemaining > 0 ? daysRemaining : undefined
      };
    });
  }, [goals, allRevenueData, bookings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Goals Management
          </h1>
          <p className="text-muted-foreground">
            Set and track your revenue goals across different time periods
          </p>
        </div>

        {/* Goals Manager */}
        <GoalsManager 
          goals={goals}
          goalProgress={goalProgress}
          onAddGoal={addGoal}
          onDeleteGoal={deleteGoal}
        />
      </div>
    </div>
  );
};

export default Goals;
