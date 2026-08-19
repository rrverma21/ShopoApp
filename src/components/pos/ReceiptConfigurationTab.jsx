import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, Printer, Building2, MapPin, Hash, Receipt as ReceiptIcon } from 'lucide-react';

const ReceiptConfigurationTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [config, setConfig] = useState({
    business_name: '',
    business_address: '',
    business_gstin: '',
    invoice_prefix: 'INV',
    gst_invoice_enabled: true,
    platform_name: 'B2B Nexus',
    phone: '',
  });

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('pos_retailer_settings')
        .select('business_name, business_address, business_gstin, invoice_prefix, gst_invoice_enabled, platform_name')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setConfig(prev => ({ ...prev, ...data }));
      }
      
      const { data: profile } = await supabase.from('profiles').select('phone, business_name, street_address, city, pincode').eq('id', user.id).single();
      if (profile) {
          setConfig(prev => ({
              ...prev,
              phone: profile.phone || '',
              business_name: prev.business_name || profile.business_name || '',
              business_address: prev.business_address || `${profile.street_address || ''}, ${profile.city || ''}, ${profile.pincode || ''}`
          }));
      }
    };
    fetchConfig();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (checked) => {
    setConfig(prev => ({ ...prev, gst_invoice_enabled: checked }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('pos_retailer_settings').upsert({
        user_id: user.id,
        business_name: config.business_name,
        business_address: config.business_address,
        business_gstin: config.business_gstin,
        invoice_prefix: config.invoice_prefix,
        gst_invoice_enabled: config.gst_invoice_enabled,
        platform_name: config.platform_name,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      toast({ title: "Settings Saved", description: "Invoice configuration updated successfully." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptIcon className="w-5 h-5 text-blue-600" />
            Invoice & Receipt Settings
          </CardTitle>
          <CardDescription>
            Configure how your GST invoices and sales receipts appear to customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Enable GST Invoice Printing</Label>
              <p className="text-sm text-slate-500">Show option to print GST compliant invoices after checkout.</p>
            </div>
            <Switch checked={config.gst_invoice_enabled} onCheckedChange={handleToggle} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name (on Invoice)</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="business_name" 
                  name="business_name" 
                  value={config.business_name} 
                  onChange={handleChange} 
                  className="pl-9" 
                  placeholder="e.g. My Awesome Shop" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="invoice_prefix" 
                  name="invoice_prefix" 
                  value={config.invoice_prefix} 
                  onChange={handleChange} 
                  className="pl-9" 
                  placeholder="e.g. INV, BILL" 
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="business_address">Business Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="business_address" 
                  name="business_address" 
                  value={config.business_address} 
                  onChange={handleChange} 
                  className="pl-9" 
                  placeholder="Complete address including pincode" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_gstin">GSTIN (Optional)</Label>
              <Input 
                id="business_gstin" 
                name="business_gstin" 
                value={config.business_gstin} 
                onChange={handleChange} 
                placeholder="27ABCDE1234F1Z5" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform_name">Footer Text / Platform Name</Label>
              <Input 
                id="platform_name" 
                name="platform_name" 
                value={config.platform_name} 
                onChange={handleChange} 
                placeholder="Powered by B2B Nexus" 
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptConfigurationTab;