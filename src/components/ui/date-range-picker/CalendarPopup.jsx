import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, 
  isSameDay, isWithinInterval, isBefore
} from 'date-fns';
import { isFutureDate, isDateBefore } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';

export default function CalendarPopup({ 
  isOpen, tempStartDate, tempEndDate, onDateSelect, onApply, onCancel, showError 
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(tempStartDate || new Date()));

  useEffect(() => {
    if (isOpen && tempStartDate) {
      setCurrentMonth(startOfMonth(tempStartDate));
    }
  }, [isOpen, tempStartDate]);

  if (!isOpen) return null;

  const nextMonth = addMonths(currentMonth, 1);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const isDayInRange = (day) => {
    if (!tempStartDate || !tempEndDate) return false;
    const start = isBefore(tempStartDate, tempEndDate) ? tempStartDate : tempEndDate;
    const end = isBefore(tempStartDate, tempEndDate) ? tempEndDate : tempStartDate;
    return isWithinInterval(day, { start, end });
  };

  const renderMonth = (monthDate) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(start);
    const startDate = startOfWeek(start, { weekStartsOn: 1 });
    const endDate = endOfWeek(end, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="flex-1 w-full min-w-[260px]">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {format(monthDate, 'MMMM yyyy')}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
            <div key={`${monthDate.toISOString()}-${d}`} className="text-xs font-medium text-slate-500">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 gap-x-1">
          {days.map(day => {
            const isFuture = isFutureDate(day);
            const isSelectedStart = tempStartDate && isSameDay(day, tempStartDate);
            const isSelectedEnd = tempEndDate && isSameDay(day, tempEndDate);
            const inRange = !isSelectedStart && !isSelectedEnd && isDayInRange(day);
            const isCurrentMonth = isSameMonth(day, monthDate);
            const disabled = isFuture;

            return (
              <button
                key={day.toISOString()}
                disabled={disabled}
                onClick={() => onDateSelect(day)}
                className={`
                  h-9 w-full rounded-md flex items-center justify-center text-sm transition-colors
                  ${!isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'}
                  ${disabled ? 'opacity-30 cursor-not-allowed bg-[hsl(var(--date-disabled))]' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
                  ${inRange ? 'bg-[hsl(var(--date-range-highlight))] text-blue-800 dark:text-blue-200' : ''}
                  ${isSelectedStart || isSelectedEnd ? 'bg-[hsl(var(--date-selected))] text-white font-bold hover:bg-blue-600' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const isValidRange = tempStartDate && tempEndDate && !isDateBefore(tempEndDate, tempStartDate) && !showError;

  return (
    <div className="absolute top-[110%] left-0 mt-2 bg-white dark:bg-slate-900 border border-[hsl(var(--date-input-border))] rounded-xl shadow-2xl p-5 z-50 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
      
      <div className="flex items-start gap-6">
        <div className="relative flex items-start gap-6">
            <button onClick={handlePrevMonth} className="absolute left-0 top-0 h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 z-10">
              <ChevronLeft className="w-5 h-5" />
            </button>
            {renderMonth(currentMonth)}
            <div className="hidden md:block w-[1px] bg-slate-200 dark:bg-slate-800 self-stretch mx-2"></div>
            <div className="hidden md:block">
              {renderMonth(nextMonth)}
            </div>
            <button onClick={handleNextMonth} className="absolute right-0 top-0 h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 z-10">
              <ChevronRight className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--date-input-border))]">
        <div className="text-sm font-medium text-red-500 min-h-[20px]">
          {showError}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} className="h-9 px-4">Cancel</Button>
          <Button onClick={onApply} disabled={!isValidRange} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white">Apply Range</Button>
        </div>
      </div>
    </div>
  );
}