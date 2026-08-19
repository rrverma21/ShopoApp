import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Milk, Store, Calendar as CalendarIcon, Ban, Phone, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addDays, 
  startOfToday,
  isBefore
} from "date-fns";

const MilkSubscriptionCard = ({ phone, subscriptionData }) => {
  const [subscription, setSubscription] = useState(subscriptionData || null);
  const [logs, setLogs] = useState([]);
  const [skipRequests, setSkipRequests] = useState([]);
  const [loading, setLoading] = useState(!subscriptionData);
  
  // Calendar View State (Main Calendar)
  const [viewMonth, setViewMonth] = useState(new Date());

  // Skip Request State
  // Initialize with a safe default range (e.g., tomorrow)
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), 1),
    to: addDays(new Date(), 1),
  });
  const [skipReason, setSkipReason] = useState('');
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const fetchLogsAndSkips = useCallback(async (subProfile, monthDate) => {
    if (!subProfile?.customer_id) return;

    try {
      const startDate = startOfMonth(monthDate).toISOString().split('T')[0];
      const endDate = endOfMonth(monthDate).toISOString().split('T')[0];

      // Fetch Delivery Logs
      const { data: logsData, error: logsError } = await supabase
        .from('milk_delivery_logs')
        .select('*')
        .eq('customer_id', subProfile.customer_id)
        .gte('delivery_date', startDate)
        .lte('delivery_date', endDate);

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Fetch Skip Requests
      const { data: skipData, error: skipError } = await supabase
        .from('milk_skip_requests')
        .select('*')
        .eq('customer_id', subProfile.customer_id)
        .gte('skip_date', startDate)
        .lte('skip_date', endDate);
        
      if (skipError) throw skipError;
      setSkipRequests(skipData || []);

    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({ 
        title: "Error loading calendar", 
        description: "Could not fetch delivery history.", 
        variant: "destructive" 
      });
    }
  }, [toast]);

  // Initial Load & Month Change
  useEffect(() => {
    if (subscription) {
      fetchLogsAndSkips(subscription, viewMonth);
    }
  }, [subscription, viewMonth, fetchLogsAndSkips]);

  // Initial Data Fetch (if not provided via props)
  useEffect(() => {
    if (!subscriptionData && phone) {
      const fetchSubscriptionData = async () => {
        try {
            setLoading(true);
            const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
            const phoneFormats = [cleanPhone, `91${cleanPhone}`, `+91${cleanPhone}`];
            const orCondition = phoneFormats.map(p => `phone.eq.${p}`).join(',');

            const { data: posCustomerData } = await supabase
                .from('point_of_sale_customers')
                .select('id')
                .or(orCondition)
                .limit(1)
                .maybeSingle();
            
            if (!posCustomerData) {
                setLoading(false);
                return;
            }

            const { data: subData, error: subError } = await supabase
              .from('milk_customer_profiles')
              .select(`*, retailer:profiles!milk_customer_profiles_retailer_id_fkey(business_name, phone)`)
              .eq('customer_id', posCustomerData.id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();

            if (!subError && subData) {
                setSubscription(subData);
            }
        } catch (error) {
            console.error("Fetch sub error", error);
        } finally {
            setLoading(false);
        }
      }
      fetchSubscriptionData();
    } else if (subscriptionData) {
      setSubscription(subscriptionData);
      setLoading(false);
    }
  }, [subscriptionData, phone]);


  const handleSkipRequest = async () => {
    if (!dateRange?.from) {
      toast({ title: "Date required", description: "Please select a date range.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    // Ensure we have a valid range. If 'to' is undefined, it's a single day range.
    const start = dateRange.from;
    const end = dateRange.to || dateRange.from;
    
    // Generate all dates in the interval
    const datesToSkip = eachDayOfInterval({ start, end });

    try {
      // Prepare bulk insert data
      const requests = datesToSkip.map(date => ({
        customer_id: subscription.customer_id,
        retailer_id: subscription.retailer_id,
        skip_date: format(date, 'yyyy-MM-dd'), // Format as YYYY-MM-DD for DB
        reason: skipReason,
        requested_by: 'customer'
      }));

      // Use upsert to handle duplicate dates gracefully (updates reason if changed)
      const { error } = await supabase
        .from('milk_skip_requests')
        .upsert(requests, { onConflict: 'customer_id, skip_date' });

      if (error) throw error;

      toast({ 
        title: "Requests Sent", 
        description: `Successfully requested to skip ${datesToSkip.length} day(s).` 
      });
      
      setIsSkipDialogOpen(false);
      
      // Reset form
      setDateRange({ from: addDays(new Date(), 1), to: addDays(new Date(), 1) });
      setSkipReason('');
      
      // Refresh calendar view
      fetchLogsAndSkips(subscription, viewMonth);
    } catch (error) {
      console.error('Error sending skip request:', error);
      toast({ 
        title: "Request Failed", 
        description: error.message || "Failed to save skip request.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDayStatus = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    
    // Check Logs (Actual Delivery History)
    const log = logs.find(l => l.delivery_date === dateStr);
    if (log) {
      if (log.status === 'delivered') return 'delivered';
      if (log.status === 'skipped' || log.status === 'undelivered') return 'skipped';
    }

    // Check Skip Requests (Future/Pending)
    const req = skipRequests.find(r => r.skip_date === dateStr);
    if (req) return 'skipped';

    return 'neutral';
  };

  // Styles reused for both calendars to ensure consistency
  const calendarClassNames = {
    month: "space-y-4 w-full",
    caption: "flex justify-center pt-1 relative items-center mb-2",
    caption_label: "text-sm font-medium",
    table: "w-full border-collapse space-y-1",
    head_row: "flex w-full justify-between",
    head_cell: "text-slate-400 rounded-md w-9 font-normal text-[0.8rem] text-center",
    row: "flex w-full mt-2 justify-between",
    cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
    day: cn("h-9 w-9 p-0 font-normal aria-selected:opacity-100 mx-auto rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"),
    day_today: "bg-slate-100 dark:bg-slate-800 font-bold text-blue-600",
    day_selected: "bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50",
    day_range_middle: "aria-selected:bg-slate-100 aria-selected:text-slate-900 dark:aria-selected:bg-slate-800 dark:aria-selected:text-slate-50 rounded-none",
    day_range_start: "aria-selected:bg-slate-900 aria-selected:text-white dark:aria-selected:bg-slate-50 dark:aria-selected:text-slate-900 rounded-l-full rounded-r-none",
    day_range_end: "aria-selected:bg-slate-900 aria-selected:text-white dark:aria-selected:bg-slate-50 dark:aria-selected:text-slate-900 rounded-r-full rounded-l-none",
    // Special case for single day selection in range mode
    day_range_start_end: "rounded-full"
  };

  if (loading) {
    return (
        <Card className="w-full h-40 flex items-center justify-center bg-slate-50 border-dashed">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </Card>
    );
  }

  if (!subscription) return null;

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden mb-6">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-400">
            <Milk className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{subscription.retailer?.business_name}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Store className="w-3 h-3" /> Subscription
            </p>
          </div>
        </div>
        <Badge className={subscription.is_active ? "bg-green-600" : "bg-slate-500"}>
          {subscription.is_active ? "Active" : "Paused"}
        </Badge>
      </div>

      <CardContent className="p-0">
        {/* Changed md:flex-row to lg:flex-row for better responsiveness on tablets */}
        <div className="flex flex-col lg:flex-row">
          
          {/* Main Calendar Section */}
          <div className="p-4 flex-1 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-500" /> Delivery Calendar
              </h4>
              <div className="flex gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div> Delivered
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div> Skipped
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Calendar
                mode="single"
                month={viewMonth}
                onMonthChange={setViewMonth}
                className="p-0 w-full max-w-[320px] mx-auto"
                classNames={calendarClassNames}
                components={{
                  DayContent: ({ date }) => {
                    const status = getDayStatus(date);
                    return (
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        <span className="text-xs leading-none z-10">{date.getDate()}</span>
                        {status !== 'neutral' && (
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full mt-1",
                            status === 'delivered' ? "bg-green-500" : "bg-red-500"
                          )} />
                        )}
                      </div>
                    );
                  }
                }}
              />
            </div>
          </div>

          {/* Actions & Stats Section */}
          <div className="flex-1 p-5 bg-slate-50/30 dark:bg-slate-900/30 flex flex-col gap-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Price/Unit</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{formatPrice(subscription.price_per_unit)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Month Total</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                   {formatPrice(logs.reduce((acc, log) => acc + (Number(log.amount) || 0), 0))}
                </p>
              </div>
            </div>

            {/* Skip Action */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Skip Deliveries</h4>
                <Ban className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Going on vacation? Pause your milk delivery for specific dates.
              </p>
              
              <Dialog open={isSkipDialogOpen} onOpenChange={setIsSkipDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" size="sm">
                    Select Dates to Skip <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Skip Delivery</DialogTitle>
                    <DialogDescription>
                        Select start and end dates. Deliveries will be paused for the selected period.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-2 space-y-4">
                    <div className="flex justify-center border rounded-lg p-3 bg-white dark:bg-slate-950">
                       <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          disabled={(date) => isBefore(date, startOfToday())} // Disable dates before today
                          numberOfMonths={1}
                          initialFocus
                          className="p-0 w-full max-w-[300px]"
                          classNames={calendarClassNames}
                       />
                    </div>
                    
                    {/* Selected Range Display */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Start Date</span>
                            <span className="font-medium">
                                {dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-"}
                            </span>
                        </div>
                        <div className="text-slate-300">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-right">
                             <span className="text-[10px] text-slate-500 uppercase tracking-wider">End Date</span>
                             <span className="font-medium">
                                {dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : (dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-")}
                             </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason" className="text-xs font-semibold uppercase text-slate-500">Reason (Optional)</Label>
                      <Textarea 
                        id="reason" 
                        placeholder="e.g. Out of town vacation" 
                        className="resize-none text-sm" 
                        rows={2}
                        value={skipReason}
                        onChange={(e) => setSkipReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsSkipDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSkipRequest} 
                        disabled={isSubmitting || !dateRange?.from}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Confirm Skip
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Contact */}
            <div className="text-center">
               <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs h-8"
                onClick={() => window.location.href = `tel:${subscription.retailer?.phone}`}
               >
                 <Phone className="w-3 h-3 mr-2" /> Contact {subscription.retailer?.business_name}
               </Button>
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MilkSubscriptionCard;