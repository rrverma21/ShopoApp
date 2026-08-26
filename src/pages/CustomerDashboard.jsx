import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Truck, History, Star, LogOut, Milk, Store, Users } from 'lucide-react';
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
  // Initialize with available data, but fetch latest from DB to ensure sync with Profile updates
  const [userPhone, setUserPhone] = useState(user?.profile?.phone || user?.user_metadata?.phone || user?.phone);
  const [userLocation, setUserLocation] = useState(null); // To store location for nearby logic
  
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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
          
          {/* Digital Shop Orders */}
          <DigitalShopOrdersCard />
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

export default CustomerDashboard;
