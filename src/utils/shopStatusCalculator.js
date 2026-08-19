import { format, parse, isAfter, isBefore, isWithinInterval, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/**
 * Calculate shop open/closed status based on settings
 * @param {Object} settings - pos_retailer_settings object
 * @returns {Object} Status object with displayText, icon, color, times, nextAction
 */
export const calculateShopStatus = (settings) => {
  // Handle NULL/missing settings
  if (!settings || !settings.opening_time || !settings.closing_time) {
    return {
      displayText: 'Hours not set',
      color: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
      icon: 'clock',
      times: null,
      nextAction: null
    };
  }

  const { opening_time, closing_time, working_days, timezone } = settings;

  // Get current time in shop's timezone (or browser timezone as fallback)
  const effectiveTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  let zonedNow;
  try {
    zonedNow = toZonedTime(new Date(), effectiveTimezone);
  } catch (error) {
    console.warn('[ShopStatus] Invalid timezone, using browser time:', error);
    zonedNow = new Date();
  }

  const currentDayFull = format(zonedNow, 'EEEE').toLowerCase(); // e.g., 'monday'
  const currentDayShort = format(zonedNow, 'EEE').toLowerCase(); // e.g., 'mon'
  const currentDayNum = String(zonedNow.getDay()); // '0'='Sun', '1'='Mon'

  // Check if shop is open today
  let isWorkingDay = true;
  if (working_days && Array.isArray(working_days) && working_days.length > 0) {
    const normalizedDays = working_days.map(d => String(d).toLowerCase());
    isWorkingDay = normalizedDays.includes(currentDayFull) || 
                   normalizedDays.includes(currentDayShort) ||
                   normalizedDays.includes(currentDayNum);
  }
  
  // Find next working day if closed today
  let nextWorkingDay = null;
  let daysUntilOpen = 0;
  if (working_days && Array.isArray(working_days) && working_days.length > 0 && !isWorkingDay) {
    const normalizedDays = working_days.map(d => String(d).toLowerCase());
    for(let i = 1; i <= 7; i++) {
      const checkDate = addDays(zonedNow, i);
      const checkDayFull = format(checkDate, 'EEEE').toLowerCase();
      const checkDayShort = format(checkDate, 'EEE').toLowerCase();
      const checkDayNum = String(checkDate.getDay());
      
      if (normalizedDays.includes(checkDayFull) || 
          normalizedDays.includes(checkDayShort) ||
          normalizedDays.includes(checkDayNum)) {
        nextWorkingDay = format(checkDate, 'EEEE');
        daysUntilOpen = i;
        break;
      }
    }
  }

  // Parse opening and closing times safely
  const todayDate = format(zonedNow, 'yyyy-MM-dd');
  let openingDateTime, closingDateTime;
  
  try {
    openingDateTime = parse(`${todayDate} ${opening_time}`, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (isNaN(openingDateTime)) openingDateTime = parse(`${todayDate} ${opening_time}`, 'yyyy-MM-dd HH:mm', new Date());
    
    closingDateTime = parse(`${todayDate} ${closing_time}`, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (isNaN(closingDateTime)) closingDateTime = parse(`${todayDate} ${closing_time}`, 'yyyy-MM-dd HH:mm', new Date());
  } catch (error) {
    console.error('[ShopStatus] Error parsing times:', error);
    return {
      displayText: 'Invalid Hours',
      color: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
      icon: 'clock',
      times: null,
      nextAction: null
    };
  }

  // Handle 24/7 shops
  if (
    (opening_time.startsWith('00:00') && closing_time.startsWith('23:59'))
  ) {
    if (!isWorkingDay) {
      return {
        displayText: 'Closed Today',
        color: 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/50 dark:bg-red-950 dark:text-red-400',
        icon: 'x',
        times: null,
        nextAction: 'Closed for the day'
      };
    }
    return {
      displayText: 'Open Now',
      color: 'border-green-200 bg-green-100 text-green-800 dark:border-green-900/50 dark:bg-green-950 dark:text-green-400',
      icon: 'check',
      times: 'Always Open',
      nextAction: null
    };
  }

  // Handle overnight hours (e.g., 22:00 to 06:00)
  if (isBefore(closingDateTime, openingDateTime)) {
    closingDateTime = addDays(closingDateTime, 1);
  }

  const formattedOpening = format(openingDateTime, 'h:mm a');
  const formattedClosing = format(closingDateTime, 'h:mm a');
  const formattedTimes = `${formattedOpening} - ${formattedClosing}`;

  // Shop is closed for the day or multiple days
  if (!isWorkingDay) {
    if (daysUntilOpen > 1 && nextWorkingDay) {
      return {
        displayText: `Closed until ${nextWorkingDay}`,
        color: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
        icon: 'x',
        times: null,
        nextAction: `Reopens on ${nextWorkingDay} at ${formattedOpening}`
      };
    }
    return {
      displayText: 'Closed Today',
      color: 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/50 dark:bg-red-950 dark:text-red-400',
      icon: 'x',
      times: null,
      nextAction: `Opens tomorrow at ${formattedOpening}`
    };
  }

  // Check if currently within operating hours
  const isCurrentlyOpen = isWithinInterval(zonedNow, {
    start: openingDateTime,
    end: closingDateTime
  });

  if (isCurrentlyOpen) {
    return {
      displayText: 'Open Now',
      color: 'border-green-200 bg-green-100 text-green-800 dark:border-green-900/50 dark:bg-green-950 dark:text-green-400',
      icon: 'check',
      times: formattedTimes,
      nextAction: `Closes at ${formattedClosing}`
    };
  } else {
    // If before opening time
    if (isBefore(zonedNow, openingDateTime)) {
      return {
        displayText: `Opens at ${formattedOpening}`,
        color: 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950 dark:text-orange-400',
        icon: 'clock',
        times: formattedTimes,
        nextAction: `Opens today at ${formattedOpening}`
      };
    } 
    // If after closing time
    else {
      return {
        displayText: 'Closed',
        color: 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950 dark:text-orange-400',
        icon: 'x',
        times: formattedTimes,
        nextAction: `Opens tomorrow at ${formattedOpening}`
      };
    }
  }
};

/**
 * Format opening hours for display
 * @param {string} openingTime - HH:MM:SS format
 * @param {string} closingTime - HH:MM:SS format
 * @returns {string} Formatted hours (e.g., "9:00 AM - 9:00 PM")
 */
export const formatOperatingHours = (openingTime, closingTime) => {
  if (!openingTime || !closingTime) return null;
  
  try {
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const opening = parse(`${todayDate} ${openingTime}`, 'yyyy-MM-dd HH:mm:ss', new Date());
    const closing = parse(`${todayDate} ${closingTime}`, 'yyyy-MM-dd HH:mm:ss', new Date());
    
    if (isNaN(opening) || isNaN(closing)) {
       const altOpening = parse(`${todayDate} ${openingTime}`, 'yyyy-MM-dd HH:mm', new Date());
       const altClosing = parse(`${todayDate} ${closingTime}`, 'yyyy-MM-dd HH:mm', new Date());
       return `${format(altOpening, 'h:mm a')} - ${format(altClosing, 'h:mm a')}`;
    }
    
    return `${format(opening, 'h:mm a')} - ${format(closing, 'h:mm a')}`;
  } catch (error) {
    console.error('[ShopStatus] Error formatting hours:', error);
    return null;
  }
};