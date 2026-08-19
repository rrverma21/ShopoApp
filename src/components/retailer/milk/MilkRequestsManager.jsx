import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Check, X, Loader2, UserPlus, Phone, MapPin, CalendarClock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MilkRequestsManager = ({ userId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchRequests();
    }
  }, [userId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('milk_subscription_requests')
        .select('*')
        .eq('retailer_id', userId)
        .eq('status', 'pending') // Only show pending requests
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription requests.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    setProcessingId(request.id);
    try {
      // 1. Check/Create POS Customer
      let posCustomerId;
      
      const { data: existingCustomer, error: searchError } = await supabase
        .from('point_of_sale_customers')
        .select('id')
        .eq('user_id', userId)
        .eq('phone', request.customer_phone)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingCustomer) {
        posCustomerId = existingCustomer.id;
      } else {
        // Create new POS customer
        const { data: newCustomer, error: createError } = await supabase
          .from('point_of_sale_customers')
          .insert({
            user_id: userId,
            name: request.customer_name,
            phone: request.customer_phone,
            address: request.address,
            loyalty_points: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        posCustomerId = newCustomer.id;
      }

      // 2. Find product price
      let pricePerUnit = 0;
      const { data: product } = await supabase
        .from('retailer_milk_products')
        .select('price')
        .eq('retailer_id', userId)
        .eq('name', request.product_name)
        .maybeSingle();
      
      if (product) pricePerUnit = product.price;

      // 3. Create Milk Profile (Subscription)
      const { error: profileError } = await supabase
        .from('milk_customer_profiles')
        .insert({
          retailer_id: userId,
          customer_id: posCustomerId,
          default_quantity: request.daily_quantity,
          unit: 'L', // Defaulting to Liters
          price_per_unit: pricePerUnit,
          delivery_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // Default to daily
          billing_cycle: 'monthly',
          is_active: true
        });

      if (profileError) throw profileError;

      // 4. Update Request Status
      const { error: updateError } = await supabase
        .from('milk_subscription_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({ title: "Approved", description: "Subscription created successfully." });
      setRequests(requests.filter(r => r.id !== request.id));

    } catch (error) {
      console.error('Approval Error:', error);
      toast({ 
        title: "Approval Failed", 
        description: error.message || "Could not process approval.", 
        variant: "destructive" 
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm("Reject this subscription request?")) return;
    
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('milk_subscription_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: "Rejected", description: "Request has been rejected." });
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Rejection Error:', error);
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card className="border-indigo-100 dark:border-indigo-900/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <UserPlus className="w-5 h-5" />
                <CardTitle>New Subscription Requests</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {requests.length} Pending
            </Badge>
        </div>
        <CardDescription>Review and approve milk delivery requests from online customers.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : requests.length === 0 ? (
          <Alert className="bg-slate-50 border-slate-200 text-slate-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No pending requests at the moment.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
              <div key={request.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                        <h4 className="font-semibold text-base">{request.customer_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                            <Phone className="w-3.5 h-3.5" /> {request.customer_phone}
                        </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {new Date(request.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-2">
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded">
                          <div className="font-medium text-slate-700">Product:</div>
                          <div className="text-slate-900">{request.product_name}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded">
                          <div className="font-medium text-slate-700">Daily Qty:</div>
                          <div className="text-slate-900">{request.daily_quantity} Liters</div>
                      </div>
                  </div>
                  
                  {request.address && (
                      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50/50 p-2 rounded">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{request.address}</span>
                      </div>
                  )}
                </div>

                <div className="flex sm:flex-col gap-2 justify-center sm:w-32 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                    <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(request)}
                        disabled={!!processingId}
                    >
                        {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Approve</>}
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => handleReject(request.id)}
                        disabled={!!processingId}
                    >
                        <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MilkRequestsManager;