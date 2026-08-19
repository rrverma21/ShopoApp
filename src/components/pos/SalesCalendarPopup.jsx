import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  isSameMonth
} from 'date-fns';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SalesCalendarPopup = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'week' | 'month'

  // Fetch sales data when month changes or popup opens
  useEffect(() => {
    if (isOpen && user) {
      fetchSalesData();
    }
  }, [isOpen, currentDate, user]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // Fetch data for current month + previous month (for trends)
      const start = startOfMonth(subMonths(currentDate, 1));
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('point_of_sale_sales')
        .select('id, total_amount, created_at, status')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;
      setSalesData(data || []);
    } catch (error) {
      console.error('Error fetching calendar sales:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get stats for a specific date range
  const getStatsForRange = (startDate, endDate) => {
    const rangeSales = salesData.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    const totalSales = rangeSales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
    const totalOrders = rangeSales.length;
    return { totalSales, totalOrders };
  };

  // Derived Statistics based on View Mode
  const stats = useMemo(() => {
    let currentStart, currentEnd, prevStart, prevEnd;

    if (viewMode === 'week') {
      currentStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      currentEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      prevStart = subWeeks(currentStart, 1);
      prevEnd = subWeeks(currentEnd, 1);
    } else {
      currentStart = startOfMonth(selectedDate);
      currentEnd = endOfMonth(selectedDate);
      prevStart = subMonths(currentStart, 1);
      prevEnd = subMonths(currentEnd, 1);
    }

    const current = getStatsForRange(currentStart, currentEnd);
    const previous = getStatsForRange(prevStart, prevEnd);

    // Selected Day Stats
    const dayStart = new Date(selectedDate); 
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23,59,59,999);
    const selectedDayStats = getStatsForRange(dayStart, dayEnd);

    const percentChange = previous.totalSales === 0 
      ? 100 
      : ((current.totalSales - previous.totalSales) / previous.totalSales) * 100;

    return {
      currentPeriod: current,
      previousPeriod: previous,
      selectedDay: selectedDayStats,
      percentChange,
      periodLabel: viewMode === 'week' ? 'This Week' : 'This Month'
    };
  }, [salesData, selectedDate, viewMode]);

  // Calendar Generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start week on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const getDailyTotal = (date) => {
    return salesData
      .filter(sale => isSameDay(new Date(sale.created_at), date))
      .reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col",
            // Layout dimensions
            "w-full max-w-lg md:max-w-4xl",
            "max-h-[90vh] md:max-h-[85vh]",
            "rounded-2xl md:rounded-3xl"
          )}
        >
          {/* Fixed Header */}
          <div className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
             <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    Sales Calendar
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {format(currentDate, 'MMMM yyyy')}
                  </p>
                </div>
             </div>
             <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
             </Button>
          </div>

          {/* Scrollable Content Area */}
          {/* Mobile: Scrollable column. Desktop: Flex row where panels handle their own scrolling or fit */}
          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
            
            {/* Calendar Section */}
            <div className="flex-1 p-4 md:p-6 flex flex-col md:overflow-y-auto order-1">
              
              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 shrink-0">
                {/* Month Nav */}
                <div className="flex items-center gap-2 w-full sm:w-auto bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex-1 text-center text-sm font-semibold w-24">
                     {format(currentDate, 'MMM yyyy')}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* View Toggles */}
                <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
                  {['month', 'week'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        "flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-all text-center",
                        viewMode === mode 
                          ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                  <div key={day} className="bg-slate-50 dark:bg-slate-800 py-2 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase">
                    {day}
                  </div>
                ))}
                
                {loading ? (
                  Array(35).fill(0).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 h-16 md:h-24 p-1 md:p-2 animate-pulse">
                      <div className="h-3 w-3 bg-slate-100 dark:bg-slate-800 rounded mb-1"></div>
                    </div>
                  ))
                ) : (
                  calendarDays.map((day, idx) => {
                    const dailyTotal = getDailyTotal(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());
                    const hasSales = dailyTotal > 0;

                    return (
                      <div
                        key={day.toString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "bg-white dark:bg-slate-900 h-16 md:h-24 p-1 md:p-2 cursor-pointer transition-all relative group hover:bg-blue-50 dark:hover:bg-blue-900/10 flex flex-col justify-between",
                          !isCurrentMonth && "bg-slate-50/80 dark:bg-slate-900/30",
                          isSelected && "ring-2 ring-inset ring-blue-500 z-10 bg-blue-50/50 dark:bg-blue-900/20"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <span className={cn(
                            "text-[10px] md:text-sm font-medium w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full",
                            isToday 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : !isCurrentMonth 
                                ? "text-slate-300 dark:text-slate-600" 
                                : "text-slate-700 dark:text-slate-300"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {hasSales && (
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 md:hidden"></div>
                          )}
                        </div>
                        
                        {hasSales && (
                          <div className="text-[10px] md:text-xs font-bold text-green-600 dark:text-green-400 truncate w-full text-right md:text-left leading-tight">
                            {formatPrice(dailyTotal, { notation: 'compact' })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Summary Section - Below on mobile, Sidebar on desktop */}
            <div className="w-full md:w-80 bg-white dark:bg-slate-900 p-4 md:p-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shrink-0 md:overflow-y-auto order-2">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4 hidden md:block">
                Performance
              </h3>

              {/* Selected Date Stats */}
              <Card className="p-4 mb-6 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-none">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {format(selectedDate, 'EEE, MMM do')}
                  </p>
                  {isSameDay(selectedDate, new Date()) && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                      TODAY
                    </span>
                  )}
                </div>
                
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                    {formatPrice(stats.selectedDay.totalSales)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium">{stats.selectedDay.totalOrders} Orders</span>
                </div>
              </Card>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {stats.periodLabel} Overview
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] text-slate-500 mb-1 font-medium">TOTAL REVENUE</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                      {formatPrice(stats.currentPeriod.totalSales, { notation: 'compact' })}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] text-slate-500 mb-1 font-medium">TOTAL ORDERS</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                      {stats.currentPeriod.totalOrders}
                    </p>
                  </div>
                </div>

                {/* Comparison Card */}
                <div className={cn(
                  "p-3 rounded-xl flex items-center gap-3 border",
                  stats.percentChange >= 0 
                    ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30" 
                    : "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
                )}>
                  <div className={cn(
                    "p-2 rounded-full shrink-0",
                    stats.percentChange >= 0 ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"
                  )}>
                    {stats.percentChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      vs Previous {viewMode === 'week' ? 'Week' : 'Month'}
                    </p>
                    <p className={cn(
                      "font-bold text-sm",
                      stats.percentChange >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                    )}>
                      {Math.abs(stats.percentChange).toFixed(1)}% {stats.percentChange >= 0 ? 'Up' : 'Down'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SalesCalendarPopup;