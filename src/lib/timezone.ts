import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Parse a time string (like "2:00 PM") in a specific timezone and return a Date object in UTC
 *
 * @param date The date (without time) to use
 * @param timeString The time string in format "H:MM AM/PM"
 * @param timezone The IANA timezone string (e.g., "America/New_York")
 * @returns Date object representing the time in UTC
 */
export function parseTimeInTimezone(date: Date, timeString: string, timezone: string): Date {
  // Parse the time string
  const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) {
    throw new Error('Invalid time format. Expected format: "H:MM AM/PM"');
  }

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  // Create a date in the target timezone
  // Start with the provided date (which is just year/month/day)
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Create a plain date object with the desired time (will be in local time initially)
  const localDate = new Date(year, month, day, hours, minutes, 0, 0);

  // Convert from the target timezone to UTC
  // fromZonedTime treats the input as if it's in the specified timezone and converts to UTC
  return fromZonedTime(localDate, timezone);
}
