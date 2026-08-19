import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Eye, EyeOff, Copy, BadgeCheck, AlertTriangle } from 'lucide-react';
import { PaymentCredentialsManager } from '@/lib/PaymentCredentialsManager';
import { PaymentSettingsAPI } from '@/lib/PaymentSettingsAPI';

const AdminPaymentSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({ cashfree: false, paytm: false, stripe: false, all: false });
  const [showSecrets, setShowSecrets] = useState({});
  
  const [gateways, setGateways] = useState({
    cashfree: { app_id: '', secret_key: '', environment: 'TEST', webhook_secret: '' },
    paytm: { merchant_id: '', merchant_key: '', website: '', environment: 'TEST', webhook_secret: '' },
    stripe: { publishable_key: '', secret_key: '', environment: 'TEST', webhook_secret: '' }
  });

  useEffect(() => {
    if (user) loadCredentials();
  }, [user]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const data = await PaymentSettingsAPI.getPaymentSettings(user.id);
      const newGateways = { ...gateways };

      // Cashfree
      const cf = data.gateways.find(g => g.gateway_type === 'cashfree');
      if (cf && cf.credentials) {
        newGateways.cashfree = {
          app_id: PaymentCredentialsManager.decrypt(cf.credentials.cashfree_app_id) || '',
          secret_key: PaymentCredentialsManager.decrypt(cf.credentials.cashfree_secret_key) || '',
          environment: cf.test_mode ? 'TEST' : 'PROD',
          webhook_secret: PaymentCredentialsManager.decrypt(cf.credentials.cashfree_webhook_secret) || ''
        };
      }

      // Paytm
      const pt = data.gateways.find(g => g.gateway_type === 'paytm');
      if (pt && pt.credentials) {
        newGateways.paytm = {
          merchant_id: PaymentCredentialsManager.decrypt(pt.credentials.paytm_mid) || '',
          merchant_key: PaymentCredentialsManager.decrypt(pt.credentials.paytm_merchant_key) || '',
          website: PaymentCredentialsManager.decrypt(pt.credentials.paytm_website) || '',
          environment: pt.test_mode ? 'TEST' : 'PROD',
          webhook_secret: PaymentCredentialsManager.decrypt(pt.credentials.paytm_webhook_secret) || ''
        };
      }

      // Stripe
      const st = data.gateways.find(g => g.gateway_type === 'stripe');
      if (st && st.credentials) {
        newGateways.stripe = {
          publishable_key: PaymentCredentialsManager.decrypt(st.credentials.stripe_publishable_key) || '',
          secret_key: PaymentCredentialsManager.decrypt(st.credentials.stripe_secret_key) || '',
          environment: st.test_mode ? 'TEST' : 'PROD',
          webhook_secret: PaymentCredentialsManager.decrypt(st.credentials.stripe_webhook_secret) || ''
        };
      }

      setGateways(newGateways);
    } catch (error) {
      console.error("Failed to load credentials:", error);
      toast({ title: "Error", description: "Failed to load payment settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type) => {
    const data = gateways[type];
    let creds = {};
    
    if (type === 'cashfree') {
      if (!data.app_id || !data.secret_key) {
        toast({ title: "Validation Error", description: "App ID and Secret Key are required.", variant: "destructive" });
        return;
      }
      creds = {
        cashfree_app_id: PaymentCredentialsManager.encrypt(data.app_id),
        cashfree_secret_key: PaymentCredentialsManager.encrypt(data.secret_key),
        cashfree_webhook_secret: PaymentCredentialsManager.encrypt(data.webhook_secret)
      };
    } else if (type === 'paytm') {
      if (!data.merchant_id || !data.merchant_key || !data.website) {
        toast({ title: "Validation Error", description: "Merchant ID, Key and Website are required.", variant: "destructive" });
        return;
      }
      creds = {
        paytm_mid: PaymentCredentialsManager.encrypt(data.merchant_id),
        paytm_merchant_key: PaymentCredentialsManager.encrypt(data.merchant_key),
        paytm_website: PaymentCredentialsManager.encrypt(data.website),
        paytm_webhook_secret: PaymentCredentialsManager.encrypt(data.webhook_secret)
      };
    } else if (type === 'stripe') {
      if (!data.publishable_key || !data.secret_key) {
        toast({ title: "Validation Error", description: "Publishable Key and Secret Key are required.", variant: "destructive" });
        return;
      }
      creds = {
        stripe_publishable_key: PaymentCredentialsManager.encrypt(data.publishable_key),
        stripe_secret_key: PaymentCredentialsManager.encrypt(data.secret_key),
        stripe_webhook_secret: PaymentCredentialsManager.encrypt(data.webhook_secret)
      };
    }

    setSaving(prev => ({ ...prev, [type]: true }));
    try {
      await PaymentSettingsAPI.savePaymentGateway(
        user.id,
        type,
        true, // enabled
        data.environment === 'TEST',
        creds
      );

      toast({ title: "Success", description: `${type.charAt(0).toUpperCase() + type.slice(1)} settings saved securely.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: `Failed to save ${type} settings.`, variant: "destructive" });
    } finally {
      setSaving(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSaveAll = async () => {
    const toSave = [];

    // Cashfree Validation
    const cf = gateways.cashfree;
    if (cf.app_id || cf.secret_key || cf.webhook_secret) {
      if (!cf.app_id || !cf.secret_key) {
        toast({ title: "Validation Error", description: "Cashfree: App ID and Secret Key are required.", variant: "destructive" });
        return;
      }
      toSave.push({
        type: 'cashfree',
        isTest: cf.environment === 'TEST',
        creds: {
          cashfree_app_id: PaymentCredentialsManager.encrypt(cf.app_id),
          cashfree_secret_key: PaymentCredentialsManager.encrypt(cf.secret_key),
          cashfree_webhook_secret: PaymentCredentialsManager.encrypt(cf.webhook_secret)
        }
      });
    }

    // Paytm Validation
    const pt = gateways.paytm;
    if (pt.merchant_id || pt.merchant_key || pt.website || pt.webhook_secret) {
      if (!pt.merchant_id || !pt.merchant_key || !pt.website) {
        toast({ title: "Validation Error", description: "Paytm: Merchant ID, Key and Website are required.", variant: "destructive" });
        return;
      }
      toSave.push({
        type: 'paytm',
        isTest: pt.environment === 'TEST',
        creds: {
          paytm_mid: PaymentCredentialsManager.encrypt(pt.merchant_id),
          paytm_merchant_key: PaymentCredentialsManager.encrypt(pt.merchant_key),
          paytm_website: PaymentCredentialsManager.encrypt(pt.website),
          paytm_webhook_secret: PaymentCredentialsManager.encrypt(pt.webhook_secret)
        }
      });
    }

    // Stripe Validation
    const st = gateways.stripe;
    if (st.publishable_key || st.secret_key || st.webhook_secret) {
      if (!st.publishable_key || !st.secret_key) {
        toast({ title: "Validation Error", description: "Stripe: Publishable Key and Secret Key are required.", variant: "destructive" });
        return;
      }
      toSave.push({
        type: 'stripe',
        isTest: st.environment === 'TEST',
        creds: {
          stripe_publishable_key: PaymentCredentialsManager.encrypt(st.publishable_key),
          stripe_secret_key: PaymentCredentialsManager.encrypt(st.secret_key),
          stripe_webhook_secret: PaymentCredentialsManager.encrypt(st.webhook_secret)
        }
      });
    }

    if (toSave.length === 0) {
      toast({ title: "Info", description: "No configurations to save. Please fill in credentials for at least one gateway." });
      return;
    }

    setSaving(prev => ({ ...prev, all: true }));
    try {
      await Promise.all(toSave.map(item =>
        PaymentSettingsAPI.savePaymentGateway(
          user.id,
          item.type,
          true,
          item.isTest,
          item.creds
        )
      ));
      toast({ title: "Success", description: "All payment settings saved successfully." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save some payment settings.", variant: "destructive" });
    } finally {
      setSaving(prev => ({ ...prev, all: false }));
    }
  };

  const handleChange = (type, field, value) => {
    setGateways(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const toggleSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payment Settings</h2>
        <p className="text-slate-500">Configure global payment gateways for membership plans and platform fees.</p>
      </div>

      {/* Cashfree Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Cashfree Payments
                {gateways.cashfree.environment === 'TEST' && <BadgeCheck className="h-5 w-5 text-yellow-500" />}
              </CardTitle>
              <CardDescription>Configure Cashfree credentials for accepting payments.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Environment</Label>
            <Select value={gateways.cashfree.environment} onValueChange={(val) => handleChange('cashfree', 'environment', val)}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEST">Test (Sandbox)</SelectItem>
                <SelectItem value="PROD">Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Select 'Test' for sandbox testing, 'Production' for real payments.</p>
          </div>

          <div className="grid gap-2">
            <Label>App ID</Label>
            <div className="flex gap-2">
              <Input value={gateways.cashfree.app_id} onChange={(e) => handleChange('cashfree', 'app_id', e.target.value)} placeholder="Enter Cashfree App ID" type="text" />
              {gateways.cashfree.app_id && (
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(gateways.cashfree.app_id)} title="Copy"><Copy className="h-4 w-4" /></Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Secret Key</Label>
            <div className="flex gap-2 relative">
              <Input type={showSecrets['cf_secret'] ? "text" : "password"} value={gateways.cashfree.secret_key} onChange={(e) => handleChange('cashfree', 'secret_key', e.target.value)} placeholder="Enter Cashfree Secret Key" className="pr-10" />
              <button type="button" className="absolute right-14 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => toggleSecret('cf_secret')}>
                {showSecrets['cf_secret'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {gateways.cashfree.secret_key && (
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(gateways.cashfree.secret_key)} title="Copy"><Copy className="h-4 w-4" /></Button>
              )}
            </div>
            <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Stored securely using AES encryption.</p>
          </div>

          <div className="grid gap-2">
            <Label>Webhook Secret (Optional)</Label>
            <div className="flex gap-2 relative">
              <Input type={showSecrets['cf_webhook'] ? "text" : "password"} value={gateways.cashfree.webhook_secret} onChange={(e) => handleChange('cashfree', 'webhook_secret', e.target.value)} placeholder="Enter Webhook Secret" className="pr-10" />
              <button type="button" className="absolute right-14 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => toggleSecret('cf_webhook')}>
                {showSecrets['cf_webhook'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-slate-50 p-4">
          <Button onClick={() => handleSave('cashfree')} disabled={saving.cashfree || saving.all} className="min-w-[120px]">
            {saving.cashfree ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
          </Button>
        </CardFooter>
      </Card>

      {/* Paytm Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Paytm Payments
                {gateways.paytm.environment === 'TEST' && <BadgeCheck className="h-5 w-5 text-yellow-500" />}
              </CardTitle>
              <CardDescription>Configure Paytm credentials for accepting payments.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Environment</Label>
            <Select value={gateways.paytm.environment} onValueChange={(val) => handleChange('paytm', 'environment', val)}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEST">Test (Sandbox)</SelectItem>
                <SelectItem value="PROD">Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Select 'Test' for sandbox testing, 'Production' for real payments.</p>
          </div>

          <div className="grid gap-2">
            <Label>Merchant ID (MID)</Label>
            <div className="flex gap-2">
              <Input value={gateways.paytm.merchant_id} onChange={(e) => handleChange('paytm', 'merchant_id', e.target.value)} placeholder="Enter Paytm Merchant ID" type="text" />
              {gateways.paytm.merchant_id && (
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(gateways.paytm.merchant_id)} title="Copy"><Copy className="h-4 w-4" /></Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Merchant Key</Label>
            <div className="flex gap-2 relative">
              <Input type={showSecrets['pt_key'] ? "text" : "password"} value={gateways.paytm.merchant_key} onChange={(e) => handleChange('paytm', 'merchant_key', e.target.value)} placeholder="Enter Paytm Merchant Key" className="pr-10" />
              <button type="button" className="absolute right-14 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => toggleSecret('pt_key')}>
                {showSecrets['pt_key'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {gateways.paytm.merchant_key && (
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(gateways.paytm.merchant_key)} title="Copy"><Copy className="h-4 w-4" /></Button>
              )}
            </div>
            <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Stored securely using AES encryption.</p>
          </div>

          <div className="grid gap-2">
            <Label>Website</Label>
            <div className="flex gap-2">
              <Input value={gateways.paytm.website} onChange={(e) => handleChange('paytm', 'website', e.target.value)} placeholder="Enter Website Name (e.g., WEBSTAGING)" type="text" />
              {gateways.paytm.website && (
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(gateways.paytm.website)} title="Copy"><Copy className="h-4 w-4" /></Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Webhook Secret (Optional)</Label>
            <div className="flex gap-2 relative">
              <Input type={showSecrets['pt_webhook'] ? "text" : "password"} value={gateways.paytm.webhook_secret} onChange={(e) => handleChange('paytm', 'webhook_secret', e.target.value)} placeholder="Enter Webhook Secret" className="pr-10" />
              <button type="button" className="absolute right-14 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => toggleSecret('pt_webhook')}>
                {showSecrets['pt_webhook'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-slate-50 p-4">
          <Button onClick={() => handleSave('paytm')} disabled={saving.paytm || saving.all} className="min-w-[120px]">
            {saving.paytm ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
          </Button>
        </CardFooter>
      </Card>

      {/* Stripe Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Stripe Payments
                {gateways.stripe.environment === 'TEST' && <BadgeCheck className="h-5 w-5 text-yellow-500" />}
              </CardTitle>
              <CardDescription>Configure Stripe credentials for accepting payments.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Environment</Label>
            <Select value={gateways.stripe.environment} onValueChange={(val) => handleChange('stripe', 'environment', val)}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEST">Test (Sandbox)</SelectItem>
                <SelectItem value="PROD">Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Select 'Test' for sandbox testing, 'Production' for real payments.</p>
          </div>

          <div className="grid gap-2">
            <Label>Publishable Key</Label>
            <div className="flex gap-2">
              <Input value={gateways.stripe.publishable_key} onChange={(e) => handleChange('stripe', 'publishable_key', e.target.value)} placeholder="Enter Stripe Publishable Key (pk_test_...)" type="text" />
              {gateways.stripe.publishable_key && (
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(gateways.stripe.publishable_key)} title="Copy"><Copy className="h-4 w-4" /></Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Secret Key</Label>
            <div className="flex gap-2 relative">
              <Input type={showSecrets['st_secret'] ? "text" : "password"} value={gateways.stripe.secret_key} onChange={(e) => handleChange('stripe', 'secret_key', e.target.value)} placeholder="Enter Stripe Secret Key (sk_test_...)" className="pr-10" />
              <button type="button" className="absolute right-14 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => toggleSecret('st_secret')}>
                {showSecrets['st_secret'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {gateways.stripe.secret_key && (
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(gateways.stripe.secret_key)} title="Copy"><Copy className="h-4 w-4" /></Button>
              )}
            </div>
            <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Stored securely using AES encryption.</p>
          </div>

          <div className="grid gap-2">
            <Label>Webhook Secret (Optional)</Label>
            <div className="flex gap-2 relative">
              <Input type={showSecrets['st_webhook'] ? "text" : "password"} value={gateways.stripe.webhook_secret} onChange={(e) => handleChange('stripe', 'webhook_secret', e.target.value)} placeholder="Enter Webhook Secret (whsec_...)" className="pr-10" />
              <button type="button" className="absolute right-14 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => toggleSecret('st_webhook')}>
                {showSecrets['st_webhook'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-slate-50 p-4">
          <Button onClick={() => handleSave('stripe')} disabled={saving.stripe || saving.all} className="min-w-[120px]">
            {saving.stripe ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
          </Button>
        </CardFooter>
      </Card>

      {/* Global Save Button */}
      <div className="flex justify-end pt-8 mt-12 border-t border-slate-200">
        <Button 
          onClick={handleSaveAll} 
          disabled={saving.all || saving.cashfree || saving.paytm || saving.stripe} 
          size="lg" 
          className="min-w-[240px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
        >
          {saving.all ? (
            <><Loader2 className="h-5 w-5 animate-spin" />Saving All Settings...</>
          ) : (
            <><Save className="h-5 w-5" />Save All Configurations</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdminPaymentSettings;