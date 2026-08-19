import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const GeneralSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [shopTypes, setShopTypes] = useState([]);
    
    // Initialize with safe defaults to prevent "uncontrolled to controlled" errors
    const [form, setForm] = useState({
        shop_type: '',
        shop_category: 'Retailer', // Default value
        description: '',
        search_keywords: '',
        tax_type: 'GST',
        country: 'India'
    });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Shop Types
            const { data: typesData, error: typesError } = await supabase
                .from('shop_types')
                .select('id, name')
                .eq('is_active', true);

            if (typesError) throw typesError;
            setShopTypes(typesData || []);
            
            // 2. Fetch Current Settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('pos_retailer_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (settingsError) throw settingsError;

            if (settingsData) {
                // Normalize category value for Select compatibility
                let normalizedCategory = settingsData.shop_category || 'Retailer';
                if (normalizedCategory.toLowerCase() === 'retailer') normalizedCategory = 'Retailer';
                if (normalizedCategory.toLowerCase() === 'wholesaler') normalizedCategory = 'Wholesaler';

                setForm({
                    shop_type: settingsData.shop_type || '',
                    shop_category: normalizedCategory,
                    description: settingsData.description || '',
                    tax_type: settingsData.tax_type || 'GST',
                    country: settingsData.country || 'India',
                    search_keywords: Array.isArray(settingsData.search_keywords) 
                        ? settingsData.search_keywords.join(', ') 
                        : (settingsData.search_keywords || '')
                });
            }
        } catch (error) {
            console.error("Error loading settings:", error);
            toast({ title: "Error", description: "Failed to load general settings.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Format keywords as array
            const keywordsArray = form.search_keywords.split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);

            // Fetch existing to avoid removing unhandled fields
            const { data: existingData } = await supabase.from('pos_retailer_settings').select('*').eq('user_id', user.id).maybeSingle();

            const { error } = await supabase
                .from('pos_retailer_settings')
                .upsert({
                    ...existingData,
                    user_id: user.id,
                    shop_type: form.shop_type,
                    shop_category: form.shop_category,
                    description: form.description,
                    tax_type: form.tax_type,
                    country: form.country,
                    search_keywords: keywordsArray,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (error) throw error;

            toast({ title: "Success", description: "General settings have been saved." });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "Error", description: `Failed to save settings: ${error.message}`, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
                <CardTitle>General Shop Information</CardTitle>
                <CardDescription>Basic details about your shop that appear in searches and on your public page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Shop Type Selection */}
                <div className="space-y-2">
                    <Label htmlFor="shopType">Shop Type</Label>
                    <Select 
                        value={form.shop_type} 
                        onValueChange={(val) => setForm(prev => ({...prev, shop_type: val}))}
                    >
                        <SelectTrigger id="shopType" className="bg-white dark:bg-slate-900">
                            <SelectValue placeholder="Select shop type" />
                        </SelectTrigger>
                        <SelectContent>
                            {shopTypes.map(type => (
                                <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Shop Category (Order Mode) Selection - Replaced Input with Select */}
                <div className="space-y-2">
                    <Label htmlFor="category">Business Category (Order Mode)</Label>
                    <Select 
                        value={form.shop_category} 
                        onValueChange={(val) => setForm(prev => ({...prev, shop_category: val}))}
                    >
                        <SelectTrigger id="category" className="bg-white dark:bg-slate-900 w-full">
                            <SelectValue placeholder="Select Business Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Retailer">Retailer</SelectItem>
                            <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-500">
                        This determines the default pricing mode (Retail vs Wholesale) for your POS.
                    </p>
                </div>

                {/* Info Alert for Context */}
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle className="text-blue-800 dark:text-blue-300">Note</AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-400 text-xs">
                        <strong>Retailer Mode:</strong> Uses standard selling price.<br/>
                        <strong>Wholesaler Mode:</strong> Uses wholesale price field (if set).
                    </AlertDescription>
                </Alert>

                {/* Description Input */}
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                        id="description" 
                        placeholder="A short description of your shop" 
                        className="bg-white dark:bg-slate-900 resize-none min-h-[80px]"
                        value={form.description}
                        onChange={(e) => setForm(prev => ({...prev, description: e.target.value}))}
                    />
                </div>

                {/* Search Keywords Input */}
                <div className="space-y-2">
                    <Label htmlFor="keywords">Search Keywords</Label>
                    <Input 
                        id="keywords" 
                        placeholder="e.g. gifts, stationery, dairy products (comma separated)" 
                        className="bg-white dark:bg-slate-900"
                        value={form.search_keywords}
                        onChange={(e) => setForm(prev => ({...prev, search_keywords: e.target.value}))}
                    />
                </div>

            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </Button>
            </CardFooter>
        </Card>
    );
};

export default GeneralSettings;