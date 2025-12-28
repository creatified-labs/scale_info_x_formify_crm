"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form } from "@/types/forms";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSchedulerProps {
  form: Form;
  onScheduleSelect: (date: Date, time: string) => void;
}

export const FormScheduler = ({ form, onScheduleSelect }: FormSchedulerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();

  // Generate available time slots based on form configuration
  const generateTimeSlots = (date: Date): string[] => {
    if (!form.available_hours) return [];
    
    const slots: string[] = [];
    const { start, end } = form.available_hours;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const duration = form.schedule_duration || 30;
    const buffer = form.schedule_buffer || 0;
    const interval = duration + buffer;
    
    let currentTime = setMinutes(setHours(new Date(), startHour), startMin);
    const endTime = setMinutes(setHours(new Date(), endHour), endMin);
    
    while (isBefore(currentTime, endTime)) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addDays(currentTime, interval / (24 * 60));
    }
    
    return slots;
  };

  const isDayAvailable = (date: Date) => {
    const dayName = format(date, 'EEEE').toLowerCase();
    return form.available_days?.includes(dayName) && !isBefore(date, startOfDay(new Date()));
  };

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onScheduleSelect(selectedDate, selectedTime);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Schedule Your Call</h3>
        <p className="text-sm text-muted-foreground">
          Duration: {form.schedule_duration} minutes
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Select Date
          </label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => !isDayAvailable(date)}
            className="rounded-md border pointer-events-auto"
          />
        </div>

        {selectedDate && (
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Select Time
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTime(time)}
                  className="justify-center"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        )}

        {selectedDate && selectedTime && (
          <div className="pt-4 border-t">
            <div className="bg-primary/10 p-4 rounded-lg mb-4">
              <p className="font-semibold">Selected Time:</p>
              <p className="text-sm">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
              </p>
            </div>
            <Button onClick={handleConfirm} className="w-full">
              Confirm Booking
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
