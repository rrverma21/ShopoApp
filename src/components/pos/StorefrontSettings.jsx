import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const StorefrontSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [preview, setPreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const [form, setForm] = useState({
        storefront_image_url: '',
        opening_time: '09:00',
        closing_time: '18:00',
        working_days: allDays
    });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setFetchError(null);
            
            const { data, error } = await supabase
                .from('pos_retailer_settings')
                .select('storefront_image_url, opening_time, closing_time, working_days, water_delivery_areas')
                .eq('user_id', user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Record does not exist, create a default one
                    const defaultSettings = {
                        user_id: user.id,
                        storefront_image_url: null,
                        opening_time: '09:00',
                        closing_time: '18:00',
                        working_days: allDays,
                        water_delivery_areas: [],
                        updated_at: new Date().toISOString()
                    };

                    const { data: newData, error: insertError } = await supabase
                        .from('pos_retailer_settings')
                        .upsert(defaultSettings)
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    if (newData) {
                        setForm({
                            storefront_image_url: newData.storefront_image_url || '',
                            opening_time: newData.opening_time || '09:00',
                            closing_time: newData.closing_time || '18:00',
                            working_days: newData.working_days || allDays
                        });
                        setPreview(newData.storefront_image_url);
                    }
                } else {
                    throw error;
                }
            } else if (data) {
                setForm({
                    storefront_image_url: data.storefront_image_url || '',
                    opening_time: data.opening_time || '09:00',
                    closing_time: data.closing_time || '18:00',
                    working_days: data.working_days || allDays
                });
                setPreview(data.storefront_image_url);
            }
        } catch (error) {
            setFetchError(error.message);
            toast({ 
                title: "Connection Error", 
                description: `Failed to load storefront settings. ${error.message}`, 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDayToggle = (day) => {
        setForm(prev => {
            const newDays = prev.working_days.includes(day)
                ? prev.working_days.filter(d => d !== day)
                : [...prev.working_days, day];
            return { ...prev, working_days: newDays };
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            let imageUrl = form.storefront_image_url;

            if (imageFile) {
                const filePath = `${user.id}/storefront/${Date.now()}_${imageFile.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, imageFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);
                
                imageUrl = urlData.publicUrl;
            }

            const { error: updateError } = await supabase
                .from('pos_retailer_settings')
                .upsert({
                    user_id: user.id,
                    storefront_image_url: imageUrl,
                    opening_time: form.opening_time,
                    closing_time: form.closing_time,
                    working_days: form.working_days,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (updateError) throw updateError;
            
            setForm(prev => ({...prev, storefront_image_url: imageUrl}));
            toast({ title: "Success", description: "Storefront settings saved." });

        } catch (error) {
            toast({ title: "Error", description: `Failed to save settings: ${error.message}`, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                <p className="text-slate-500 font-medium">Loading storefront settings...</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <Card className="border-red-200 dark:border-red-800 shadow-sm bg-red-50/50 dark:bg-red-900/10">
                <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
                    <p className="text-red-600 dark:text-red-400 text-center font-medium">
                        Unable to synchronize with the database.
                        <br />
                        <span className="text-sm opacity-80">{fetchError}</span>
                    </p>
                    <Button onClick={fetchData} variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Retry Connection
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
                <CardTitle>Storefront Appearance</CardTitle>
                <CardDescription>Customize how your shop appears to customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <Label htmlFor="storefront_image">Storefront Image</Label>
                    <div className="flex items-center gap-4">
                        <div className="w-40 h-40 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                            {preview ? (
                                <img src={preview} alt="Storefront Preview" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-12 h-12 text-slate-400" />
                            )}
                        </div>
                        <div className="flex-1">
                           <Input id="storefront_image" type="file" onChange={handleImageChange} accept="image/*" className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                           <p className="text-xs text-slate-500 mt-2">Recommended size: 800x600px. Max 2MB.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="opening_time">Opening Time</Label>
                        <Input id="opening_time" type="time" value={form.opening_time} onChange={(e) => setForm({...form, opening_time: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="closing_time">Closing Time</Label>
                        <Input id="closing_time" type="time" value={form.closing_time} onChange={(e) => setForm({...form, closing_time: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>Working Days</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {allDays.map(day => (
                            <div key={day} className="flex items-center space-x-2">
                                <Checkbox id={`day-${day}`} checked={form.working_days.includes(day)} onCheckedChange={() => handleDayToggle(day)} />
                                <label htmlFor={`day-${day}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{day}</label>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t p-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </Button>
            </CardFooter>
        </Card>
    );
};

export default StorefrontSettings;