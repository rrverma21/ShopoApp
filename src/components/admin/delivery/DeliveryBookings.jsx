import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPrice, getStatusColor, formatDateToDDMMYYYY } from '@/lib/utils';
import { Search, Filter, MapPin } from 'lucide-react';

const DeliveryBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pincodeFilter, setPincodeFilter] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('delivery_bookings')
        .select('*, pickup_shop:pickup_shop_id(business_name, city, pincode), rider:rider_id(contact_person)')
        .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching bookings:", error);
    }

    setBookings(data || []);
    setLoading(false);
  };

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch = b.id.includes(searchTerm) || 
                          b.pickup_shop?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if pincode filter matches either pickup shop pincode or part of drop address
    // Note: drop_address is free text, but usually contains pincode. Simple include check.
    const matchesPincode = pincodeFilter === '' || 
                           (b.pickup_shop?.pincode && b.pickup_shop.pincode.includes(pincodeFilter)) ||
                           (b.drop_address && b.drop_address.includes(pincodeFilter));

    return matchesStatus && matchesSearch && matchesPincode;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Bookings</h1>
        <p className="text-slate-600">Track all delivery requests.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search ID, Shop, Name..." 
                        className="pl-8" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
                <div className="relative w-48">
                    <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Filter Pincode" 
                        className="pl-8" 
                        value={pincodeFilter} 
                        onChange={e => setPincodeFilter(e.target.value)} 
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Booking ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Pickup</TableHead>
                            <TableHead>Drop Details</TableHead>
                            <TableHead>Rider</TableHead>
                            <TableHead className="text-right">Fare</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBookings.map(b => (
                            <TableRow key={b.id}>
                                <TableCell className="font-mono text-xs">{b.id.slice(0,8)}</TableCell>
                                <TableCell>{formatDateToDDMMYYYY(b.created_at)}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{b.pickup_shop?.business_name || 'Unknown'}</div>
                                    <div className="text-xs text-slate-500">{b.pickup_shop?.city || '-'}</div>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                    <div className="font-medium">{b.recipient_name}</div>
                                    <div className="text-xs text-slate-500 truncate" title={b.drop_address}>{b.drop_address}</div>
                                </TableCell>
                                <TableCell>{b.rider?.contact_person || '-'}</TableCell>
                                <TableCell className="text-right font-medium">{formatPrice(b.fare_amount)}</TableCell>
                                <TableCell>
                                    <Badge className={`${getStatusColor(b.status)} border-none`}>{b.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredBookings.length === 0 && (
                            <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No bookings found matching filters.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryBookings;