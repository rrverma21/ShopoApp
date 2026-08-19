import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getFullPromotionUrl } from '@/utils/promotions/linkGenerator';
import ShareButtons from '@/components/promotions/ShareButtons';
import CaptionGenerator from '@/components/promotions/CaptionGenerator';
import QRCodeDisplay from '@/components/promotions/QRCodeDisplay';
import { formatQRCodeData } from '@/utils/promotions/qrCodeGenerator';
import { getPromotionsSelectString } from '@/utils/promotions/schemaDiscovery';

const ShareOffer = () => {
    const [searchParams] = useSearchParams();
    const offerId = searchParams.get('id');
    const navigate = useNavigate();
    const [offer, setOffer] = useState(null);
    const [linkCode, setLinkCode] = useState(null);
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
                .select('unique_code')
                .eq('promotion_id', offerId)
                .single();
            if (linkData) setLinkCode(linkData.unique_code);
            setLoading(false);
        };
        fetchData();
    }, [offerId]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!offer || !linkCode) return <div className="p-10 text-center text-slate-500">Offer not found</div>;

    const fullUrl = getFullPromotionUrl(linkCode);
    const formattedUrl = formatQRCodeData(fullUrl);

    // Transform offer data for caption generator (use 'title' instead of 'name')
    const offerDataForCaption = {
        ...offer,
        name: offer.title // Map title to name for caption generator compatibility
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <h1 className="text-2xl font-bold mb-6">Share Promotion: {offer.title}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Shareable Link</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-700 break-all mb-4 border border-slate-200">
                                {fullUrl}
                            </div>
                            <ShareButtons url={fullUrl} offerData={offerDataForCaption} />
                        </CardContent>
                    </Card>

                    <CaptionGenerator offerData={offerDataForCaption} />
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">QR Code</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <QRCodeDisplay value={formattedUrl} size={200} />
                            <p className="text-xs text-center text-slate-500 mt-4">
                                Customers can scan this code in-store to view the offer on their phones.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ShareOffer;