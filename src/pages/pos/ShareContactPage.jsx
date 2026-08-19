import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Share2, Loader2, CheckCircle2, ShoppingCart, History, User } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const ShareContactPage = () => {
    const { sellerId } = useParams();
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [shopName, setShopName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingShop, setFetchingShop] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchShopDetails = async () => {
            if (!sellerId) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('business_name')
                    .eq('id', sellerId)
                    .single();
                
                if (error) throw error;
                if (data) setShopName(data.business_name);
            } catch (err) {
                console.error("Error fetching shop:", err);
                setError("Shop not found or invalid link.");
            } finally {
                setFetchingShop(false);
            }
        };
        fetchShopDetails();
    }, [sellerId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (!phone || phone.length < 10) {
            setError('Please enter a valid phone number (at least 10 digits).');
            return;
        }
        
        setError('');
        setLoading(true);

        try {
            const { error: insertError } = await supabase
                .from('shared_contacts')
                .insert({
                    seller_id: sellerId,
                    customer_phone: phone,
                    customer_name: name.trim(),
                    status: 'pending'
                });

            if (insertError) throw insertError;

            setSuccess(true);
        } catch (err) {
            console.error("Error sharing contact:", err);
            setError("Failed to share contact. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (fetchingShop) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error && !shopName) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-red-600">Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4 font-sans">
            <Helmet>
                <title>Share Contact | {shopName || 'B2B Nexus'}</title>
            </Helmet>
            
            <Card className="w-full max-w-md shadow-xl border-0 rounded-2xl overflow-hidden">
                {success ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 bg-white">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Thank You!</h2>
                        <p className="text-slate-600">Your contact has been successfully shared with <span className="font-semibold text-slate-900">{shopName}</span>.</p>
                        <p className="text-sm text-slate-500">
                            Now you can view your purchase history with this store.
                        </p>
                        
                        <Link to={`/my-purchases?phone=${phone}`} className="w-full">
                            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">
                                <History className="w-5 h-5 mr-2" /> View My Purchases
                            </Button>
                        </Link>
                        <p className="text-xs text-slate-500 mt-4">You can close this window now.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-blue-600 p-6 text-white text-center">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                                <Share2 className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-xl font-bold">Share Contact</h1>
                            <p className="text-blue-100 text-sm mt-1">with {shopName}</p>
                        </div>
                        
                        <CardContent className="p-6 pt-8">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-700 font-medium">Your Name</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-10 h-12 text-lg bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                                            required // Make name field required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-slate-700 font-medium">Your Phone Number</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">+91</div>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="Enter 10 digit number"
                                            value={phone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setPhone(val);
                                            }}
                                            className="pl-12 h-12 text-lg bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                                            required // Make phone field required
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Sharing your number allows the shop to quickly identify you for billing and loyalty points.
                                    </p>
                                </div>

                                {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

                                <Button 
                                    type="submit" 
                                    className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                                    disabled={loading}
                                >
                                    {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sharing...</> : 'Share Now'}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="bg-slate-50 p-4 text-center">
                            <p className="text-xs text-slate-400 w-full">
                                Powered by B2B Nexus POS
                            </p>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    );
};

export default ShareContactPage;