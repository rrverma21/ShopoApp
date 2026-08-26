import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Store, ArrowUpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import NewSellerRegistrations from './NewSellerRegistrations';
import UpgradeRequestsManagement from './UpgradeRequestsManagement';

const DashboardContent = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const userRole = user?.profile?.role;
  const isSeller = userRole === 'seller';
  const isAdmin = userRole === 'admin';
  const isSellerDisabled = isSeller && user?.profile?.is_disabled;

  const [adminStats, setAdminStats] = useState({
    newSellers: 0,
    pendingUpgrades: 0
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Admin specific stats
      if (isAdmin) {
        // Use the database function to get new sellers count
        const { data: newSellersCount, error: sellersError } = await supabase.rpc('get_new_sellers_count', {
          days_back: 30
        });
        
        if (sellersError) {
          console.error('Error fetching new sellers count:', sellersError);
        }

        const { count: pendingUpgradesCount } = await supabase.from('upgrade_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setAdminStats({
          newSellers: newSellersCount || 0,
          pendingUpgrades: pendingUpgradesCount || 0
        });
      }

    } catch (error) {
      toast({ title: 'Error fetching dashboard data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const OverviewSection = () => (
    <div className="space-y-6 mt-4">
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">New Sellers (30d)</p>
                <h3 className="text-3xl font-bold text-blue-600">{adminStats.newSellers}</h3>
              </div>
              <Store className="w-10 h-10 text-blue-200" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Upgrades</p>
                <h3 className="text-3xl font-bold text-amber-600">{adminStats.pendingUpgrades}</h3>
              </div>
              <ArrowUpCircle className="w-10 h-10 text-amber-200" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2 md:mb-4">{isAdmin ? 'Admin' : 'Seller'} Dashboard</h1>
          <p className="text-slate-600 text-base">{isAdmin ? 'Manage ShopoApp platform operations' : 'Manage your store performance'}</p>
        </div>
      </motion.div>

      {isSellerDisabled && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm flex items-center gap-3"
          role="alert"
        >
          <AlertTriangle className="h-6 w-6" />
          <div>
            <p className="font-bold">Account Disabled</p>
            <p className="text-sm">Your seller account is currently disabled. Please contact support.</p>
          </div>
        </motion.div>
      )}

      {isAdmin ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6 bg-slate-100 dark:bg-slate-800 p-1 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sellers">New Sellers</TabsTrigger>
            <TabsTrigger value="upgrades" className="relative">
              Upgrade Requests
              {adminStats.pendingUpgrades > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-bold">
                  {adminStats.pendingUpgrades}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <OverviewSection />
          </TabsContent>
          <TabsContent value="sellers">
            <NewSellerRegistrations />
          </TabsContent>
          <TabsContent value="upgrades">
            <UpgradeRequestsManagement />
          </TabsContent>
        </Tabs>
      ) : (
        <OverviewSection />
      )}
    </div>
  );
};

export default DashboardContent;
