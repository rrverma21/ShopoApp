import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShoppingBag, MapPin, Truck, History, Star, CreditCard, LogOut, Package, Milk, Store, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import NearbyDairyShops from '@/components/customer/NearbyDairyShops';
import DigitalShopOrdersCard from '@/components/customer/DigitalShopOrdersCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CustomerDashboard = () => {
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize with available data, but fetch latest from DB to ensure sync with Profile updates
  const [userPhone, setUserPhone] = useState(user?.profile?.phone || user?.user_metadata?.phone || user?.phone);
  const [userLocation, setUserLocation] = useState(null); // To store location for nearby logic
  
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchLatestProfile();
      detectLocation(); // Try to get location for nearby features
    }
  }, [user]);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Location access denied or error:", error);
        }
      );
    }
  };

  const fetchLatestProfile = async () => {
     try {
         const { data, error } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', user.id)
            .single();
         
         if (data?.phone) {
             setUserPhone(data.phone);
         }
     } catch (e) {
         console.error("Error fetching profile phone", e);
     }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          seller:profiles!orders_seller_id_fkey(business_name, contact_person)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const pendingOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const pastOrders = orders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled');

  // Logic to determine display name
  const displayName = user?.profile?.contact_person || user?.profile?.business_name || user?.user_metadata?.full_name || 'Customer';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Welcome, {displayName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
            {userPhone && <p className="text-xs text-slate-400 mt-1">{userPhone}</p>}
          </div>
        </div>
        <Button variant="outline" onClick={handleSignOut} className="shrink-0">
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <ShoppingBag className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{orders.length}</div>
                <div className="text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wider">Total Legacy Orders</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Truck className="h-8 w-8 text-amber-600 dark:text-amber-400 mb-2" />
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingOrders.length}</div>
                <div className="text-xs font-medium text-amber-600 dark:text-amber-300 uppercase tracking-wider">Active Legacy</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800 col-span-2 sm:col-span-1">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <CreditCard className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatPrice(orders.reduce((acc, o) => acc + Number(o.total_amount), 0))}
                </div>
                <div className="text-xs font-medium text-green-600 dark:text-green-300 uppercase tracking-wider">Total Spent</div>
              </CardContent>
            </Card>
          </div>

          {/* New Digital Shop Orders Card */}
          <DigitalShopOrdersCard />

          <Tabs defaultValue="active" className="w-full">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-gray-900">Legacy Orders</h3>
               <TabsList className="grid w-64 grid-cols-2">
                 <TabsTrigger value="active">Active</TabsTrigger>
                 <TabsTrigger value="history">History</TabsTrigger>
               </TabsList>
            </div>
            
            <TabsContent value="active" className="space-y-4">
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No active legacy orders</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {pastOrders.length > 0 ? (
                pastOrders.map(order => (
                  <OrderCard key={order.id} order={order} isHistory />
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <History className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No order history yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Team Access Card */}
          {user.teamMember && (
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" /> Team Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-100 mb-4">
                  You are registered as a team member. Access the seller POS system with your assigned permissions.
                </p>
                <Button 
                  className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                  onClick={() => navigate('/pos/point-of-sale')}
                >
                  <Store className="mr-2 h-4 w-4" /> Access Seller POS
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/local-shops')}>
                <MapPin className="mr-2 h-4 w-4" /> Find Local Shops
              </Button>
              
              {/* Dairy Search Button & Modal */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline">
                    <Milk className="mr-2 h-4 w-4" /> Search Dairy Shops
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nearby Dairy Shops</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <NearbyDairyShops userLocation={userLocation} />
                  </div>
                </DialogContent>
              </Dialog>

              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/delivery/my-bookings')}>
                <Truck className="mr-2 h-4 w-4" /> Track Deliveries
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/my-purchases')}>
                <History className="mr-2 h-4 w-4" /> View Digital Receipts
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold">Pro Customer</h3>
                  <p className="text-xs text-indigo-200">Level 1 Member</p>
                </div>
              </div>
              <p className="text-sm text-indigo-100 mb-4">
                Shop more to unlock exclusive deals and faster delivery priority.
              </p>
              <div className="w-full bg-black/20 rounded-full h-1.5 mb-1">
                <div className="bg-yellow-400 h-1.5 rounded-full w-[35%]"></div>
              </div>
              <p className="text-[10px] text-right text-indigo-200">350 / 1000 pts</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ order, isHistory }) => (
  <Card className="overflow-hidden hover:shadow-md transition-shadow">
    <div className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg">{order.seller?.business_name || 'Unknown Shop'}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              order.status === 'Delivered' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
              order.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' :
              'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
            }`}>
              {order.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">Order #{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(order.total_amount)}</div>
          <div className="text-xs text-slate-500">{order.payment_status}</div>
        </div>
      </div>
      
      {/* Items Preview (collapsed) */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-400 mb-3 border border-slate-100 dark:border-slate-800">
         <p className="line-clamp-1">
            {/* We don't have items joined here typically, but if we did: */}
            View details for item list...
         </p>
      </div>

      <div className="flex gap-3 justify-end">
        {!isHistory && (
           <Button size="sm" variant="outline" className="text-xs">Track Order</Button>
        )}
        <Button size="sm" variant={isHistory ? "outline" : "default"} className="text-xs">
          {isHistory ? "View Receipt" : "View Details"}
        </Button>
      </div>
    </div>
  </Card>
);

export default CustomerDashboard;