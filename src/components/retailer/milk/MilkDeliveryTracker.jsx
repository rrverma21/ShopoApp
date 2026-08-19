import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, isToday } from 'date-fns';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from '@/components/ui/use-toast';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Check, 
  MoreHorizontal, 
  UserPlus,
  Loader2,
  AlertCircle,
  Ban,
  ChevronsUpDown,
  RefreshCw,
  MapPin,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MilkDeliveryTracker = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deliveryLogs, setDeliveryLogs] = useState({});
  const [stats, setStats] = useState({ total_delivered: 0, total_skipped: 0, pending: 0 });
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [posCustomers, setPosCustomers] = useState([]);
  
  // Combobox state
  const [openCombobox, setOpenCombobox] = useState(false);
  
  // New Customer Form State
  const [newCustomerForm, setNewCustomerForm] = useState({
    customer_id: '',
    default_quantity: 1,
    unit: 'L',
    price_per_unit: 60,
    delivery_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    billing_cycle: 'monthly'
  });

  const [cancelSubOpen, setCancelSubOpen] = useState(false);
  const [customerToCancel, setCustomerToCancel] = useState(null);
  const [canceling, setCanceling] = useState(false);

  // Realtime subscription reference
  const realtimeSubscription = useRef(null);

  useEffect(() => {
    if (user) {
      fetchCustomers();
      fetchPosCustomers();

      // Subscribe to changes in customer details
      realtimeSubscription.current = supabase
        .channel('milk-tracker-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'point_of_sale_customers',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // When customer details change, refresh the list immediately
            console.log("Customer update detected, refreshing tracker...");
            fetchCustomers();
            fetchPosCustomers();
          }
        )
        .subscribe();
    }

    return () => {
      if (realtimeSubscription.current) {
        supabase.removeChannel(realtimeSubscription.current);
      }
    };
  }, [user, selectedDate]);

  useEffect(() => {
    if (customers.length > 0) {
      const filtered = customers.filter(c => 
        c.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer?.phone?.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
        setFilteredCustomers([]);
    }
  }, [searchTerm, customers]);

  const fetchPosCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('point_of_sale_customers')
        .select('id, name, phone')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setPosCustomers(data || []);
    } catch (error) {
      console.error('Error fetching POS customers:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Active Subscriptions with joined customer details
      // We use !inner to ensure we only get profiles with valid customer records
      // We explicitly alias the relation to 'customer' for clarity
      const { data: subsData, error: subsError } = await supabase
        .from('milk_customer_profiles')
        .select(`
          *,
          customer:point_of_sale_customers!inner(id, name, phone, address)
        `)
        .eq('retailer_id', user.id)
        .eq('is_active', true);

      if (subsError) throw subsError;

      // 2. Fetch Logs for Selected Date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: logsData, error: logsError } = await supabase
        .from('milk_delivery_logs')
        .select('*')
        .eq('retailer_id', user.id)
        .eq('delivery_date', dateStr);

      if (logsError) throw logsError;

      // 3. Fetch Skip Requests
      const { data: skipsData, error: skipsError } = await supabase
        .from('milk_skip_requests')
        .select('*')
        .eq('retailer_id', user.id)
        .eq('skip_date', dateStr);

      if (skipsError) throw skipsError;

      // Process Logs into a Map for easy lookup
      const logsMap = {};
      logsData?.forEach(log => {
        logsMap[log.customer_id] = log;
      });
      setDeliveryLogs(logsMap);

      // Map skips
      const skipsMap = {};
      skipsData?.forEach(skip => {
        skipsMap[skip.customer_id] = skip;
      });

      // Combine Data
      const processedCustomers = subsData.map(sub => {
        const existingLog = logsMap[sub.customer_id];
        const skipRequest = skipsMap[sub.customer_id];
        
        // Determine status for today
        let status = 'pending';
        if (existingLog) status = existingLog.status;
        else if (skipRequest) status = 'skipped_requested';

        return {
          ...sub,
          today_status: status,
          today_quantity: existingLog ? existingLog.quantity : sub.default_quantity,
          log_id: existingLog?.id,
          skip_reason: skipRequest?.reason,
          // Flatten customer details for easier access
          customer_name: sub.customer?.name || 'Unknown Customer',
          customer_phone: sub.customer?.phone || '',
          customer_address: sub.customer?.address || ''
        };
      });

      setCustomers(processedCustomers);
      
      // Re-apply filter if needed, otherwise set to all
      if(searchTerm === '') {
          setFilteredCustomers(processedCustomers);
      } else {
          const filtered = processedCustomers.filter(c => 
            c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.customer_phone.includes(searchTerm)
          );
          setFilteredCustomers(filtered);
      }

      // Calculate Stats
      const statsCount = {
        total_delivered: logsData?.filter(l => l.status === 'delivered').length || 0,
        total_skipped: logsData?.filter(l => l.status === 'skipped').length || 0,
        pending: processedCustomers.length - (logsData?.length || 0)
      };
      setStats(statsCount);

    } catch (error) {
      console.error('Error fetching milk data:', error);
      toast({ variant: "destructive", title: "Error loading data", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (customer, newStatus) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // If log exists, update it
      if (customer.log_id) {
        const { error } = await supabase
          .from('milk_delivery_logs')
          .update({ 
            status: newStatus,
            quantity: newStatus === 'delivered' ? customer.default_quantity : 0,
            amount: newStatus === 'delivered' ? (customer.default_quantity * customer.price_per_unit) : 0
          })
          .eq('id', customer.log_id);
          
        if (error) throw error;
      } else {
        // Create new log
        const { error } = await supabase
          .from('milk_delivery_logs')
          .insert({
            retailer_id: user.id,
            customer_id: customer.customer_id,
            delivery_date: dateStr,
            status: newStatus,
            quantity: newStatus === 'delivered' ? customer.default_quantity : 0,
            unit: customer.unit,
            amount: newStatus === 'delivered' ? (customer.default_quantity * customer.price_per_unit) : 0,
            is_adhoc: false
          });

        if (error) throw error;
      }

      // Optimistic update
      fetchCustomers(); 
      toast({ title: `Marked as ${newStatus}` });

    } catch (error) {
      console.error('Error updating status:', error);
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    }
  };

  const handleAddCustomer = async () => {
    try {
        if (!newCustomerForm.customer_id) {
            toast({ variant: "destructive", title: "Select a customer" });
            return;
        }

        // Use upsert to handle potential duplicates (reactivate or update existing)
        const { error } = await supabase
            .from('milk_customer_profiles')
            .upsert({
                retailer_id: user.id,
                customer_id: newCustomerForm.customer_id,
                default_quantity: newCustomerForm.default_quantity,
                unit: newCustomerForm.unit,
                price_per_unit: newCustomerForm.price_per_unit,
                delivery_days: newCustomerForm.delivery_days,
                billing_cycle: newCustomerForm.billing_cycle,
                is_active: true
            }, { onConflict: 'retailer_id, customer_id' });

        if (error) throw error;

        toast({ title: "Subscription saved successfully!" });
        setIsAddCustomerOpen(false);
        fetchCustomers();
        // Reset form
        setNewCustomerForm({
            customer_id: '',
            default_quantity: 1,
            unit: 'L',
            price_per_unit: 60,
            delivery_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            billing_cycle: 'monthly'
        });

    } catch (error) {
        console.error('Error adding subscription:', error);
        toast({ variant: "destructive", title: "Failed to save subscription", description: error.message });
    }
  };

  const initiateCancelSubscription = (customer) => {
    setCustomerToCancel(customer);
    setCancelSubOpen(true);
  };

  const handleConfirmCancelSubscription = async () => {
    if (!customerToCancel) return;
    setCanceling(true);
    try {
        const { error } = await supabase
            .from('milk_customer_profiles')
            .update({ is_active: false })
            .eq('id', customerToCancel.id);

        if (error) throw error;

        toast({ title: "Subscription Cancelled", description: `Subscription for ${customerToCancel.customer_name} has been cancelled.` });
        setCancelSubOpen(false);
        setCustomerToCancel(null);
        fetchCustomers(); // Refresh list to remove cancelled item
    } catch (error) {
        console.error('Error canceling subscription:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to cancel subscription." });
    } finally {
        setCanceling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Milk Delivery Tracker</h2>
           <p className="text-slate-500">Manage daily milk deliveries and customer subscriptions</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => { fetchCustomers(); fetchPosCustomers(); }}>
               <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
           </Button>
           <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
             <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <UserPlus className="h-4 w-4 mr-2" /> New Subscription
                </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Milk Subscription</DialogTitle>
                    <DialogDescription>Create a new daily milk delivery schedule for a customer.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Customer</Label>
                        {/* Added modal={true} to fix typing in dialog */}
                        <Popover modal={true} open={openCombobox} onOpenChange={setOpenCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openCombobox}
                              className="w-full justify-between"
                            >
                              {newCustomerForm.customer_id
                                ? posCustomers.find((c) => c.id === newCustomerForm.customer_id)?.name
                                : "Select customer..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[450px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search by name or phone..." />
                              <CommandList>
                                <CommandEmpty>No customer found.</CommandEmpty>
                                <CommandGroup>
                                  {posCustomers.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={customer.name + " " + customer.phone}
                                      onSelect={() => {
                                        setNewCustomerForm({...newCustomerForm, customer_id: customer.id});
                                        setOpenCombobox(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          newCustomerForm.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {customer.name} ({customer.phone})
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {posCustomers.length === 0 && (
                            <p className="text-xs text-amber-600">No customers found. Add them in POS Customers first.</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Daily Quantity</Label>
                            <Input 
                                type="number" 
                                value={newCustomerForm.default_quantity}
                                onChange={(e) => setNewCustomerForm({...newCustomerForm, default_quantity: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit</Label>
                            <Select 
                                value={newCustomerForm.unit} 
                                onValueChange={(val) => setNewCustomerForm({...newCustomerForm, unit: val})}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="L">Liters (L)</SelectItem>
                                    <SelectItem value="ML">Milliliters (ML)</SelectItem>
                                    <SelectItem value="Pkt">Packet (Pkt)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Price Per Unit (₹)</Label>
                        <Input 
                            type="number" 
                            value={newCustomerForm.price_per_unit}
                            onChange={(e) => setNewCustomerForm({...newCustomerForm, price_per_unit: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                         <Label>Billing Cycle</Label>
                         <Select 
                            value={newCustomerForm.billing_cycle}
                            onValueChange={(val) => setNewCustomerForm({...newCustomerForm, billing_cycle: val})}
                         >
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="monthly">Monthly (Prepaid)</SelectItem>
                                 <SelectItem value="postpaid">Monthly (Postpaid)</SelectItem>
                             </SelectContent>
                         </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddCustomerOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddCustomer}>Create Subscription</Button>
                </DialogFooter>
             </DialogContent>
           </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center">
                <span className="text-sm text-slate-500 font-medium">Delivered Today</span>
                <span className="text-2xl font-bold text-green-600">{stats.total_delivered}</span>
            </CardContent>
         </Card>
         <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center">
                <span className="text-sm text-slate-500 font-medium">Pending Delivery</span>
                <span className="text-2xl font-bold text-blue-600">{stats.pending}</span>
            </CardContent>
         </Card>
         <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center">
                <span className="text-sm text-slate-500 font-medium">Skipped/Hold</span>
                <span className="text-2xl font-bold text-amber-600">{stats.total_skipped}</span>
            </CardContent>
         </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
         <div className="flex items-center gap-2 w-full sm:w-auto">
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                    />
                </PopoverContent>
             </Popover>
             {isToday(selectedDate) && <Badge variant="secondary" className="bg-green-100 text-green-700">Today</Badge>}
         </div>
         <div className="relative w-full sm:w-64">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
             <Input 
                placeholder="Search customer..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
         </div>
      </div>

      <Card>
        <CardContent className="p-0">
           <Table>
              <TableHeader>
                 <TableRow>
                    <TableHead>Customer Details</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {loading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <div className="flex justify-center items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                <span className="text-slate-500">Loading deliveries...</span>
                            </div>
                        </TableCell>
                    </TableRow>
                 ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                            No active subscriptions found for this view.
                        </TableCell>
                    </TableRow>
                 ) : (
                    filteredCustomers.map(sub => (
                        <TableRow key={sub.id} className={sub.today_status === 'delivered' ? 'bg-green-50/50' : ''}>
                           <TableCell>
                              <div className="flex flex-col gap-1">
                                 <div className="font-semibold text-slate-900 text-base">
                                     {sub.customer_name}
                                 </div>
                                 <div className="flex items-center gap-2 text-sm text-slate-600">
                                     <Phone className="h-3 w-3" /> {sub.customer_phone || 'No phone'}
                                 </div>
                                 {sub.customer_address && (
                                     <div className="flex items-start gap-2 text-xs text-slate-500 mt-0.5 max-w-[200px] truncate" title={sub.customer_address}>
                                         <MapPin className="h-3 w-3 shrink-0" /> {sub.customer_address}
                                     </div>
                                 )}
                                 
                                 {sub.skip_reason && sub.today_status === 'skipped_requested' && (
                                     <div className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-medium bg-amber-50 p-1 rounded w-fit">
                                         <AlertCircle className="h-3 w-3" /> Note: {sub.skip_reason}
                                     </div>
                                 )}
                              </div>
                           </TableCell>
                           <TableCell>
                              <div className="font-bold text-lg">{sub.default_quantity} <span className="text-xs font-normal text-slate-500">{sub.unit}</span></div>
                           </TableCell>
                           <TableCell>
                              {sub.today_status === 'delivered' && <Badge className="bg-green-600 hover:bg-green-700">Delivered</Badge>}
                              {sub.today_status === 'skipped' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">Skipped</Badge>}
                              {sub.today_status === 'undelivered' && <Badge variant="destructive">Failed</Badge>}
                              {sub.today_status === 'pending' && <Badge variant="outline" className="text-slate-500">Pending</Badge>}
                              {sub.today_status === 'skipped_requested' && <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Skip Requested</Badge>}
                           </TableCell>
                           <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                  {sub.today_status !== 'delivered' && (
                                      <Button 
                                        size="sm" 
                                        className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700 rounded-full shadow-sm"
                                        onClick={() => handleStatusUpdate(sub, 'delivered')}
                                        title="Mark as Delivered"
                                      >
                                          <Check className="h-5 w-5 text-white" />
                                      </Button>
                                  )}
                                  {sub.today_status !== 'skipped' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-9 w-9 p-0 rounded-full border-amber-200 hover:bg-amber-50 text-amber-600"
                                        onClick={() => handleStatusUpdate(sub, 'skipped')}
                                        title="Mark as Skipped"
                                      >
                                          <Ban className="h-5 w-5" />
                                      </Button>
                                  )}
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                                              <MoreHorizontal className="h-5 w-5" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Manage Delivery</DropdownMenuLabel>
                                          <DropdownMenuItem onClick={() => handleStatusUpdate(sub, 'delivered')}>
                                              <Check className="w-4 h-4 mr-2 text-green-600" /> Mark Delivered
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStatusUpdate(sub, 'skipped')}>
                                              <Ban className="w-4 h-4 mr-2 text-amber-600" /> Mark Skipped
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStatusUpdate(sub, 'undelivered')}>
                                              <AlertCircle className="w-4 h-4 mr-2 text-red-600" /> Mark Undelivered
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => initiateCancelSubscription(sub)}>
                                              Cancel Subscription
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </div>
                           </TableCell>
                        </TableRow>
                    ))
                 )}
              </TableBody>
           </Table>
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelSubOpen} onOpenChange={setCancelSubOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to cancel the milk subscription for <span className="font-semibold text-slate-900">{customerToCancel?.customer_name}</span>? 
                    This action will stop future deliveries immediately.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Keep Active</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmCancelSubscription} className="bg-red-600 hover:bg-red-700">
                    {canceling ? "Canceling..." : "Yes, Cancel Subscription"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default MilkDeliveryTracker;