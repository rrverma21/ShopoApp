import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Store, MapPin, Phone } from 'lucide-react';
import OfferCard from '@/components/promotions/OfferCard';

const PublicShopPage = () => {
    const { shopId } = useParams();
    const [shop, setShop] = useState(null);
    const [offers, setOffers] = useState([]);

    useEffect(() => {
        const fetchShopAndOffers = async () => {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', shopId).single();
            if (profile) setShop(profile);

            // Customers should only see active offers
            const { data: promos, error } = await supabase.from('promotions')
                .select('*')
                .eq('shop_id', shopId)
                .eq('is_active', true)
                .gte('validity_end', new Date().toISOString());
                
            if (!error && promos) {
                setOffers(promos);
            } else if (error) {
                console.error("Error fetching promotions:", error);
            }
        };
        fetchShopAndOffers();
    }, [shopId]);

    if (!shop) return <div className="p-10 text-center">Loading Store...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <div className="bg-slate-900 text-white pt-16 pb-24 px-4 text-center">
                <div className="w-20 h-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4 border-4 border-slate-700">
                    <Store className="w-10 h-10 text-slate-300" />
                </div>
                <h1 className="text-3xl font-bold mb-2">{shop.business_name}</h1>
                <p className="text-slate-400 flex items-center justify-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" /> {shop.city}, {shop.pincode}
                </p>
                <p className="text-slate-400 flex items-center justify-center gap-2 text-sm mt-1">
                    <Phone className="w-4 h-4" /> {shop.phone}
                </p>
            </div>

            <div className="container mx-auto px-4 -mt-12">
                <h2 className="text-xl font-bold mb-6 px-2 text-slate-800">Current Offers & Deals</h2>
                {offers.length === 0 ? (
                    <Card className="text-center py-12"><CardContent>No active offers right now.</CardContent></Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {offers.map(offer => (
                            <OfferCard key={offer.id} offer={offer} onDelete={() => {}} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicShopPage;