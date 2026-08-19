import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Eye, EyeOff, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { PaymentCredentialsManager } from '@/lib/PaymentCredentialsManager';
import { PaymentSettingsAPI } from '@/lib/PaymentSettingsAPI';

const CashfreePaymentSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    
    const [formData, setFormData] = useState({
        app_id: '',
        secret_key: '',
        environment: 'TEST', // TEST or PROD
    });

    useEffect(() => {
        if (user) loadCredentials();
    }, [user]);

    const loadCredentials = async () => {
        setLoading(true);
        try {
            const data = await PaymentSettingsAPI.getPaymentSettings(user.id);
            const cfGateway = data.gateways.find(g => g.gateway_type === 'cashfree');
            
            if (cfGateway && cfGateway.credentials) {
                setFormData({
                    app_id: cfGateway.credentials.app_id || '',
                    secret_key: cfGateway.credentials.secret_key || '',
                    environment: cfGateway.test_mode ? 'TEST' : 'PROD'
                });
            }
        } catch (error) {
            console.error("Failed to load credentials:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.app_id || !formData.secret_key) {
            toast({ title: "Validation Error", description: "App ID and Secret Key are required.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const creds = {
                app_id: formData.app_id,
                secret_key: formData.secret_key
            };
            
            // Format for storage using existing manager logic if applicable, or raw
            // Assuming PaymentCredentialsManager handles basic JSON structure
            
            await PaymentSettingsAPI.savePaymentGateway(
                user.id,
                'cashfree',
                true, // enabled
                formData.environment === 'TEST',
                creds
            );

            toast({ title: "Success", description: "Cashfree settings saved successfully." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Copied to clipboard" });
    };

    const apiBaseUrl = formData.environment === 'PROD' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Cashfree Payments</CardTitle>
                            <CardDescription>Configure Cashfree Payment Gateway for your shop.</CardDescription>
                        </div>
                        {formData.environment === 'TEST' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Test Mode</Badge>}
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="config" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="config">Configuration</TabsTrigger>
                            <TabsTrigger value="webhook">Webhook Setup</TabsTrigger>
                            <TabsTrigger value="help">Help</TabsTrigger>
                        </TabsList>

                        <TabsContent value="config" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Environment</Label>
                                <Select 
                                    value={formData.environment} 
                                    onValueChange={(val) => setFormData({...formData, environment: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Environment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TEST">Test (Sandbox)</SelectItem>
                                        <SelectItem value="PROD">Production</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>App ID</Label>
                                <Input 
                                    value={formData.app_id} 
                                    onChange={(e) => setFormData({...formData, app_id: e.target.value})}
                                    placeholder="Enter Cashfree App ID"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Secret Key</Label>
                                <div className="relative">
                                    <Input 
                                        type={showSecret ? "text" : "password"}
                                        value={formData.secret_key} 
                                        onChange={(e) => setFormData({...formData, secret_key: e.target.value})}
                                        placeholder="Enter Cashfree Secret Key"
                                    />
                                    <button 
                                        type="button"
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowSecret(!showSecret)}
                                    >
                                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>API Base URL (Auto-set)</Label>
                                <Input value={apiBaseUrl} disabled className="bg-slate-50" />
                            </div>
                        </TabsContent>

                        <TabsContent value="webhook" className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
                                Configure this webhook URL in your Cashfree Dashboard to receive payment updates automatically.
                            </div>
                            <div className="space-y-2">
                                <Label>Webhook URL</Label>
                                <div className="flex gap-2">
                                    <Input value={`${window.location.origin}/api/webhooks/cashfree`} readOnly />
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${window.location.origin}/api/webhooks/cashfree`)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="help" className="space-y-4">
                            <div className="prose prose-sm text-slate-600">
                                <h3>How to get API Keys?</h3>
                                <ol>
                                    <li>Log in to your <strong>Cashfree Dashboard</strong>.</li>
                                    <li>Switch to the desired environment (Test or Production).</li>
                                    <li>Navigate to <strong>Developers &gt; API Keys</strong>.</li>
                                    <li>Generate new keys if you haven't already.</li>
                                    <li>Copy the <strong>App ID</strong> and <strong>Secret Key</strong>.</li>
                                </ol>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline">Test Connection</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Settings
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default CashfreePaymentSettings;