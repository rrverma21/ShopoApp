import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, 
  isSameDay, isWithinInterval, isBefore
} from 'date-fns';
import { isFutureDate, isDateBefore } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';

export default function BottomSheet({ 
  isOpen, tempStartDate, tempEndDate, onDateSelect, onApply, onCancel, showError 
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(tempStartDate || new Date()));

  useEffect(() => {
    if (isOpen && tempStartDate) {
      setCurrentMonth(startOfMonth(tempStartDate));
    }
  }, [isOpen, tempStartDate]);

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
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevMonth} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="font-bold text-lg text-slate-900 dark:text-slate-100">
            {format(monthDate, 'MMMM yyyy')}
          </div>
          <button onClick={handleNextMonth} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-2 text-center mb-3">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
            <div key={`${monthDate.toISOString()}-${d}`} className="text-xs font-bold text-slate-400">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-y-2 gap-x-2">
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
                  h-10 w-full rounded-full flex items-center justify-center text-sm font-medium transition-colors
                  ${!isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'}
                  ${disabled ? 'opacity-30 cursor-not-allowed bg-[hsl(var(--date-disabled))]' : 'active:bg-slate-200 dark:active:bg-slate-700'}
                  ${inRange ? 'bg-[hsl(var(--date-range-highlight))] text-blue-800 dark:text-blue-200' : ''}
                  ${isSelectedStart || isSelectedEnd ? 'bg-[hsl(var(--date-selected))] text-white hover:bg-blue-600' : ''}
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
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onCancel();
              }
            }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 rounded-t-3xl z-[101] flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
          >
            <div className="flex justify-center pt-3 pb-2 w-full touch-none">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            </div>
            
            <div className="px-5 pb-4 pt-2 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Select Date Range</h3>
              <button onClick={onCancel} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              {renderMonth(currentMonth)}
              
              {showError && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg text-center font-medium">
                  {showError}
                </motion.div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-3 pb-safe">
              <Button 
                onClick={onApply} 
                disabled={!isValidRange} 
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20"
              >
                Apply Range
              </Button>
              <Button 
                variant="outline" 
                onClick={onCancel} 
                className="w-full h-12 text-base font-semibold rounded-xl border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}