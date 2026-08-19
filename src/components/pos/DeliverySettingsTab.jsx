import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DeliverySettingsTab = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pos_retailer_settings')
                .select('delivery_enabled')
                .eq('user_id', user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setIsEnabled(data.delivery_enabled);
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not fetch delivery settings.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    const handleSave = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('pos_retailer_settings')
                .upsert({ user_id: user.id, delivery_enabled: isEnabled }, { onConflict: 'user_id' });
            
            if (error) throw error;
            toast({ title: "Success", description: "Delivery settings updated." });
        } catch (error) {
            toast({ title: "Error", description: `Failed to save: ${error.message}`, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Delivery Options</CardTitle>
                <CardDescription>Enable or disable general delivery for your shop.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-slate-50">
                    <div className="grid gap-1.5">
                        <Label htmlFor="delivery-enabled" className="font-semibold text-base">General Delivery Service</Label>
                        <p className="text-sm text-slate-500">Allow customers to request delivery for items purchased from your shop.</p>
                    </div>
                    <Switch
                        id="delivery-enabled"
                        checked={isEnabled}
                        onCheckedChange={setIsEnabled}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Settings
                </Button>
            </CardFooter>
        </Card>
    );
};

export default DeliverySettingsTab;