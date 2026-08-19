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
import { Loader2, Save, Eye, EyeOff, Info } from 'lucide-react';

const PaymentSettingsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [savingGateway, setSavingGateway] = useState(null); // Track which gateway is currently saving
  const [settings, setSettings] = useState({ cod_enabled: true, online_payments_enabled: false });
  const [gateways, setGateways] = useState([]);
  
  const [activeGateway, setActiveGateway] = useState('razorpay');
  const [formData, setFormData] = useState({});
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await PaymentSettingsAPI.getPaymentSettings(user.id);
      setSettings(data.settings || { cod_enabled: true, online_payments_enabled: false });
      
      const fetchedGateways = data.gateways || [];
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
      
      const initialForm = {};
      initialGateways.forEach(g => {
         // Safely access credentials
         const creds = g.credentials || {};
         
         if (g.gateway_type === 'razorpay') {
             initialForm.razorpay_key_id = creds.razorpay_key_id || creds.key_id || '';
             initialForm.razorpay_key_secret = creds.razorpay_key_secret || creds.key_secret || '';
         } else if (g.gateway_type === 'stripe') {
             initialForm.stripe_publishable_key = creds.stripe_publishable_key || creds.publishable_key || '';
             initialForm.stripe_secret_key = creds.stripe_secret_key || creds.secret_key || '';
         } else if (g.gateway_type === 'paytm') {
             initialForm.paytm_mid = creds.paytm_mid || creds.merchant_id || '';
             initialForm.paytm_merchant_key = creds.paytm_merchant_key || creds.merchant_key || '';
             initialForm.paytm_website = creds.paytm_website || creds.website || 'WEBSTAGING';
             initialForm.paytm_industry_type = creds.paytm_industry_type || creds.industry_type || 'Retail';
             initialForm.paytm_channel_id = creds.paytm_channel_id || creds.channel_id || 'WEB';
         } else if (g.gateway_type === 'cashfree') {
             initialForm.cashfree_app_id = creds.cashfree_app_id || creds.app_id || '';
             initialForm.cashfree_secret_key = creds.cashfree_secret_key || creds.secret_key || '';
         } else if (g.gateway_type === 'payu') {
             initialForm.payu_merchant_key = creds.payu_merchant_key || creds.merchant_key || '';
             initialForm.payu_merchant_salt = creds.payu_merchant_salt || creds.merchant_salt || '';
         }
      });
      setFormData(initialForm);

    } catch (error) {
      console.error("Failed to load settings:", error);
      toast({ title: 'Error', description: 'Failed to load payment settings', variant: 'destructive' });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleOnlinePaymentToggle = async (checked) => {
    // Optimistic UI update
    setSettings(prev => ({...prev, online_payments_enabled: checked}));

    try {
        await PaymentSettingsAPI.savePaymentSettings(user.id, settings.cod_enabled, checked);
        toast({ 
            title: checked ? "Online Payments Enabled" : "Online Payments Disabled", 
            description: "Your preference has been saved." 
        });
    } catch (err) {
        console.error("Toggle save error:", err);
        toast({ 
            title: "Error", 
            description: "Failed to update status. Please try again.", 
            variant: "destructive" 
        });
        // Revert UI on failure
        setSettings(prev => ({...prev, online_payments_enabled: !checked}));
    }
  };

  const handleCODToggle = async (checked) => {
    setSettings(prev => ({...prev, cod_enabled: checked}));
    try {
        await PaymentSettingsAPI.savePaymentSettings(user.id, checked, settings.online_payments_enabled);
        toast({ title: "Updated", description: "COD setting saved." });
    } catch (err) {
        toast({ title: "Error", description: "Failed to save COD setting", variant: "destructive" });
        setSettings(prev => ({...prev, cod_enabled: !checked}));
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

  // Specific validation helper for Paytm
  const validatePaytm = (data) => {
      const errors = [];
      if (!data.merchant_id || !data.merchant_id.trim()) errors.push("Merchant ID (MID)");
      if (!data.merchant_key || !data.merchant_key.trim()) errors.push("Merchant Key");
      return errors;
  };

  // Independent save handler for a specific gateway
  const handleSaveGateway = async (gatewayType) => {
    setSavingGateway(gatewayType);
    
    try {
        const gateway = gateways.find(g => g.gateway_type === gatewayType);
        if (!gateway) throw new Error("Gateway not found");

        let credsData = {};
        
        // Extract credentials ONLY for the target gateway
        if (gatewayType === 'razorpay') {
            credsData = { key_id: formData.razorpay_key_id, key_secret: formData.razorpay_key_secret };
        } else if (gatewayType === 'stripe') {
            credsData = { publishable_key: formData.stripe_publishable_key, secret_key: formData.stripe_secret_key };
        } else if (gatewayType === 'paytm') {
            credsData = { 
                merchant_id: formData.paytm_mid, 
                merchant_key: formData.paytm_merchant_key,
                website: formData.paytm_website || 'WEBSTAGING', 
                industry_type: formData.paytm_industry_type || 'Retail', 
                channel_id: formData.paytm_channel_id || 'WEB'
            };
        } else if (gatewayType === 'cashfree') {
            credsData = { app_id: formData.cashfree_app_id, secret_key: formData.cashfree_secret_key };
        } else if (gatewayType === 'payu') {
            credsData = { merchant_key: formData.payu_merchant_key, merchant_salt: formData.payu_merchant_salt };
        }

        // VALIDATION: Run validation strictly scoped to THIS gateway
        if (gateway.is_enabled) {
            if (gatewayType === 'paytm') {
                const missingFields = validatePaytm(credsData);
                if (missingFields.length > 0) {
                    toast({ 
                        title: `Validation Error`, 
                        description: `Please fill required fields: ${missingFields.join(', ')}`, 
                        variant: "destructive" 
                    });
                    setSavingGateway(null);
                    return; 
                }
            } else {
                // Use generic manager for others
                const validation = PaymentCredentialsManager.validate(gatewayType, credsData);
                if (!validation.isValid) {
                    toast({ 
                        title: `Invalid Settings`, 
                        description: `Please check your ${gatewayType} credentials. All fields are required to enable it.`, 
                        variant: "destructive" 
                    });
                    setSavingGateway(null);
                    return;
                }
            }
        }

        // FORMAT: Prepare credentials for storage
        const formattedCreds = PaymentCredentialsManager.formatForStorage(gatewayType, credsData);
        
        // SAVE: Call API only for this gateway
        await PaymentSettingsAPI.savePaymentGateway(
            user.id, gatewayType, gateway.is_enabled, gateway.test_mode, formattedCreds
        );

        toast({ 
            title: 'Success', 
            description: `${gatewayType.charAt(0).toUpperCase() + gatewayType.slice(1)} settings saved successfully.` 
        });

        // REFRESH: Reload to ensure local state matches DB (without full UI flicker)
        await loadSettings(false);

    } catch (error) {
        console.error(`Error saving ${gatewayType}:`, error);
        toast({ title: 'Save Failed', description: `Could not save ${gatewayType} settings.`, variant: 'destructive' });
    } finally {
        setSavingGateway(null);
    }
  };

  const SecretInput = ({ id, value, onChange, placeholder }) => (
    <div className="relative">
        <Input 
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            type={showSecrets[id] ? "text" : "password"}
            className="pr-10"
        />
        <button 
            type="button"
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            onClick={() => setShowSecrets(prev => ({...prev, [id]: !prev[id]}))}
        >
            {showSecrets[id] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  return (
    <div className="space-y-6">
        {/* Global Settings Card */}
        <Card>
            <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Enable or disable payment methods available at checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <Label className="text-base cursor-pointer" htmlFor="cod-switch">Cash on Delivery (COD)</Label>
                    <Switch id="cod-switch" checked={settings.cod_enabled} onCheckedChange={handleCODToggle} />
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                    <div className="space-y-1">
                        <Label className="text-base cursor-pointer" htmlFor="online-switch">Online Payments</Label>
                        <p className="text-sm text-slate-500">Allow customers to pay via Gateways (UPI, Cards, Netbanking)</p>
                    </div>
                    <Switch 
                        id="online-switch"
                        checked={settings.online_payments_enabled} 
                        onCheckedChange={handleOnlinePaymentToggle} 
                    />
                </div>
            </CardContent>
        </Card>

        {/* Gateway Configuration - Only visible if Online Payments are enabled */}
        {settings.online_payments_enabled && (
            <Card>
                <CardHeader>
                    <CardTitle>Payment Gateways</CardTitle>
                    <CardDescription>Configure credentials for each provider independently.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeGateway} onValueChange={setActiveGateway} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-4 h-auto">
                            <TabsTrigger value="razorpay">Razorpay</TabsTrigger>
                            <TabsTrigger value="stripe">Stripe</TabsTrigger>
                            <TabsTrigger value="cashfree">Cashfree</TabsTrigger>
                            <TabsTrigger value="paytm">Paytm</TabsTrigger>
                            <TabsTrigger value="payu">PayU</TabsTrigger>
                            <TabsTrigger value="other">Other</TabsTrigger>
                        </TabsList>

                        {/* Iterate over supported gateways to render content */}
                        {['razorpay', 'stripe', 'cashfree', 'paytm', 'payu', 'other'].map(type => (
                            <TabsContent key={type} value={type} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                
                                {/* Header / Enable Toggle for this specific gateway */}
                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border">
                                    <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id={`${type}-enabled`}
                                            checked={gateways.find(g => g.gateway_type === type)?.is_enabled}
                                            onCheckedChange={(checked) => handleGatewayChange(type, 'is_enabled', checked)}
                                        />
                                        <Label htmlFor={`${type}-enabled`} className="font-semibold capitalize cursor-pointer">Enable {type}</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`${type}-test`} className="text-xs cursor-pointer">Test Mode</Label>
                                        <Switch 
                                            id={`${type}-test`}
                                            checked={gateways.find(g => g.gateway_type === type)?.test_mode}
                                            onCheckedChange={(checked) => handleGatewayChange(type, 'test_mode', checked)}
                                        />
                                    </div>
                                </div>

                                {/* Form Fields - Specific to gateway type */}
                                <div className="p-1">
                                    {type === 'razorpay' && (
                                        <div className="space-y-4">
                                            <div className="grid gap-2"><Label>Key ID</Label><Input value={formData.razorpay_key_id || ''} onChange={(e) => handleFormChange('razorpay_key_id', e.target.value)} placeholder="rzp_test_..." /></div>
                                            <div className="grid gap-2"><Label>Key Secret</Label><SecretInput id="rzp_sec" value={formData.razorpay_key_secret} onChange={(e) => handleFormChange('razorpay_key_secret', e.target.value)} placeholder="Enter Key Secret" /></div>
                                        </div>
                                    )}

                                    {type === 'stripe' && (
                                        <div className="space-y-4">
                                            <div className="grid gap-2"><Label>Publishable Key</Label><Input value={formData.stripe_publishable_key || ''} onChange={(e) => handleFormChange('stripe_publishable_key', e.target.value)} placeholder="pk_test_..." /></div>
                                            <div className="grid gap-2"><Label>Secret Key</Label><SecretInput id="str_sec" value={formData.stripe_secret_key} onChange={(e) => handleFormChange('stripe_secret_key', e.target.value)} placeholder="sk_test_..." /></div>
                                        </div>
                                    )}

                                    {type === 'cashfree' && (
                                        <div className="space-y-4">
                                            <div className="grid gap-2"><Label>App ID</Label><Input value={formData.cashfree_app_id || ''} onChange={(e) => handleFormChange('cashfree_app_id', e.target.value)} placeholder="Enter App ID" /></div>
                                            <div className="grid gap-2"><Label>Secret Key</Label><SecretInput id="cf_sec" value={formData.cashfree_secret_key} onChange={(e) => handleFormChange('cashfree_secret_key', e.target.value)} placeholder="Enter Secret Key" /></div>
                                        </div>
                                    )}

                                    {type === 'payu' && (
                                        <div className="space-y-4">
                                            <div className="grid gap-2"><Label>Merchant Key</Label><Input value={formData.payu_merchant_key || ''} onChange={(e) => handleFormChange('payu_merchant_key', e.target.value)} placeholder="Enter Merchant Key" /></div>
                                            <div className="grid gap-2"><Label>Merchant Salt</Label><SecretInput id="pu_salt" value={formData.payu_merchant_salt} onChange={(e) => handleFormChange('payu_merchant_salt', e.target.value)} placeholder="Enter Salt" /></div>
                                        </div>
                                    )}

                                    {type === 'paytm' && (
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label>Merchant ID (MID) <span className="text-red-500">*</span></Label>
                                                <Input 
                                                    value={formData.paytm_mid || ''} 
                                                    onChange={(e) => handleFormChange('paytm_mid', e.target.value)} 
                                                    placeholder="Enter your Paytm MID"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Merchant Key <span className="text-red-500">*</span></Label>
                                                <SecretInput 
                                                    id="ptm_key" 
                                                    value={formData.paytm_merchant_key} 
                                                    onChange={(e) => handleFormChange('paytm_merchant_key', e.target.value)} 
                                                    placeholder="Enter your Paytm Merchant Key"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label>Website</Label>
                                                    <Input value={formData.paytm_website || 'WEBSTAGING'} onChange={(e) => handleFormChange('paytm_website', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Industry Type</Label>
                                                    <Input value={formData.paytm_industry_type || 'Retail'} onChange={(e) => handleFormChange('paytm_industry_type', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Channel ID</Label>
                                                <Input value={formData.paytm_channel_id || 'WEB'} onChange={(e) => handleFormChange('paytm_channel_id', e.target.value)} />
                                            </div>
                                            <div className="flex gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-md items-start">
                                                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <p>For testing, use 'WEBSTAGING' as Website. For production, use 'DEFAULT'.</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {type === 'other' && <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed">Custom payment methods coming soon.</div>}
                                </div>

                                {/* Save Button - Updated to solid blue styling */}
                                {type !== 'other' && (
                                    <div className="flex justify-end pt-4 border-t mt-4">
                                        <Button 
                                            onClick={() => handleSaveGateway(type)} 
                                            disabled={savingGateway === type} 
                                            className="min-w-[140px] bg-[#3B82F6] hover:bg-blue-600 text-white shadow-md transition-all active:scale-95 border-none"
                                        >
                                            {savingGateway === type ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                            ) : (
                                                <><Save className="w-4 h-4 mr-2" /> Save {type.charAt(0).toUpperCase() + type.slice(1)}</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        )}

        <div className="space-y-4 pt-4">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Where do I find my API Keys?</AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 space-y-2 pl-4 border-l-2 border-slate-200 ml-2">
                        <p><strong className="text-slate-800">Razorpay:</strong> Go to Settings &gt; API Keys in your dashboard.</p>
                        <p><strong className="text-slate-800">Stripe:</strong> Go to Developers &gt; API Keys.</p>
                        <p><strong className="text-slate-800">Cashfree:</strong> Go to Developers &gt; API Keys.</p>
                        <p><strong className="text-slate-800">Paytm:</strong> Go to Dashboard &gt; API Keys (Developer Settings).</p>
                        <p><strong className="text-slate-800">PayU:</strong> Go to Settings &gt; Integration Details.</p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </div>
  );
};

export default PaymentSettingsTab;