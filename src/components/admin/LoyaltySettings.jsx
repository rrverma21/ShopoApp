import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Coins, Percent, IndianRupee } from 'lucide-react';

const LoyaltySettings = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState({
        earning_percentage: 50,
        redeem_percentage: 25,
        coin_value: 0.25
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('site_settings')
                    .select('*')
                    .eq('key', 'loyalty_settings')
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    const parsedSettings = JSON.parse(data.value);
                    setSettings(prev => ({ ...prev, ...parsedSettings }));
                }
            } catch (err) {
                console.error("Failed to fetch loyalty settings:", err);
                toast({
                    title: "Error",
                    description: "Failed to load loyalty settings.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Ensure non-negative numbers
        const numValue = Math.max(0, parseFloat(value) || 0);
        setSettings(prev => ({
            ...prev,
            [name]: numValue
        }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('site_settings')
                .upsert({
                    key: 'loyalty_settings',
                    value: JSON.stringify(settings)
                }, { onConflict: 'key' });

            if (error) throw error;

            toast({
                title: "Settings Saved",
                description: "Loyalty program configuration updated successfully.",
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
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Loyalty Program Settings</h2>
                    <p className="text-slate-500 mt-2">Configure how customers earn and redeem reward coins.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Percent className="h-5 w-5 text-blue-500" />
                            Earning Rate
                        </CardTitle>
                        <CardDescription>Percentage of bill value converted to coins.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="earning_percentage">Earning Percentage (%)</Label>
                            <Input 
                                id="earning_percentage" 
                                name="earning_percentage" 
                                type="number" 
                                value={settings.earning_percentage} 
                                onChange={handleChange}
                                min="0"
                                max="100"
                            />
                            <p className="text-xs text-slate-500">
                                Example: At 50%, a ₹100 bill earns 50 coins.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <IndianRupee className="h-5 w-5 text-green-500" />
                            Coin Value
                        </CardTitle>
                        <CardDescription>Monetary value of a single reward coin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="coin_value">Value per Coin (₹)</Label>
                            <Input 
                                id="coin_value" 
                                name="coin_value" 
                                type="number" 
                                step="0.01"
                                value={settings.coin_value} 
                                onChange={handleChange}
                                min="0"
                            />
                            <p className="text-xs text-slate-500">
                                Currently: 100 coins = ₹{(100 * settings.coin_value).toFixed(2)}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Coins className="h-5 w-5 text-yellow-500" />
                            Redemption Limit
                        </CardTitle>
                        <CardDescription>Max portion of bill payable via coins.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="redeem_percentage">Max Redeem % per Bill</Label>
                            <Input 
                                id="redeem_percentage" 
                                name="redeem_percentage" 
                                type="number" 
                                value={settings.redeem_percentage} 
                                onChange={handleChange}
                                min="0"
                                max="100"
                            />
                            <p className="text-xs text-slate-500">
                                Example: At 25%, max discount on ₹100 bill is ₹25.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-6">
                <Button size="lg" onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                    {isLoading ? "Saving..." : "Save Configuration"}
                </Button>
            </div>
        </div>
    );
};

export default LoyaltySettings;