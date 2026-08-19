import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Bike, CheckCircle, MapPin, Phone, Package, RefreshCw, History, User, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, calculateDistance } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const RiderDashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('available');
  const [availableRequests, setAvailableRequests] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState(null);

  useEffect(() => {
    if (user?.profile?.latitude) {
      setRiderLocation({ lat: user.profile.latitude, lng: user.profile.longitude });
    }
    fetchData();
    
    const channel = supabase.channel('rider_dashboard_changes')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'delivery_bookings' }, 
        (payload) => {
            fetchData();
        }
      )
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch Available (Open) Requests
    const { data: openData } = await supabase
      .from('delivery_bookings')
      .select('*, pickup_shop:pickup_shop_id(business_name, phone)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    let filteredOpen = openData || [];
    if (riderLocation) {
        filteredOpen = filteredOpen.filter(b => {
            const dist = calculateDistance(riderLocation.lat, riderLocation.lng, b.pickup_lat, b.pickup_lng);
            return dist <= 20; // 20km radius
        });
    }
    setAvailableRequests(filteredOpen);

    // 2. Fetch Active Tasks
    const { data: activeData } = await supabase
      .from('delivery_bookings')
      .select('*, pickup_shop:pickup_shop_id(business_name, phone)')
      .eq('rider_id', user.id)
      .in('status', ['accepted', 'picked_up', 'in_transit'])
      .order('updated_at', { ascending: false });
    
    setActiveTasks(activeData || []);

    // 3. Fetch Completed Tasks
    const { data: completedData } = await supabase
      .from('delivery_bookings')
      .select('*, pickup_shop:pickup_shop_id(business_name, phone)')
      .eq('rider_id', user.id)
      .eq('status', 'delivered')
      .order('updated_at', { ascending: false })
      .limit(20); 
    
    setCompletedTasks(completedData || []);

    setLoading(false);
  };

  const handleAccept = async (bookingId) => {
    const { error } = await supabase
      .from('delivery_bookings')
      .update({ status: 'accepted', rider_id: user.id })
      .eq('id', bookingId);
    
    if (error) {
        toast({ title: "Error", description: "Could not accept booking", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Booking accepted! Moved to Active Tasks." });
      setActiveTab('active');
    }
  };

  const updateStatus = async (bookingId, newStatus) => {
    const { error } = await supabase
      .from('delivery_bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);
      
    if (error) {
        toast({ title: "Update Failed", variant: "destructive" });
    } else {
        toast({ title: "Status Updated", description: `Order marked as ${newStatus.replace('_', ' ')}` });
        if (newStatus === 'delivered') {
            setActiveTab('completed');
        }
    }
  };

  const RequestCard = ({ booking, type }) => {
    const isCompleted = type === 'completed';
    const isActive = type === 'active';
    const isAvailable = type === 'available';

    return (
      <Card className={`mb-4 border-l-4 shadow-sm ${isCompleted ? 'border-l-green-500 opacity-90' : 'border-l-blue-500'}`}>
        <CardContent className="p-5">
          <div className="flex justify-between mb-3 items-start">
            <div>
                 <Badge variant="outline" className="bg-slate-100 mb-1">#{booking.id.slice(0,6)}</Badge>
                 <div className="text-xs text-slate-400">
                    {new Date(booking.created_at).toLocaleString()}
                 </div>
            </div>
            <div className="text-right">
                <span className="font-bold text-green-600 block">{formatPrice(booking.fare_amount)}</span>
                {isCompleted && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none mt-1">Delivered</Badge>}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="mt-1 bg-blue-100 p-1.5 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pickup</p>
                <p className="font-semibold text-sm">{booking.pickup_shop?.business_name}</p>
                <p className="text-sm text-slate-600 leading-snug mt-0.5">{booking.pickup_address}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="mt-1 bg-red-100 p-1.5 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Dropoff</p>
                <p className="font-semibold text-sm">{booking.recipient_name}</p>
                <p className="text-sm text-slate-600 leading-snug mt-0.5">{booking.drop_address}</p>
              </div>
            </div>

            <div className="flex gap-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100">
               <span className="flex items-center gap-1">📏 {booking.distance_km} km</span>
               <span className="flex items-center gap-1">⚖️ {booking.package_weight} kg</span>
               {isActive && (
                   <span className="flex items-center gap-1 font-medium text-blue-600 ml-auto capitalize">
                       Status: {booking.status.replace('_', ' ')}
                   </span>
               )}
            </div>
          </div>
        </CardContent>
        
        {!isCompleted && (
            <CardFooter className="bg-slate-50 p-3 flex justify-end gap-2 border-t border-slate-100">
            {isAvailable ? (
                <Button size="sm" onClick={() => handleAccept(booking.id)} className="w-full bg-blue-600 hover:bg-blue-700 font-semibold shadow-sm">
                    Accept Request
                </Button>
            ) : (
                <div className="w-full flex flex-col gap-2">
                    <div className="flex gap-2">
                        {booking.status === 'accepted' && (
                            <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => updateStatus(booking.id, 'picked_up')}>
                                Confirm Pickup
                            </Button>
                        )}
                        {booking.status === 'picked_up' && (
                            <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => updateStatus(booking.id, 'in_transit')}>
                                Start Delivery
                            </Button>
                        )}
                        {booking.status === 'in_transit' && (
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => updateStatus(booking.id, 'delivered')}>
                                Mark Delivered
                            </Button>
                        )}
                        <a href={`tel:${booking.recipient_phone}`} className="flex items-center justify-center px-4 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 shadow-sm transition-colors">
                            <Phone className="w-4 h-4"/>
                        </a>
                    </div>
                </div>
            )}
            </CardFooter>
        )}
      </Card>
    );
  };

  if (!user || user.profile.role !== 'rider') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md text-center p-8">
                <Bike className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-slate-800">Rider Access Required</h1>
                <p className="text-slate-500 mt-2">Please sign in with a rider account to access the dashboard.</p>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <Helmet><title>Rider Dashboard - B2B Nexus</title></Helmet>
      
      {/* Top Header Section */}
      <div className="bg-slate-900 text-white p-6 pb-20 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <Bike className="text-green-400" /> Rider Dashboard
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${user.profile.is_disabled ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        {user.profile.is_disabled ? 'Offline' : 'Online & Active'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white hover:bg-white/10"
                        onClick={fetchData}
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>
            
            {/* Quick Stats / Action Buttons */}
            <div className="flex gap-3 mt-4">
                <Button 
                    variant="secondary" 
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                    onClick={() => navigate('/rider/earnings')}
                >
                    <Wallet className="w-4 h-4 mr-2 text-green-400" /> Earnings
                </Button>
                <Button 
                    variant="secondary" 
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                    onClick={() => navigate('/rider/profile')}
                >
                    <User className="w-4 h-4 mr-2 text-blue-400" /> Profile
                </Button>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-12 relative z-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-14 shadow-lg bg-white rounded-xl p-1 border border-slate-100">
            <TabsTrigger 
                value="available" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-lg flex flex-col items-center justify-center py-1 gap-0.5"
            >
               <span className="font-bold text-lg leading-none">{availableRequests.length}</span>
               <span className="text-[10px] uppercase font-bold opacity-70">New</span>
            </TabsTrigger>
            <TabsTrigger 
                value="active" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-lg flex flex-col items-center justify-center py-1 gap-0.5"
            >
               <span className="font-bold text-lg leading-none">{activeTasks.length}</span>
               <span className="text-[10px] uppercase font-bold opacity-70">Active</span>
            </TabsTrigger>
            <TabsTrigger 
                value="completed" 
                className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 rounded-lg flex flex-col items-center justify-center py-1 gap-0.5"
            >
               <span className="font-bold text-lg leading-none">{completedTasks.length}</span>
               <span className="text-[10px] uppercase font-bold opacity-70">Done</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-6 space-y-4">
             {loading && availableRequests.length === 0 ? (
                 <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-slate-400"/></div>
             ) : availableRequests.length > 0 ? (
                 availableRequests.map(b => <RequestCard key={b.id} booking={b} type="available" />)
             ) : (
                 <div className="text-center py-16 px-4 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-50" />
                    <p>No new requests in your area right now.</p>
                 </div>
             )}
          </TabsContent>

          <TabsContent value="active" className="mt-6 space-y-4">
             {activeTasks.length > 0 ? (
                 activeTasks.map(b => <RequestCard key={b.id} booking={b} type="active" />)
             ) : (
                 <div className="text-center py-16 px-4 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                    <Bike className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-50" />
                    <p>No active deliveries. Pick a request from the New tab!</p>
                 </div>
             )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6 space-y-4">
             {completedTasks.length > 0 ? (
                 completedTasks.map(b => <RequestCard key={b.id} booking={b} type="completed" />)
             ) : (
                 <div className="text-center py-16 px-4 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                    <History className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-50" />
                    <p>No completed deliveries yet.</p>
                 </div>
             )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RiderDashboardPage;