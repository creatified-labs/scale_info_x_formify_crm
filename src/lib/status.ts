import type { Call } from "@/types/calls";

export type BookingStatus = "scheduled" | "completed" | "canceled" | "no_show" | "hasnt_paid_yet";

const normalize = (value?: string | null): string => (value ?? "").trim().toLowerCase();

export const normalizeBookingStatus = (value?: string | null): BookingStatus => {
  const normalized = normalize(value);

  if (normalized === "completed") return "completed";
  if (normalized === "cancelled" || normalized === "canceled") return "canceled";
  if (normalized === "no_show" || normalized === "no-show" || normalized === "no show") return "no_show";
  if (normalized === "hasnt_paid_yet" || normalized === "hasn't paid yet" || normalized === "hasnt paid yet") {
    return "hasnt_paid_yet";
  }

  return "scheduled";
};

export const formatBookingStatus = (status: BookingStatus): string => {
  switch (status) {
    case "completed":
      return "Completed";
    case "canceled":
      return "Cancelled";
    case "no_show":
      return "No Show";
    case "hasnt_paid_yet":
      return "Hasn't Paid Yet";
    default:
      return "Scheduled";
  }
};

export const statusTextColorClass = (status: BookingStatus | Call["status"] | string | undefined): string => {
  const normalized = normalizeBookingStatus(typeof status === "string" ? status : undefined);
  switch (normalized) {
    case "completed":
      return "text-emerald-600";
    case "canceled":
    case "no_show":
      return "text-red-600";
    case "hasnt_paid_yet":
      return "text-amber-600";
    default:
      return "text-foreground";
  }
};

export const bookingStatusToCallStatus = (status: BookingStatus): Call["status"] => {
  switch (status) {
    case "completed":
      return "completed";
    case "canceled":
      return "cancelled";
    case "no_show":
      return "no-show";
    case "hasnt_paid_yet":
      return "hasn't paid yet";
    default:
      return "scheduled";
  }
};

export const callStatusToBookingStatus = (status: Call["status"]): BookingStatus => {
  switch (status) {
    case "completed":
      return "completed";
    case "cancelled":
      return "canceled";
    case "no-show":
      return "no_show";
    case "hasn't paid yet":
      return "hasnt_paid_yet";
    default:
      return "scheduled";
  }
};
