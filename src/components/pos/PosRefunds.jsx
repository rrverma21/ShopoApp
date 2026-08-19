import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Calendar as CalendarIcon, Loader2, Eye, XCircle, CheckCircle, Send } from 'lucide-react';

const statusColors = {
  Pending: 'bg-yellow-500',
  Approved: 'bg-blue-500',
  Completed: 'bg-green-500',
  Rejected: 'bg-red-500',
};

const RefundDetailsDialog = ({ refund, isOpen, onClose, onUpdate }) => {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!refund) return null;

  const handleUpdateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('point_of_sale_refunds')
        .update({ status: newStatus, notes: refund.notes ? `${refund.notes}\n${newStatus}: ${note}` : `${newStatus}: ${note}` })
        .eq('id', refund.id)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: `Refund status updated to ${newStatus}.` });
      onUpdate(data);
      setNote('');
    } catch (error) {
      toast({ title: 'Error', description: `Failed to update status: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Refund Details (ID: {refund.id.substring(0, 8)})</DialogTitle>
          <DialogDescription>
            For Sale ID: {refund.point_of_sale_sales.id.substring(0, 8)} on {format(new Date(refund.point_of_sale_sales.created_at), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="font-semibold mb-2">Refund Info</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Amount:</strong> {formatPrice(refund.total_refund_amount)} <span className="text-xs text-muted-foreground">(Inc. Tax)</span></p>
              <p><strong>Status:</strong> <Badge className={`${statusColors[refund.status]} text-white`}>{refund.status}</Badge></p>
              <p><strong>Requested At:</strong> {format(new Date(refund.refunded_at), 'Pp')}</p>
              <p><strong>Customer:</strong> {refund.point_of_sale_sales.customer_phone || 'N/A'}</p>
            </div>
            {refund.notes && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-1">Notes:</h4>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded whitespace-pre-wrap font-sans">{refund.notes}</pre>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Refunded Items</h3>
            <div className="space-y-2">
              {refund.point_of_sale_refund_items.map(item => (
                <div key={item.id} className="text-sm p-2 border rounded-md">
                  <p className="font-medium">{item.point_of_sale_products.name}</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Qty: {item.quantity}</span>
                    <span>{formatPrice(item.refund_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {refund.status !== 'Completed' && refund.status !== 'Rejected' && (
          <DialogFooter className="flex-col sm:flex-row gap-2 items-stretch">
            <Textarea 
              placeholder="Add a note (optional for approve/complete, required for reject)" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-grow"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              {refund.status === 'Pending' && (
                <>
                  <Button onClick={() => handleUpdateStatus('Approved')} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => handleUpdateStatus('Rejected')} disabled={isUpdating || !note}>
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {refund.status === 'Approved' && (
                <Button onClick={() => handleUpdateStatus('Completed')} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">
                  <Send className="mr-2 h-4 w-4" /> Mark as Completed
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PosRefunds = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refunds, setRefunds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedRefund, setSelectedRefund] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchRefunds = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('point_of_sale_refunds')
        .select(`
          *,
          point_of_sale_sales (id, created_at, customer_phone),
          point_of_sale_refund_items (id, quantity, refund_amount, point_of_sale_products (name))
        `)
        .eq('user_id', user.id)
        .order('refunded_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (dateRange.from) {
        query = query.gte('refunded_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        query = query.lte('refunded_at', endOfDay(dateRange.to).toISOString());
      }
      if (debouncedSearchTerm) {
        query = query.or(`point_of_sale_sales.id.ilike.%${debouncedSearchTerm}%,point_of_sale_sales.customer_phone.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRefunds(data);
    } catch (error) {
      toast({ title: 'Error fetching refunds', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, statusFilter, dateRange, debouncedSearchTerm]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleUpdateRefundInList = (updatedRefund) => {
    setRefunds(prev => prev.map(r => r.id === updatedRefund.id ? { ...r, ...updatedRefund } : r));
    setSelectedRefund(prev => prev && prev.id === updatedRefund.id ? { ...prev, ...updatedRefund } : prev);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <Helmet>
          <title>POS Refunds | B2B Nexus</title>
          <meta name="description" content="Manage and track all your Point of Sale refunds." />
        </Helmet>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Refunds</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage and track refund requests.</p>
            </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Refund Management</CardTitle>
            <CardDescription>Review, approve, and track all refund requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Sale ID or Customer Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}`
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.length > 0 ? (
                      refunds.map((refund) => (
                        <TableRow key={refund.id}>
                          <TableCell className="font-mono text-xs">{refund.point_of_sale_sales.id.substring(0, 8)}...</TableCell>
                          <TableCell>{refund.point_of_sale_sales.customer_phone || 'N/A'}</TableCell>
                          <TableCell>{format(new Date(refund.refunded_at), 'PP')}</TableCell>
                          <TableCell className="text-right font-medium">{formatPrice(refund.total_refund_amount)}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[refund.status]} text-white`}>{refund.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRefund(refund)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No refunds found for the selected criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <RefundDetailsDialog
          refund={selectedRefund}
          isOpen={!!selectedRefund}
          onClose={() => setSelectedRefund(null)}
          onUpdate={handleUpdateRefundInList}
        />
      </div>
    </div>
  );
};

export default PosRefunds;