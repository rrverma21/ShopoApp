import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import AnalyticsMetrics from '@/components/promotions/AnalyticsMetrics';
import { getPromotionsSelectString } from '@/utils/promotions/schemaDiscovery';

const AnalyticsDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const offerId = searchParams.get('id');
    const [offer, setOffer] = useState(null);
    const [analytics, setAnalytics] = useState({ views: 0, clicks: 0, orders: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!offerId) return;
            
            // Use correct column names from actual schema
            const { data: offerData } = await supabase
                .from('promotions')
                .select(getPromotionsSelectString())
                .eq('id', offerId)
                .single();
            setOffer(offerData);

            const { data: linkData } = await supabase
                .from('promotion_links')
                .select('clicks')
                .eq('promotion_id', offerId)
                .single();

            const { data: analyticsData } = await supabase
                .from('promotion_analytics')
                .select('views, clicks, orders')
                .eq('promotion_id', offerId)
                .single();

            setAnalytics({
                views: analyticsData?.views || 0,
                clicks: linkData?.clicks || analyticsData?.clicks || 0,
                orders: analyticsData?.orders || 0
            });

            setLoading(false);
        };
        fetchData();
    }, [offerId]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!offer) return <div className="p-10 text-center text-slate-500">Offer not found</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <h1 className="text-2xl font-bold mb-2">Analytics: {offer.title}</h1>
            <p className="text-slate-500 mb-8">Track performance and engagement for this promotion</p>

            <AnalyticsMetrics views={analytics.views} clicks={analytics.clicks} orders={analytics.orders} />

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <p className="text-slate-600">More detailed analytics charts coming soon!</p>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;