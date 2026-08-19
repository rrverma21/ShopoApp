import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CreditCard, Truck, Users, Crown, Printer, ChevronRight, CheckCircle2, XCircle, AlertCircle, Calendar, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { format, isPast, differenceInDays } from 'date-fns';

const MembershipTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [membershipData, setMembershipData] = useState(null);

  useEffect(() => {
    const fetchMembershipData = async () => {
      if (!user?.id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select(`
            membership_plan_id,
            membership_start_date,
            membership_end_date,
            membership_plans (
              id,
              name,
              price,
              duration_days,
              features,
              description,
              max_products,
              max_pos_users
            )
          `)
          .eq('id', user.id)
          .single();

        if (fetchError) throw fetchError;

        setMembershipData(data);
      } catch (err) {
        console.error('Error fetching membership:', err);
        setError(err.message || 'Failed to load membership data');
      } finally {
        setLoading(false);
      }
    };

    fetchMembershipData();
  }, [user?.id]);

  const getMembershipStatus = () => {
    if (!membershipData?.membership_end_date) return { status: 'inactive', label: 'No Active Plan', color: 'bg-gray-100 text-gray-700' };

    const endDate = new Date(membershipData.membership_end_date);
    const isExpired = isPast(endDate);
    const daysLeft = differenceInDays(endDate, new Date());

    if (isExpired) {
      return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-700' };
    }

    if (daysLeft <= 7) {
      return { status: 'expiring', label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700' };
    }

    return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-700' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Membership</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!membershipData?.membership_plan_id || !membershipData?.membership_plans) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-slate-100 rounded-full">
              <Crown className="h-12 w-12 text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Membership</h3>
              <p className="text-slate-500 mb-4">Upgrade to a membership plan to unlock premium features and grow your business.</p>
              <Button onClick={() => navigate('/membership-plans')} className="gap-2">
                <Crown className="h-4 w-4" />
                View Membership Plans
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { membership_plans: plan, membership_start_date, membership_end_date } = membershipData;
  const statusInfo = getMembershipStatus();
  const startDate = membership_start_date ? new Date(membership_start_date) : null;
  const endDate = membership_end_date ? new Date(membership_end_date) : null;
  const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : 0;

  return (
    <div className="space-y-6">
      {/* Membership Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Crown className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description || 'Premium membership plan'}</CardDescription>
              </div>
            </div>
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Membership Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <Calendar className="h-4 w-4" />
                <span>Start Date</span>
              </div>
              <p className="font-semibold text-slate-900">
                {startDate ? format(startDate, 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <Calendar className="h-4 w-4" />
                <span>End Date</span>
              </div>
              <p className="font-semibold text-slate-900">
                {endDate ? format(endDate, 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <Package className="h-4 w-4" />
                <span>Duration</span>
              </div>
              <p className="font-semibold text-slate-900">
                {plan.duration_days} days
              </p>
            </div>
          </div>

          {/* Days Remaining Alert */}
          {statusInfo.status === 'active' && daysRemaining <= 30 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Renewal Reminder</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your membership expires in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. 
                Consider renewing to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}

          {statusInfo.status === 'expired' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Membership Expired</AlertTitle>
              <AlertDescription>
                Your membership has expired. Renew now to regain access to premium features.
              </AlertDescription>
            </Alert>
          )}

          {/* Plan Limits */}
          {(plan.max_products || plan.max_pos_users) && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-900 mb-3">Plan Limits</h4>
              <div className="grid grid-cols-2 gap-4">
                {plan.max_products && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-slate-700">
                      Up to <strong>{plan.max_products}</strong> products
                    </span>
                  </div>
                )}
                {plan.max_pos_users && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-slate-700">
                      Up to <strong>{plan.max_pos_users}</strong> POS users
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features List */}
          {plan.features && plan.features.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-900 mb-3">Plan Features</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => navigate('/membership-plans')} 
              variant="outline"
              className="flex-1"
            >
              View All Plans
            </Button>
            {statusInfo.status !== 'active' && (
              <Button 
                onClick={() => navigate('/membership-plans')} 
                className="flex-1 gap-2"
              >
                <Crown className="h-4 w-4" />
                Renew Membership
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const GeneralTab = () => {
  const navigate = useNavigate();

  const settingsOptions = [
    {
      title: "Payment Settings",
      description: "Configure online payments, gateways, and COD.",
      icon: <CreditCard className="h-6 w-6 text-blue-600" />,
      path: "/pos/payment-settings"
    },
    {
      title: "Employee Management",
      description: "Manage staff accounts, roles, and permissions.",
      icon: <Users className="h-6 w-6 text-purple-600" />,
      path: "/pos/employees"
    },
    {
      title: "Receipt Configuration",
      description: "Customize invoice format, headers, and footers.",
      icon: <Printer className="h-6 w-6 text-gray-600" />,
      path: "/pos/settings/receipts"
    },
    {
      title: "Delivery Settings",
      description: "Manage delivery areas and partner integrations.",
      icon: <Truck className="h-6 w-6 text-amber-600" />,
      path: "/delivery/settings"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {settingsOptions.map((option, idx) => (
        <Card 
          key={idx} 
          className="cursor-pointer hover:shadow-md transition-shadow group" 
          onClick={() => navigate(option.path)}
        >
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
              {option.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1 flex items-center justify-between">
                {option.title}
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-sm text-slate-500">{option.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const PosSettings = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Package className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="membership" className="gap-2">
            <Crown className="h-4 w-4" />
            Membership
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="membership">
          <MembershipTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PosSettings;