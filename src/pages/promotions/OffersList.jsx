import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import OfferCard from '@/components/promotions/OfferCard';
import { useToast } from '@/components/ui/use-toast';
import { getPromotionsSelectString } from '@/utils/promotions/schemaDiscovery';

const OffersList = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const fetchOffers = async () => {
        setLoading(true);
        try {
            // Use correct column names from actual schema
            const { data, error } = await supabase
                .from('promotions')
                .select(getPromotionsSelectString())
                .eq('shop_id', user?.id)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            if (data) {
                setOffers(data);
            }
        } catch (error) {
            console.error("[OffersList] Error fetching offers:", error);
            toast({ 
                title: 'Error', 
                description: 'Failed to load offers. Please try again.', 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchOffers();
    }, [user]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this offer? This action cannot be undone.')) return;
        
        try {
            const { error } = await supabase.from('promotions').delete().eq('id', id);
            if (error) throw error;
            
            toast({ 
                title: 'Success', 
                description: 'Offer deleted successfully' 
            });
            setOffers(offers.filter(o => o.id !== id));
        } catch (error) {
            console.error('[OffersList] Delete error:', error);
            toast({ 
                title: 'Error', 
                description: 'Failed to delete offer. Please try again.', 
                variant: 'destructive' 
            });
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/promotions')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Manage Offers</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {loading ? 'Loading...' : `${offers.length} offer${offers.length !== 1 ? 's' : ''} found`}
                        </p>
                    </div>
                </div>
                <Button onClick={() => navigate('/promotions/create')} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> New Offer
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                    <p className="text-slate-500">Loading your offers...</p>
                </div>
            ) : offers.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <div className="max-w-md mx-auto">
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No offers found</h3>
                        <p className="text-slate-500 mb-6">Create your first promotion to attract more customers and boost sales!</p>
                        <Button onClick={() => navigate('/promotions/create')} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Create Your First Offer
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offers.map(offer => (
                        <OfferCard key={offer.id} offer={offer} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default OffersList;