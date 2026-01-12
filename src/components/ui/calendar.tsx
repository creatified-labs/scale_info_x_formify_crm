"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .calendar-fixed .rdp-table {
          width: 100%;
          border-collapse: collapse;
        }
        .calendar-fixed .rdp-head_row,
        .calendar-fixed .rdp-row {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          width: 100% !important;
          gap: 0 !important;
        }
        .calendar-fixed .rdp-head_cell,
        .calendar-fixed .rdp-cell {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 40px !important;
        }
        .calendar-fixed .rdp-caption {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 1rem !important;
        }
        .calendar-fixed .rdp-nav {
          display: flex !important;
          gap: 0.25rem !important;
        }
      `}} />
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-4 calendar-fixed", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4 w-full",
          caption: "flex justify-between items-center mb-4 px-1",
          caption_label: "text-base font-semibold",
          nav: "flex items-center gap-1",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-background p-0 hover:bg-accent"
          ),
          nav_button_previous: "",
          nav_button_next: "",
          table: "w-full border-collapse",
          head_row: "",
          head_cell: "text-muted-foreground font-medium text-sm",
          row: "",
          cell: "text-center text-sm p-0 relative",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside:
            "day-outside text-muted-foreground opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        {...props}
      />
    </>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
