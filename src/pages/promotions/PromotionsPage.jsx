import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Megaphone, Gift, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const PromotionsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState({ activeOffers: 0, totalClicks: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            if (!user?.id) return;
            
            // Query using only valid columns from promotions table
            const { count, error } = await supabase
                .from('promotions')
                .select('*', { count: 'exact', head: true })
                .eq('shop_id', user.id)
                .eq('is_active', true);
                
            if (!error) {
                setStats(prev => ({ ...prev, activeOffers: count || 0 }));
            } else {
                console.error("[PromotionsPage] Error fetching promotion stats:", error);
            }
        };
        fetchStats();
    }, [user]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-6">
                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/pos')}
                    className="mb-4 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back
                </Button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <Megaphone className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                            Promotions Hub
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Create, manage, and track your store offers and campaigns.</p>
                    </div>
                    <Button 
                        onClick={() => navigate('/promotions/create')} 
                        className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" /> Create New Offer
                    </Button>
                </div>
            </div>

            <div className="flex justify-center items-center min-h-[400px]">
                <Card 
                    className="w-full max-w-sm hover:shadow-lg transition-shadow cursor-pointer border-blue-200 dark:border-blue-800" 
                    onClick={() => navigate('/promotions/offers')}
                >
                    <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                        <div className="p-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <Gift className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-200">Manage Offers</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                {stats.activeOffers} Active Promotion{stats.activeOffers !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg text-blue-900 dark:text-blue-100">Pro Tip for More Sales 🚀</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-blue-800 dark:text-blue-200/80">Create compelling offers with clear discount values and validity periods to attract more customers and boost your sales!</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default PromotionsPage;