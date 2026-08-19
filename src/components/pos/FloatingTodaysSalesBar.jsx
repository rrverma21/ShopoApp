import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import SalesCalendarPopup from '@/components/pos/SalesCalendarPopup';
import { startOfDay, endOfDay } from 'date-fns';

const FloatingTodaysSalesBar = () => {
  const [salesData, setSalesData] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Track last total to log meaningful updates and trigger toasts
  const lastTotalRef = useRef(null);
  const initialLoadDone = useRef(false);

  const fetchTodaysSales = useCallback(async (isPolling = false, showToast = false) => {
    if (!user) return;

    try {
      if (!isPolling) setIsLoading(true);
      setError(null);
      
      const logPrefix = isPolling ? '🔄 [Realtime/Poll]' : '⬇️ [Fetch]';
      
      const today = new Date();
      const fromDate = startOfDay(today).toISOString();
      const toDate = endOfDay(today).toISOString();

      // DEBUG TICKET REFERENCE: 
      // The Reports table calculates Net Sales by summing up the 'total_amount' of all sales.
      // This is because when a refund is processed, the 'total_amount' column in 'point_of_sale_sales'
      // is directly reduced by the refunded amount. 
      // Therefore, Net Sales for today = SUM(total_amount) of today's sales.
      // We no longer add refund_amount back just to subtract it again from the refunds table, 
      // as that caused discrepancies if a refund was processed today for a past sale.
      const { data: salesResponse, error: salesError } = await supabase
        .from('point_of_sale_sales') 
        .select('total_amount')
        .eq('user_id', user.id)
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (salesError) throw salesError;

      // Net Sales Calculation aligned exactly with the Reports table logic.
      // 'total_amount' inherently represents the net total (gross minus refunds for that sale).
      const netSales = (salesResponse || []).reduce((sum, order) => {
          return sum + (Number(order.total_amount) || 0);
      }, 0);
      
      // Only update state if data actually changed to prevent render thrashing
      if (netSales !== lastTotalRef.current) {
         console.log(`✅ ${logPrefix} Net Sales updated! New Total: ${netSales} (Prev: ${lastTotalRef.current})`);
         
         // Show toast if this isn't the absolute first load and a change occurred, or if manually requested
         if ((initialLoadDone.current && lastTotalRef.current !== null) || showToast) {
            toast({
              title: "Today's Sales Updated",
              description: `Net sales is now ${formatPrice(netSales)}`,
              duration: 3000,
            });
         }
         
         lastTotalRef.current = netSales;
         setSalesData(netSales);
      } else if (showToast) {
         // Manual refresh but no change
         toast({
            title: "Data is up to date",
            description: `Net sales remains ${formatPrice(netSales)}`,
            duration: 2000,
         });
      }

      initialLoadDone.current = true;

    } catch (err) {
      console.error('❌ FloatingTodaysSalesBar: Error fetching sales:', err);
      if (!isPolling) setError('Failed');
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    // 1. Initial Data Fetch
    fetchTodaysSales(false, false);

    // 2. Realtime Subscription Setup
    // Any refund will UPDATE the point_of_sale_sales table's total_amount, triggering this refresh
    const channel = supabase
      .channel('sales-realtime-tracker')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'point_of_sale_sales', 
          filter: `user_id=eq.${user.id}` 
        },
        () => {
          fetchTodaysSales(true, true); 
        }
      )
      .subscribe();

    // 3. Polling Fallback (Every 30 seconds to catch any missed realtime events)
    const pollInterval = setInterval(() => {
        fetchTodaysSales(true, false);
    }, 30000);

    // Cleanup on Unmount
    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [user, fetchTodaysSales]);

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            "fixed w-auto pointer-events-auto transition-all duration-300",
            // Mobile: Top-4 Centered, Z-50 (Highest Priority)
            "top-4 left-1/2 -translate-x-1/2 z-50", 
            // Desktop: Top-6 Right-6, Z-40 (Normal Priority), Reset centered positioning
            "md:top-6 md:right-6 md:left-auto md:translate-x-0 md:z-40"
          )}
        >
          <Card 
            className={cn(
              "bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer group",
              "p-2 md:p-3" 
            )}
            onClick={() => setIsPopupOpen(true)}
          >
            <div className={cn(
              "flex items-center gap-3 md:gap-4",
              "flex-col md:flex-row"
            )}>
              
              <div className="flex items-center gap-2 md:gap-3">
                <div className={cn(
                  "bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg shadow-green-500/20 group-hover:scale-105 transition-transform flex items-center justify-center",
                  "p-1.5 md:p-2"
                )}>
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </div>
                
                <div className="flex flex-col items-center md:items-start">
                  <p className="hidden md:block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Today's Net Sales
                  </p>
                  
                  {isLoading ? (
                    <Skeleton className="h-5 w-16 md:h-6 md:w-24 mt-1 bg-slate-200 dark:bg-slate-700" />
                  ) : error ? (
                    <span className="text-red-500 text-xs font-medium">Retry</span>
                  ) : (
                    <p className={cn(
                      "font-bold text-slate-900 dark:text-white leading-none mt-0.5",
                      "text-sm md:text-xl",
                      salesData < 0 ? "text-red-500 dark:text-red-400" : ""
                    )}>
                      {formatPrice(salesData)}
                    </p>
                  )}
                </div>
              </div>

              <div className="hidden md:block h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full",
                  "h-6 w-6 md:h-8 md:w-8"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  fetchTodaysSales(false, true); // Manual refresh triggers loading state & toast
                }}
                disabled={isLoading}
                title="Refresh Sales Data"
              >
                <RefreshCw className={cn(
                  "transition-all",
                  isLoading ? 'animate-spin' : '',
                  "h-3 w-3 md:h-4 md:w-4"
                )} />
              </Button>
            </div>
            
            <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-700 mt-1 md:mt-0">
              <motion.div 
                className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <SalesCalendarPopup 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
      />
    </>
  );
};

export default FloatingTodaysSalesBar;