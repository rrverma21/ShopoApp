import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tag, Store, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { incrementLinkClicks } from '@/utils/promotions/analyticsTracker';
import { getPromotionsSelectString } from '@/utils/promotions/schemaDiscovery';

const PublicOfferPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [offer, setOffer] = useState(null);
    const [shop, setShop] = useState(null);

    useEffect(() => {
        const fetchOffer = async () => {
            const { data: link } = await supabase
                .from('promotion_links')
                .select('promotion_id, id')
                .eq('unique_code', code)
                .single();
                
            if (link) {
                incrementLinkClicks(link.id, 'promotion');
                
                // Use correct column names from actual schema
                const { data: promo } = await supabase
                    .from('promotions')
                    .select(getPromotionsSelectString())
                    .eq('id', link.promotion_id)
                    .single();
                    
                if (promo) {
                    setOffer(promo);
                    const { data: profile } = await supabase
                        .from('public_shop_profiles')
                        .select('business_name, id')
                        .eq('id', promo.shop_id)
                        .single();
                    setShop(profile);
                }
            }
        };
        fetchOffer();
    }, [code]);

    if (!offer) return <div className="p-10 text-center">Loading Offer...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl overflow-hidden border-0">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-90" />
                    <h1 className="text-3xl font-extrabold mb-2">{offer.title}</h1>
                    <p className="text-blue-100 text-lg">
                        {offer.discount_type === 'percentage' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`}
                    </p>
                </div>
                <CardContent className="p-6 space-y-6">
                    <p className="text-slate-600 text-center leading-relaxed">{offer.description}</p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                        <div className="flex items-center text-sm text-slate-700">
                            <Store className="w-4 h-4 mr-3 text-slate-400" />
                            <span className="font-semibold">{shop?.business_name || 'Local Store'}</span>
                        </div>
                        {offer.validity_end && (
                            <div className="flex items-center text-sm text-slate-700">
                                <Calendar className="w-4 h-4 mr-3 text-slate-400" />
                                <span>Valid until {format(new Date(offer.validity_end), 'MMMM d, yyyy')}</span>
                            </div>
                        )}
                    </div>

                    <Button className="w-full h-12 text-lg shadow-lg shadow-blue-500/30 group" onClick={() => navigate(`/shop/${shop?.id}`)}>
                        Visit Store to Claim <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default PublicOfferPage;
