import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'HH:mm');
  } catch (error) {
    return time;
  }
}

export interface FormatDateOptions {
  withTime?: boolean;
  relative?: boolean;
  dateFormat?: string;
  timeFormat?: string;
  weekday?: boolean;
}

export function formatDate(
  date: string | Date,
  options: FormatDateOptions = {}
): string {
  const {
    withTime = false,
    relative = false,
    dateFormat = 'MMM dd, yyyy',
    timeFormat = 'HH:mm',
    weekday = false
  } = options;

  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else {
    dateObj = date;
  }

  if (!isValid(dateObj)) {
    return 'Invalid date';
  }

  if (relative) {
    return formatDistanceToNow(dateObj, { addSuffix: true });
  }

  if (weekday) {
    return format(dateObj, 'EEE');
  }

  if (withTime) {
    return format(dateObj, `${dateFormat} ${timeFormat}`);
  }

  return format(dateObj, dateFormat);
}

export function isDateInPast(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) && dateObj < new Date();
}

export function isDateToday(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return false;
  
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getStartOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  return new Date(result.setDate(diff));
}

export function getEndOfWeek(date: Date): Date {
  const startOfWeek = getStartOfWeek(date);
  return addDays(startOfWeek, 6);
}
