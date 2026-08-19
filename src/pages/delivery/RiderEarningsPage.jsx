import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, formatDateToDDMMYYYY } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet, TrendingUp, History, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RiderEarningsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEarnings: 0,
        totalSettled: 0,
        pendingAmount: 0,
        platformCharges: 0
    });
    const [bookings, setBookings] = useState([]);
    const [settlements, setSettlements] = useState([]);

    useEffect(() => {
        if (user) {
            fetchEarningsData();
        }
    }, [user]);

    const fetchEarningsData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all delivered bookings for earnings calculation
            const { data: bookingData, error: bookingError } = await supabase
                .from('delivery_bookings')
                .select('id, fare_amount, created_at, pickup_address, drop_address, distance_km')
                .eq('rider_id', user.id)
                .eq('status', 'delivered')
                .order('created_at', { ascending: false });

            if (bookingError) throw bookingError;

            // 2. Fetch all settlements
            const { data: settlementData, error: settlementError } = await supabase
                .from('rider_payment_settlements')
                .select('*')
                .eq('rider_id', user.id)
                .order('created_at', { ascending: false });

            if (settlementError) throw settlementError;

            // Calculate Stats
            const totalBookingsEarnings = bookingData.reduce((sum, b) => sum + (b.fare_amount || 0), 0);
            
            const totalSettledEarnings = settlementData.reduce((sum, s) => sum + (s.total_earnings || 0), 0);
            const totalPlatformCharges = settlementData.reduce((sum, s) => sum + (s.platform_charges || 0), 0);
            const totalPaidOut = settlementData
                .filter(s => s.status === 'paid')
                .reduce((sum, s) => sum + (s.net_amount || 0), 0);

            // Pending amount is roughly Total Earnings (from bookings) - Total Earnings covered in settlements (settled or pending settlements)
            // Note: This assumes settlements cover all bookings up to a certain date. 
            // A simplified view: Total Earnings - (Sum of total_earnings in all settlements)
            const pendingCalc = Math.max(0, totalBookingsEarnings - totalSettledEarnings);

            setStats({
                totalEarnings: totalBookingsEarnings,
                totalSettled: totalPaidOut,
                pendingAmount: pendingCalc, // Earnings not yet included in any settlement
                pendingSettlement: settlementData.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.net_amount, 0) // Settlements created but not paid
            });

            setBookings(bookingData);
            setSettlements(settlementData);

        } catch (error) {
            console.error("Error fetching earnings:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Helmet><title>My Earnings - B2B Nexus</title></Helmet>
            
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold">My Earnings</h1>
            </div>

            <div className="container mx-auto px-4 py-6 space-y-6">
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <Wallet className="w-5 h-5" />
                                <span className="text-sm font-medium">Total Earnings</span>
                            </div>
                            <div className="text-3xl font-bold">{formatPrice(stats.totalEarnings)}</div>
                            <div className="text-sm opacity-70 mt-1">{bookings.length} Orders Delivered</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Pending Payout</div>
                            <div className="text-xl font-bold text-orange-600">{formatPrice(stats.pendingAmount + stats.pendingSettlement)}</div>
                            <div className="text-xs text-slate-400 mt-1">
                                {stats.pendingSettlement > 0 ? `${formatPrice(stats.pendingSettlement)} in processing` : 'Not yet settled'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Settled Amount</div>
                            <div className="text-xl font-bold text-green-600">{formatPrice(stats.totalSettled)}</div>
                            <div className="text-xs text-slate-400 mt-1">Paid to bank</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lists */}
                <Tabs defaultValue="orders" className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="orders">Order History</TabsTrigger>
                        <TabsTrigger value="settlements">Settlements</TabsTrigger>
                    </TabsList>

                    <TabsContent value="orders" className="space-y-4 mt-4">
                        {loading ? (
                            <div className="text-center py-8 text-slate-500">Loading orders...</div>
                        ) : bookings.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                                <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500">No earnings yet. Start delivering!</p>
                            </div>
                        ) : (
                            bookings.map(order => (
                                <Card key={order.id} className="overflow-hidden">
                                    <div className="flex justify-between items-center p-4 border-b bg-slate-50/50">
                                        <span className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</span>
                                        <span className="text-xs text-slate-500">{formatDateToDDMMYYYY(order.created_at)}</span>
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-lg font-bold text-green-700">{formatPrice(order.fare_amount)}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                    <span>📏 {order.distance_km} km</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                Earned
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 mt-3 pt-3 border-t border-dashed">
                                            <div className="flex gap-2 text-sm">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                                <span className="text-slate-600 line-clamp-1">{order.pickup_address}</span>
                                            </div>
                                            <div className="flex gap-2 text-sm">
                                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                                <span className="text-slate-600 line-clamp-1">{order.drop_address}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="settlements" className="space-y-4 mt-4">
                        {loading ? (
                            <div className="text-center py-8 text-slate-500">Loading settlements...</div>
                        ) : settlements.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                                <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500">No settlement history found.</p>
                            </div>
                        ) : (
                            settlements.map(settlement => (
                                <Card key={settlement.id}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">
                                                    {formatDateToDDMMYYYY(settlement.start_date)} - {formatDateToDDMMYYYY(settlement.end_date)}
                                                </p>
                                                <h3 className="font-bold text-lg">{formatPrice(settlement.net_amount)}</h3>
                                            </div>
                                            <Badge className={
                                                settlement.status === 'paid' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                            }>
                                                {settlement.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        
                                        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1 mt-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Total Earnings</span>
                                                <span>{formatPrice(settlement.total_earnings)}</span>
                                            </div>
                                            <div className="flex justify-between text-red-500">
                                                <span>Platform Charges</span>
                                                <span>-{formatPrice(settlement.platform_charges)}</span>
                                            </div>
                                            <div className="border-t border-slate-200 my-1 pt-1 flex justify-between font-medium">
                                                <span>Net Payout</span>
                                                <span>{formatPrice(settlement.net_amount)}</span>
                                            </div>
                                        </div>
                                        
                                        {settlement.status === 'paid' && (
                                            <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                                                <CheckCircleIcon className="w-3 h-3" />
                                                Processed on {formatDateToDDMMYYYY(settlement.processed_at)}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

// Simple Icon Component
const CheckCircleIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
)

export default RiderEarningsPage;