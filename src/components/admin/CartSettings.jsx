import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const CartSettings = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState({
        free_gift_threshold: 10000,
        free_shipping_threshold: 5000,
        free_gift_message: "Unlock a Free Premium Business Kit!",
        free_gift_success_message: "🎉 Congratulations! You've unlocked a FREE Premium Business Kit!",
        enable_checkout_offers: true
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                // Use maybeSingle() instead of single() to handle 0 rows without error
                const { data, error } = await supabase
                    .from('site_settings')
                    .select('*')
                    .eq('key', 'cart_settings')
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (data) {
                    const parsedSettings = JSON.parse(data.value);
                    setSettings(prev => ({ ...prev, ...parsedSettings }));
                }
                // If no data (data is null), we simply keep the default state
            } catch (err) {
                console.error("Failed to fetch cart settings:", err);
                toast({
                    title: "Error",
                    description: "Failed to load current settings.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleSwitchChange = (checked) => {
        setSettings(prev => ({ ...prev, enable_checkout_offers: checked }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('site_settings')
                .upsert({
                    key: 'cart_settings',
                    value: JSON.stringify(settings)
                }, { onConflict: 'key' });

            if (error) throw error;

            toast({
                title: "Settings Saved",
                description: "Cart configuration has been updated successfully.",
            });
        } catch (err) {
            console.error("Failed to save settings:", err);
            toast({
                title: "Error Saving",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Cart Configuration</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Incentive Thresholds</CardTitle>
                    <CardDescription>Configure spending goals to encourage higher order values.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="free_gift_threshold">Free Gift Threshold (₹)</Label>
                            <Input 
                                id="free_gift_threshold" 
                                name="free_gift_threshold" 
                                type="number" 
                                value={settings.free_gift_threshold} 
                                onChange={handleChange} 
                                min="0"
                            />
                            <p className="text-xs text-slate-500">Order value required to unlock the free gift.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="free_shipping_threshold">Free Shipping Threshold (₹)</Label>
                            <Input 
                                id="free_shipping_threshold" 
                                name="free_shipping_threshold" 
                                type="number" 
                                value={settings.free_shipping_threshold} 
                                onChange={handleChange} 
                                min="0"
                            />
                            <p className="text-xs text-slate-500">Order value required to qualify for free shipping.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Free Gift Messaging</CardTitle>
                    <CardDescription>Customize the messages users see in the cart progress bar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="free_gift_message">Incentive Message</Label>
                        <Input 
                            id="free_gift_message" 
                            name="free_gift_message" 
                            value={settings.free_gift_message} 
                            onChange={handleChange} 
                            placeholder="e.g., Unlock a Free Premium Business Kit!"
                        />
                        <p className="text-xs text-slate-500">Shown before the goal is reached.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="free_gift_success_message">Success Message</Label>
                        <Input 
                            id="free_gift_success_message" 
                            name="free_gift_success_message" 
                            value={settings.free_gift_success_message} 
                            onChange={handleChange} 
                            placeholder="e.g., 🎉 You've unlocked a FREE gift!"
                        />
                        <p className="text-xs text-slate-500">Shown after the goal is reached.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Checkout Offers</CardTitle>
                    <CardDescription>Control visibility of special offers during checkout.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable Checkout Offers</Label>
                            <p className="text-sm text-slate-500">
                                Show the "Available Checkout Offers" sidebar in the cart page.
                            </p>
                        </div>
                        <Switch 
                            checked={settings.enable_checkout_offers} 
                            onCheckedChange={handleSwitchChange} 
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button size="lg" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
};

export default CartSettings;