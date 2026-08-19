import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { PaymentSettingsAPI } from '@/lib/PaymentSettingsAPI';
import { PaymentCredentialsManager } from '@/lib/PaymentCredentialsManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Info, Eye, EyeOff } from 'lucide-react';

const PaymentSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ cod_enabled: true, online_payments_enabled: false });
  const [gateways, setGateways] = useState([]);
  
  // Form State
  const [activeGateway, setActiveGateway] = useState('razorpay');
  const [formData, setFormData] = useState({});
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await PaymentSettingsAPI.getPaymentSettings(user.id);
      
      // Handle missing settings gracefully
      setSettings(data.settings || { cod_enabled: true, online_payments_enabled: false });
      
      const fetchedGateways = data.gateways || [];
      
      // Initialize gateway data
      const initialGateways = ['razorpay', 'paytm', 'stripe', 'cashfree', 'payu', 'other'].map(type => {
        const existing = fetchedGateways.find(g => g.gateway_type === type);
        return existing || { 
            gateway_type: type, 
            is_enabled: false, 
            test_mode: true, 
            credentials: {} 
        };
      });
      setGateways(initialGateways);
      
      // Flatten credentials for form
      const initialForm = {};
      initialGateways.forEach(g => {
         if (g.credentials) {
             const creds = g.credentials;
             if (g.gateway_type === 'razorpay') {
                 initialForm.razorpay_key_id = creds.razorpay_key_id || creds.key_id;
                 initialForm.razorpay_key_secret = creds.razorpay_key_secret || creds.key_secret;
             } else if (g.gateway_type === 'stripe') {
                 initialForm.stripe_publishable_key = creds.stripe_publishable_key || creds.publishable_key;
                 initialForm.stripe_secret_key = creds.stripe_secret_key || creds.secret_key;
             } else if (g.gateway_type === 'paytm') {
                 initialForm.paytm_mid = creds.paytm_mid || creds.merchant_id;
                 initialForm.paytm_merchant_key = creds.paytm_merchant_key || creds.merchant_key;
                 initialForm.paytm_website = creds.paytm_website || creds.website;
                 initialForm.paytm_industry_type = creds.paytm_industry_type || creds.industry_type;
                 initialForm.paytm_channel_id = creds.paytm_channel_id || creds.channel_id;
             } else if (g.gateway_type === 'cashfree') {
                 initialForm.cashfree_app_id = creds.cashfree_app_id || creds.app_id;
                 initialForm.cashfree_secret_key = creds.cashfree_secret_key || creds.secret_key;
             } else if (g.gateway_type === 'payu') {
                 initialForm.payu_merchant_key = creds.payu_merchant_key || creds.merchant_key;
                 initialForm.payu_merchant_salt = creds.payu_merchant_salt || creds.merchant_salt;
             }
         }
      });
      setFormData(initialForm);

    } catch (error) {
      console.error("Failed to load settings:", error);
      toast({ title: 'Error', description: 'Failed to load payment settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGatewayChange = (type, field, value) => {
    setGateways(prev => prev.map(g => 
        g.gateway_type === type ? { ...g, [field]: value } : g
    ));
  };

  const handleFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await PaymentSettingsAPI.savePaymentSettings(user.id, settings.cod_enabled, settings.online_payments_enabled);

      for (const gateway of gateways) {
        let credsData = {};
        
        if (gateway.gateway_type === 'razorpay') {
            credsData = { key_id: formData.razorpay_key_id, key_secret: formData.razorpay_key_secret };
        } else if (gateway.gateway_type === 'stripe') {
            credsData = { publishable_key: formData.stripe_publishable_key, secret_key: formData.stripe_secret_key };
        } else if (gateway.gateway_type === 'paytm') {
            credsData = { 
                merchant_id: formData.paytm_mid, merchant_key: formData.paytm_merchant_key,
                website: formData.paytm_website, industry_type: formData.paytm_industry_type, channel_id: formData.paytm_channel_id 
            };
        } else if (gateway.gateway_type === 'cashfree') {
            credsData = { app_id: formData.cashfree_app_id, secret_key: formData.cashfree_secret_key };
        } else if (gateway.gateway_type === 'payu') {
            credsData = { merchant_key: formData.payu_merchant_key, merchant_salt: formData.payu_merchant_salt };
        }

        if (gateway.is_enabled) {
            const validation = PaymentCredentialsManager.validate(gateway.gateway_type, credsData);
            if (!validation.isValid) {
                toast({ title: `Invalid ${gateway.gateway_type} Settings`, description: "Please fill all required fields.", variant: "destructive" });
                setSaving(false);
                return;
            }
        }

        const formattedCreds = PaymentCredentialsManager.formatForStorage(gateway.gateway_type, credsData);
        
        await PaymentSettingsAPI.savePaymentGateway(
            user.id, gateway.gateway_type, gateway.is_enabled, gateway.test_mode, formattedCreds
        );
      }

      toast({ title: 'Success', description: 'Payment settings saved successfully.' });
      loadSettings(); 
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const SecretInput = ({ id, value, onChange, placeholder }) => (
    <div className="relative">
        <Input 
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            type={showSecrets[id] ? "text" : "password"}
        />
        <button 
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            onClick={() => setShowSecrets(prev => ({...prev, [id]: !prev[id]}))}
        >
            {showSecrets[id] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payment Settings</h1>
        <p className="text-slate-500 mt-2">Configure how you receive payments from customers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Enable or disable payment methods available at checkout.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label className="text-base">Cash on Delivery (COD)</Label>
                        <Switch checked={settings.cod_enabled} onCheckedChange={checked => setSettings(prev => ({...prev, cod_enabled: checked}))} />
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                        <Label className="text-base">Online Payments</Label>
                        <Switch checked={settings.online_payments_enabled} onCheckedChange={checked => setSettings(prev => ({...prev, online_payments_enabled: checked}))} />
                    </div>
                </CardContent>
            </Card>

            {settings.online_payments_enabled && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Gateways</CardTitle>
                        <CardDescription>Configure your preferred payment providers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeGateway} onValueChange={setActiveGateway} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-4 h-auto">
                                <TabsTrigger value="razorpay">Razorpay</TabsTrigger>
                                <TabsTrigger value="stripe">Stripe</TabsTrigger>
                                <TabsTrigger value="cashfree">Cashfree</TabsTrigger>
                                <TabsTrigger value="paytm">Paytm</TabsTrigger>
                                <TabsTrigger value="payu">PayU</TabsTrigger>
                                <TabsTrigger value="other">Other</TabsTrigger>
                            </TabsList>

                            {['razorpay', 'stripe', 'cashfree', 'paytm', 'payu', 'other'].map(type => (
                                <TabsContent key={type} value={type} className="space-y-4">
                                    <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 rounded-lg border">
                                        <div className="flex items-center gap-2">
                                            <Checkbox 
                                                id={`${type}-enabled`}
                                                checked={gateways.find(g => g.gateway_type === type)?.is_enabled}
                                                onCheckedChange={(checked) => handleGatewayChange(type, 'is_enabled', checked)}
                                            />
                                            <Label htmlFor={`${type}-enabled`} className="font-semibold capitalize">Enable {type}</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor={`${type}-test`} className="text-xs">Test Mode</Label>
                                            <Switch 
                                                id={`${type}-test`}
                                                checked={gateways.find(g => g.gateway_type === type)?.test_mode}
                                                onCheckedChange={(checked) => handleGatewayChange(type, 'test_mode', checked)}
                                            />
                                        </div>
                                    </div>

                                    {type === 'razorpay' && (
                                        <div className="space-y-3">
                                            <div className="grid gap-2"><Label>Key ID</Label><Input value={formData.razorpay_key_id || ''} onChange={(e) => handleFormChange('razorpay_key_id', e.target.value)} /></div>
                                            <div className="grid gap-2"><Label>Key Secret</Label><SecretInput id="rzp_sec" value={formData.razorpay_key_secret} onChange={(e) => handleFormChange('razorpay_key_secret', e.target.value)} /></div>
                                        </div>
                                    )}

                                    {type === 'stripe' && (
                                        <div className="space-y-3">
                                            <div className="grid gap-2"><Label>Publishable Key</Label><Input value={formData.stripe_publishable_key || ''} onChange={(e) => handleFormChange('stripe_publishable_key', e.target.value)} /></div>
                                            <div className="grid gap-2"><Label>Secret Key</Label><SecretInput id="str_sec" value={formData.stripe_secret_key} onChange={(e) => handleFormChange('stripe_secret_key', e.target.value)} /></div>
                                        </div>
                                    )}

                                    {type === 'cashfree' && (
                                        <div className="space-y-3">
                                            <div className="grid gap-2"><Label>App ID</Label><Input value={formData.cashfree_app_id || ''} onChange={(e) => handleFormChange('cashfree_app_id', e.target.value)} /></div>
                                            <div className="grid gap-2"><Label>Secret Key</Label><SecretInput id="cf_sec" value={formData.cashfree_secret_key} onChange={(e) => handleFormChange('cashfree_secret_key', e.target.value)} /></div>
                                        </div>
                                    )}

                                    {type === 'payu' && (
                                        <div className="space-y-3">
                                            <div className="grid gap-2"><Label>Merchant Key</Label><Input value={formData.payu_merchant_key || ''} onChange={(e) => handleFormChange('payu_merchant_key', e.target.value)} /></div>
                                            <div className="grid gap-2"><Label>Merchant Salt</Label><SecretInput id="pu_salt" value={formData.payu_merchant_salt} onChange={(e) => handleFormChange('payu_merchant_salt', e.target.value)} /></div>
                                        </div>
                                    )}

                                    {type === 'paytm' && (
                                        <div className="space-y-3">
                                            <div className="grid gap-2"><Label>Merchant ID (MID)</Label><Input value={formData.paytm_mid || ''} onChange={(e) => handleFormChange('paytm_mid', e.target.value)} /></div>
                                            <div className="grid gap-2"><Label>Merchant Key</Label><SecretInput id="ptm_key" value={formData.paytm_merchant_key} onChange={(e) => handleFormChange('paytm_merchant_key', e.target.value)} /></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2"><Label>Website</Label><Input value={formData.paytm_website || 'WEBSTAGING'} onChange={(e) => handleFormChange('paytm_website', e.target.value)} /></div>
                                                <div className="grid gap-2"><Label>Industry Type</Label><Input value={formData.paytm_industry_type || 'Retail'} onChange={(e) => handleFormChange('paytm_industry_type', e.target.value)} /></div>
                                            </div>
                                            <div className="grid gap-2"><Label>Channel ID</Label><Input value={formData.paytm_channel_id || 'WEB'} onChange={(e) => handleFormChange('paytm_channel_id', e.target.value)} /></div>
                                        </div>
                                    )}
                                    
                                    {type === 'other' && <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-lg">Custom methods coming soon.</div>}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>
            )}

            <Button onClick={saveSettings} disabled={saving} className="w-full h-12 text-lg">
                {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</> : <><Save className="mr-2 h-5 w-5" /> Save Payment Settings</>}
            </Button>
        </div>

        <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4 flex gap-3">
                    <Info className="h-6 w-6 text-blue-600 shrink-0" />
                    <p className="text-sm text-blue-700">
                        <strong>Important:</strong> Payments go directly to your gateway account. B2B Nexus does not hold or process your funds.
                    </p>
                </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>How to get Keys?</AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 space-y-2">
                        <p><strong>Razorpay:</strong> Settings &gt; API Keys.</p>
                        <p><strong>Stripe:</strong> Developers &gt; API Keys.</p>
                        <p><strong>Cashfree:</strong> Developers &gt; API Keys.</p>
                        <p><strong>Paytm:</strong> Dashboard &gt; API Keys.</p>
                        <p><strong>PayU:</strong> Settings &gt; Integration Details.</p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettingsPage;