import {
  format,
  parse,
  isValid,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths
} from 'date-fns';

/**
 * Formats a Date object to a specified string format
 * @param {Date} date - The date to format
 * @param {string} formatStr - The format string (default: 'dd/MM/yyyy')
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date || !isValid(date)) return '';
  return format(date, formatStr);
};

/**
 * Parses a dd/mm/yyyy string into a Date object
 * @param {string} dateString - The date string to parse
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
export const parseDate = (dateString) => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

/**
 * Validates if the provided object is a valid Date
 * @param {Date} date - The date to validate
 * @returns {boolean}
 */
export const isValidDate = (date) => {
  return date instanceof Date && isValid(date);
};

/**
 * Checks if a given date is in the future
 * @param {Date} date - The date to check
 * @returns {boolean}
 */
export const isFutureDate = (date) => {
  if (!isValidDate(date)) return false;
  return isAfter(startOfDay(date), startOfDay(new Date()));
};

/**
 * Checks if date1 is before date2
 * @param {Date} date1 
 * @param {Date} date2 
 * @returns {boolean}
 */
export const isDateBefore = (date1, date2) => {
  if (!isValidDate(date1) || !isValidDate(date2)) return false;
  return isBefore(startOfDay(date1), startOfDay(date2));
};

/**
 * Checks if two dates are the same day
 * @param {Date} date1 
 * @param {Date} date2 
 * @returns {boolean}
 */
export const isSameDayCheck = (date1, date2) => {
  if (!isValidDate(date1) || !isValidDate(date2)) return false;
  return isSameDay(date1, date2);
};

/**
 * Gets the name of the day for a date (e.g., 'Monday')
 * @param {Date} date 
 * @returns {string}
 */
export const getDayOfWeek = (date) => {
  if (!isValidDate(date)) return '';
  return format(date, 'EEEE');
};

/**
 * Gets the month and year string (e.g., 'March 2026')
 * @param {Date} date 
 * @returns {string}
 */
export const getMonthYear = (date) => {
  if (!isValidDate(date)) return '';
  return format(date, 'MMMM yyyy');
};

/**
 * Returns startDate and endDate for common date presets
 * @param {string} preset - The preset name
 * @returns {{startDate: Date, endDate: Date}|null}
 */
export const getPresetDates = (preset) => {
  const today = startOfDay(new Date());
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'Today':
      return { startDate: today, endDate: endOfToday };
    case 'Yesterday': {
      const yesterday = subDays(today, 1);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return { startDate: yesterday, endDate: endOfYesterday };
    }
    case 'Last 7 days':
      return { startDate: subDays(today, 6), endDate: endOfToday };
    case 'Last 30 days':
      return { startDate: subDays(today, 29), endDate: endOfToday };
    case 'This month':
      return { startDate: startOfMonth(today), endDate: endOfToday };
    case 'Last month': {
      const lastMonth = subMonths(today, 1);
      const endOfLastMonth = endOfMonth(lastMonth);
      endOfLastMonth.setHours(23, 59, 59, 999);
      return { startDate: startOfMonth(lastMonth), endDate: endOfLastMonth };
    }
    default:
      return null;
  }
};