import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Package, Clock, MapPin, Navigation, Filter, Calendar as CalendarIcon, X, Star } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, formatDateToDDMMYYYY, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import ReviewDialog from '@/components/reviews/ReviewDialog';
import StarRating from '@/components/reviews/StarRating';

const MyDeliveriesPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(undefined);

  const fetchBookings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('delivery_bookings')
      .select('*, pickup_shop:pickup_shop_id(business_name), rider:rider_id(business_name, phone), reviews(id, rating)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error) {
        setBookings(data || []);
        setFilteredBookings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  useEffect(() => {
    let result = bookings;

    if (statusFilter !== 'all') {
        result = result.filter(b => b.status === statusFilter);
    }

    if (dateFilter) {
        const selectedDateStr = format(dateFilter, 'yyyy-MM-dd');
        result = result.filter(b => b.created_at.startsWith(selectedDateStr));
    }

    setFilteredBookings(result);
  }, [statusFilter, dateFilter, bookings]);

  const clearFilters = () => {
      setStatusFilter('all');
      setDateFilter(undefined);
  };

  const BookingItem = ({ booking }) => {
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const existingReview = booking.reviews && booking.reviews.length > 0 ? booking.reviews[0] : null;

    return (
      <Card className="mb-4 hover:shadow-md transition-shadow border-slate-200">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(booking.status)}>
                      {booking.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <span className="text-xs text-slate-400">{formatDateToDDMMYYYY(booking.created_at)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Order ID: {booking.id.slice(0, 8)}</p>
            </div>
            <p className="font-bold text-lg text-blue-600">{formatPrice(booking.fare_amount)}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Pickup Details */}
            <div className="flex gap-3 relative">
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 md:hidden"></div>
              <div className="mt-1 z-10 bg-white"><MapPin className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Pickup Shop</p>
                <p className="font-semibold text-slate-800">{booking.pickup_shop?.business_name}</p>
                <p className="text-sm text-slate-600">{booking.pickup_address}</p>
              </div>
            </div>

            {/* Drop Details */}
            <div className="flex gap-3">
              <div className="mt-1"><Navigation className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Drop Location</p>
                <p className="font-semibold text-slate-800">{booking.recipient_name}</p>
                <p className="text-sm text-slate-600">{booking.drop_address}</p>
                <p className="text-xs text-slate-500 mt-1">Phone: {booking.recipient_phone}</p>
              </div>
            </div>
          </div>

          {/* Package & Rider Info */}
          <div className="mt-4 pt-4 border-t grid md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                  <Package className="w-8 h-8 text-slate-400 p-1.5 bg-white rounded shadow-sm" />
                  <div>
                      <p className="text-xs text-slate-500">Package Details</p>
                      <p className="text-sm font-medium">{booking.package_type || 'Package'} ({booking.package_weight} kg)</p>
                      {booking.notes && <p className="text-xs text-slate-500 italic">"{booking.notes}"</p>}
                  </div>
              </div>

              {booking.rider ? (
                  <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3 border border-blue-100 justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-1.5 rounded-full"><Clock className="w-5 h-5 text-blue-700" /></div>
                        <div>
                            <p className="text-xs text-slate-500">Rider Assigned</p>
                            <p className="font-bold text-slate-800">{booking.rider.business_name || 'Delivery Partner'}</p>
                            <p className="text-xs text-slate-600">{booking.rider.phone}</p>
                        </div>
                      </div>
                      
                      {booking.status === 'delivered' && (
                          existingReview ? (
                              <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Your Rating</span>
                                  <StarRating rating={existingReview.rating} size="sm" readOnly />
                              </div>
                          ) : (
                              <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="bg-white hover:bg-blue-100 text-blue-700 h-8 text-xs border-blue-200"
                                  onClick={() => setIsReviewOpen(true)}
                              >
                                  <Star className="w-3 h-3 mr-1" /> Rate Rider
                              </Button>
                          )
                      )}
                  </div>
              ) : booking.status === 'open' ? (
                  <div className="flex items-center justify-center p-3 bg-amber-50 rounded-lg text-amber-700 text-sm font-medium">
                      <span className="animate-pulse">Looking for nearby riders...</span>
                  </div>
              ) : null}
          </div>

          {booking.rider && (
            <ReviewDialog 
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                targetId={booking.rider_id}
                targetName={booking.rider?.business_name || "Delivery Rider"}
                bookingId={booking.id}
                type="rider"
                onReviewSubmitted={fetchBookings}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Helmet><title>My Deliveries - B2B Nexus</title></Helmet>
      <h1 className="text-3xl font-bold mb-6 gradient-text">My Deliveries</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-end md:items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">Filter By:</span>
        </div>
        
        <div className="flex-1 w-full md:w-auto flex flex-col md:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={`w-full md:w-[200px] justify-start text-left font-normal ${!dateFilter && "text-muted-foreground"}`}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter ? format(dateFilter, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={dateFilter}
                        onSelect={setDateFilter}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {(statusFilter !== 'all' || dateFilter) && (
                <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
      </div>

      {loading ? (
          <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500">Loading deliveries...</p>
          </div>
      ) : filteredBookings.length > 0 ? (
          filteredBookings.map(b => <BookingItem key={b.id} booking={b} />)
      ) : (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No bookings found</h3>
              <p className="text-slate-500 mb-6">Try adjusting filters or create a new booking.</p>
              {statusFilter === 'all' && !dateFilter && (
                  <Button variant="default" onClick={() => window.location.href='/delivery/book'}>Book New Delivery</Button>
              )}
          </div>
      )}
    </div>
  );
};

export default MyDeliveriesPage;