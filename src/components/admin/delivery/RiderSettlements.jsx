import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { formatPrice, formatDateToDDMMYYYY } from '@/lib/utils';
import { Search, Filter, Plus, FileCheck } from 'lucide-react';

const RiderSettlements = () => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // New Settlement Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState('');
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    platformChargePercentage: 20 // Default 20%
  });
  const [calculating, setCalculating] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    fetchSettlements();
    fetchRiders();
  }, []);

  const fetchSettlements = async () => {
    setLoading(true);
    // Changed full_name to contact_person to match database schema
    const { data, error } = await supabase
      .from('rider_payment_settlements')
      .select('*, rider:rider_id(contact_person, phone)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching settlements:', error);
      toast({ title: "Error", description: "Failed to fetch settlements", variant: "destructive" });
    } else {
      setSettlements(data || []);
    }
    setLoading(false);
  };

  const fetchRiders = async () => {
    // Changed full_name to contact_person to match database schema
    const { data, error } = await supabase
      .from('profiles')
      .select('id, contact_person')
      .eq('role', 'rider');
    
    if (error) {
      console.error('Error fetching riders:', error);
    } else {
      setRiders(data || []);
    }
  };

  const handleCalculatePreview = async () => {
    if (!selectedRider || !formData.startDate || !formData.endDate) {
      toast({ title: "Error", description: "Please select rider and date range", variant: "destructive" });
      return;
    }

    setCalculating(true);
    try {
      // Fetch completed bookings for this rider within range
      const { data: bookings, error } = await supabase
        .from('delivery_bookings')
        .select('fare_amount')
        .eq('rider_id', selectedRider)
        .eq('status', 'delivered')
        .gte('created_at', new Date(formData.startDate).toISOString())
        .lte('created_at', new Date(formData.endDate).toISOString());

      if (error) throw error;

      const totalEarnings = bookings.reduce((sum, b) => sum + (b.fare_amount || 0), 0);
      const platformCharges = (totalEarnings * formData.platformChargePercentage) / 100;
      const netAmount = totalEarnings - platformCharges;

      setPreviewData({
        totalEarnings,
        platformCharges,
        netAmount,
        bookingCount: bookings.length
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to calculate settlement", variant: "destructive" });
    }
    setCalculating(false);
  };

  const handleCreateSettlement = async () => {
    if (!previewData) return;

    const payload = {
      rider_id: selectedRider,
      start_date: new Date(formData.startDate).toISOString(),
      end_date: new Date(formData.endDate).toISOString(),
      total_earnings: previewData.totalEarnings,
      platform_charges: previewData.platformCharges,
      net_amount: previewData.netAmount,
      status: 'pending'
    };

    const { error } = await supabase.from('rider_payment_settlements').insert(payload);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Settlement created successfully" });
      setIsDialogOpen(false);
      fetchSettlements();
      // Reset form
      setPreviewData(null);
      setSelectedRider('');
      setFormData({ ...formData, startDate: '', endDate: '' });
    }
  };

  const markAsPaid = async (id) => {
    const { error } = await supabase
      .from('rider_payment_settlements')
      .update({ status: 'paid', processed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Settlement marked as paid" });
      fetchSettlements();
    }
  };

  const filteredSettlements = settlements.filter(s => {
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    // Changed full_name to contact_person
    const matchesSearch = s.rider?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Rider Settlements</h1>
          <p className="text-slate-600">Calculate and manage payouts for delivery riders.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Settlement
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search Rider Name..." 
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Created</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
                <TableHead className="text-right">Charges</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center h-24">Loading settlements...</TableCell></TableRow>
              ) : filteredSettlements.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No settlements found.</TableCell></TableRow>
              ) : (
                filteredSettlements.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDateToDDMMYYYY(s.created_at)}</TableCell>
                    {/* Changed full_name to contact_person */}
                    <TableCell className="font-medium">{s.rider?.contact_person || 'Unknown'}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateToDDMMYYYY(s.start_date)} - {formatDateToDDMMYYYY(s.end_date)}
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(s.total_earnings)}</TableCell>
                    <TableCell className="text-right text-red-500">-{formatPrice(s.platform_charges)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatPrice(s.net_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'paid' ? 'default' : 'secondary'} className={s.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status !== 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(s.id)}>
                          <FileCheck className="w-4 h-4 mr-1" /> Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Settlement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rider</Label>
              <Select value={selectedRider} onValueChange={setSelectedRider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Rider" />
                </SelectTrigger>
                <SelectContent>
                  {riders.map(r => (
                    // Changed full_name to contact_person
                    <SelectItem key={r.id} value={r.id}>{r.contact_person}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platform Charge (%)</Label>
              <Input 
                type="number" 
                value={formData.platformChargePercentage} 
                onChange={e => setFormData({...formData, platformChargePercentage: Number(e.target.value)})} 
                min="0" max="100"
              />
            </div>

            <Button onClick={handleCalculatePreview} disabled={calculating} className="w-full" variant="secondary">
              {calculating ? 'Calculating...' : 'Calculate Summary'}
            </Button>

            {previewData && (
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
                <div className="flex justify-between text-sm">
                  <span>Total Earnings ({previewData.bookingCount} orders):</span>
                  <span>{formatPrice(previewData.totalEarnings)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-500">
                  <span>Platform Charges ({formData.platformChargePercentage}%):</span>
                  <span>-{formatPrice(previewData.platformCharges)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Net Payable:</span>
                  <span className="text-green-600">{formatPrice(previewData.netAmount)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSettlement} disabled={!previewData}>Create Settlement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiderSettlements;