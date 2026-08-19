import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GSTSettings = ({ sellerId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [settings, setSettings] = useState({
    business_name: '',
    gstin: '',
    default_gst_rate: '18',
  });

  useEffect(() => {
    fetchSettings();
  }, [sellerId]);

  const fetchSettings = async () => {
    if (!sellerId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, gstin')
        .eq('id', sellerId)
        .single();
        
      const { data: authData } = await supabase.auth.getUser();
      const defaultGstRate = authData?.user?.user_metadata?.default_gst_rate || '18';

      if (error) throw error;
      
      if (data) {
        setSettings({
          business_name: data.business_name || '',
          gstin: data.gstin || '',
          default_gst_rate: defaultGstRate
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: settings.business_name,
          gstin: settings.gstin
        })
        .eq('id', sellerId);

      if (profileError) throw profileError;

      // Update auth meta for the gst rate preference
      await supabase.auth.updateUser({
        data: { default_gst_rate: settings.default_gst_rate }
      });

      toast({ title: 'Settings Saved', description: 'GST preferences updated successfully.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <Card className="max-w-2xl shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>GST Toolkit Settings</CardTitle>
        <CardDescription>Manage your business identification and default preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Business Name</Label>
          <Input 
            value={settings.business_name} 
            onChange={e => setSettings({...settings, business_name: e.target.value})}
            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
          />
        </div>
        
        <div className="space-y-2">
          <Label>GSTIN Registration Number</Label>
          <Input 
            value={settings.gstin} 
            onChange={e => setSettings({...settings, gstin: e.target.value.toUpperCase()})}
            placeholder="e.g. 22AAAAA0000A1Z5"
            maxLength={15}
            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label>Default GST Rate Preference</Label>
          <Select value={settings.default_gst_rate} onValueChange={v => setSettings({...settings, default_gst_rate: v})}>
            <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0% (Exempt)</SelectItem>
              <SelectItem value="5">5%</SelectItem>
              <SelectItem value="12">12%</SelectItem>
              <SelectItem value="18">18%</SelectItem>
              <SelectItem value="28">28%</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">This rate will be pre-selected when adding new expenses.</p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default GSTSettings;