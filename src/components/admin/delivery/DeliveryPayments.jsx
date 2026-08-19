import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDateToDDMMYYYY } from '@/lib/utils';
import { Search, Filter, Calendar } from 'lucide-react';

const DeliveryPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delivery_payments')
      .select('*, booking:booking_id(id, recipient_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const filteredPayments = payments.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = 
      p.booking?.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.booking?.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Delivery Payments</h1>
        <p className="text-slate-600">Track payments received from customers for deliveries.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search Booking ID, Transaction ID..." 
              className="pl-8" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Transaction Ref</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24">Loading payments...</TableCell></TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No payments found.</TableCell></TableRow>
              ) : (
                filteredPayments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateToDDMMYYYY(payment.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.booking?.id?.slice(0, 8)}...</TableCell>
                    <TableCell>{payment.booking?.recipient_name || 'N/A'}</TableCell>
                    <TableCell className="capitalize">{payment.payment_method}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{payment.transaction_id || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.status)} variant="outline">
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryPayments;