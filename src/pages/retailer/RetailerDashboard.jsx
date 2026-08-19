import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Helmet } from 'react-helmet-async';
import { 
  BarChart3, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  Package, 
  AlertCircle,
  Clock,
  ChevronRight,
  Store,
  CreditCard
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from 'react-router-dom';
import MembershipCard from '@/components/retailer/MembershipCard';
import { toast } from '@/components/ui/use-toast';

// Simplified Stats Card Component
const StatCard = ({ title, value, description, icon: Icon, trend, trendUp }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">
        {trend && (
          <span className={trendUp ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            {trend}
          </span>
        )}
        {" "}{description}
      </p>
    </CardContent>
  </Card>
);

const RetailerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Membership State
  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [membershipError, setMembershipError] = useState(null);

  // Dashboard Stats State
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeProducts: 0,
    totalCustomers: 0
  });

  // Task 1: Fetch Active Membership
  const fetchMembership = async () => {
    if (!user) return;
    
    setMembershipLoading(true);
    setMembershipError(null);
    
    try {
      console.log('Fetching membership for user:', user.id);
      
      // Query user_memberships joined with membership_plans
      // Using maybeSingle() to handle no rows gracefully (PGRST116)
      // Selecting the most recent active membership
      const { data, error } = await supabase
        .from('user_memberships')
        .select(`
          *,
          plan:membership_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        console.log('Membership found:', data);
        setMembership(data);
      } else {
        console.log('No active membership found');
        setMembership(null);
      }
    } catch (err) {
      console.error('Error fetching membership:', err);
      setMembershipError('Could not load membership details.');
      toast({
        title: "Error",
        description: "Failed to load membership information. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setMembershipLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    if (!user) return;
    
    // Placeholder logic for stats - normally this would be real queries
    // Simulating API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setStats({
      totalSales: 12450,
      totalOrders: 45,
      activeProducts: 12,
      totalCustomers: 89
    });
    setLoading(false);
  };

  // Initial Load
  useEffect(() => {
    fetchMembership();
    fetchDashboardStats();
  }, [user]);

  // Task 4: Real-time Membership Updates
  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscription for user_memberships');

    const subscription = supabase
      .channel('membership-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_memberships',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime membership update received:', payload);
          // Refresh data on any change to this user's memberships
          fetchMembership();
          
          toast({
            title: "Membership Updated",
            description: "Your membership status has changed.",
          });
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from membership updates');
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Derived state for header badge
  const activePlanName = membership?.plan?.name || "Free Tier";
  const isPremium = !!membership;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <Helmet>
        <title>Retailer Dashboard - B2B Nexus</title>
      </Helmet>

      {/* Header Section with Membership Badge */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-muted-foreground">
              Overview of your store performance and activity.
            </p>
            {/* Task 3: Header Badge */}
            {!membershipLoading && (
              <Badge variant={isPremium ? "default" : "outline"} className="ml-2">
                {activePlanName} {isPremium ? "Member" : ""}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <Button variant="outline" onClick={() => navigate('/retailer/reports')}>
            Download Reports
          </Button>
          <Button onClick={() => navigate('/retailer/pos')}>
            <Store className="mr-2 h-4 w-4" /> Open POS
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Left Column: Stats & Membership */}
        <div className="col-span-4 lg:col-span-5 space-y-6">
          
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Total Revenue" 
              value={`₹${stats.totalSales.toLocaleString()}`} 
              description="this month"
              trend="+12.5%"
              trendUp={true}
              icon={TrendingUp}
            />
            <StatCard 
              title="Orders" 
              value={stats.totalOrders} 
              description="this month"
              trend="+4.1%"
              trendUp={true}
              icon={ShoppingBag}
            />
            <StatCard 
              title="Active Products" 
              value={stats.activeProducts} 
              description="in catalog"
              icon={Package}
            />
            <StatCard 
              title="Customers" 
              value={stats.totalCustomers} 
              description="total registered"
              icon={Users}
            />
          </div>

          {/* Task 3: Membership Section Integration */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold tracking-tight">Membership Status</h3>
              <Button variant="ghost" size="sm" className="text-sm h-8" onClick={() => navigate('/membership-plans')}>
                View All Plans <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            {/* Task 2: Membership Card Usage */}
            <MembershipCard 
              membership={membership} 
              loading={membershipLoading} 
              error={membershipError}
              onRetry={fetchMembership}
            />
          </div>

          {/* Recent Activity / Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>Monthly revenue performance for current fiscal year.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] flex items-center justify-center bg-slate-50 rounded-md border border-dashed border-slate-200">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>Chart visualization would go here</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Quick Actions & Alerts */}
        <div className="col-span-3 lg:col-span-2 space-y-6">
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/retailer/products/new')}>
                <Package className="mr-2 h-4 w-4" /> Add Product
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/retailer/bills/new')}>
                <CreditCard className="mr-2 h-4 w-4" /> Record Expense
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/retailer/milk/tracker')}>
                <Users className="mr-2 h-4 w-4" /> Milk Tracker
              </Button>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Attention Needed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <div className="h-2 w-2 mt-1.5 rounded-full bg-red-500 shrink-0" />
                <div className="grid gap-0.5">
                  <p className="font-medium">Stock Alert</p>
                  <p className="text-muted-foreground">3 products are running low on stock.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                <div className="grid gap-0.5">
                  <p className="font-medium">Pending Orders</p>
                  <p className="text-muted-foreground">5 new orders need processing.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Bills Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Amul Distributor</p>
                    <p className="text-xs text-muted-foreground">Due Tomorrow</p>
                  </div>
                  <div className="font-medium">₹12,450</div>
                </div>
                 <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Local Bakery</p>
                    <p className="text-xs text-muted-foreground">Due in 3 days</p>
                  </div>
                  <div className="font-medium">₹4,200</div>
                </div>
                <Button variant="link" className="w-full h-auto p-0 text-xs" onClick={() => navigate('/retailer/bills')}>
                  View all bills
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default RetailerDashboard;