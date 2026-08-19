import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Building, FileText, CreditCard, Upload, X, QrCode } from 'lucide-react';

const DiorSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      gstin: '',
      invoice_prefix: 'INV-',
      invoice_start_number: 1001,
      default_terms: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within the due date.',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      upi_id: ''
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('dior_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }

        if (data) {
          setValue('gstin', data.gstin || '');
          setValue('invoice_prefix', data.invoice_prefix || 'INV-');
          setValue('invoice_start_number', data.invoice_start_number || 1001);
          setValue('default_terms', data.default_terms || '');
          setQrCodeUrl(data.payment_qr_code_url || '');
          
          if (data.bank_details) {
            setValue('bank_name', data.bank_details.bank_name || '');
            setValue('account_number', data.bank_details.account_number || '');
            setValue('ifsc_code', data.bank_details.ifsc_code || '');
            setValue('branch_name', data.bank_details.branch_name || '');
            setValue('upi_id', data.bank_details.upi_id || '');
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user, setValue, toast]);

  const handleQrUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "QR Code image must be less than 2MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingQr(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('qrcodes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('qrcodes')
        .getPublicUrl(filePath);

      setQrCodeUrl(publicUrl);
      toast({
        title: "Success",
        description: "QR Code uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading QR code:', error);
      toast({
        title: "Upload Failed",
        description: "Could not upload QR code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingQr(false);
    }
  };

  const removeQrCode = () => {
    setQrCodeUrl('');
  };

  const onSubmit = async (formData) => {
    if (!user) return;
    setIsSaving(true);

    const bankDetails = {
      bank_name: formData.bank_name,
      account_number: formData.account_number,
      ifsc_code: formData.ifsc_code,
      branch_name: formData.branch_name,
      upi_id: formData.upi_id
    };

    const settingsData = {
      user_id: user.id,
      gstin: formData.gstin,
      invoice_prefix: formData.invoice_prefix,
      invoice_start_number: parseInt(formData.invoice_start_number),
      default_terms: formData.default_terms,
      bank_details: bankDetails,
      payment_qr_code_url: qrCodeUrl,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('dior_settings')
        .upsert(settingsData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Settings saved successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">DIOR Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Manage your business settings, invoice preferences, and banking details for the DIOR module.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building className="h-4 w-4" /> General
            </TabsTrigger>
            <TabsTrigger value="invoicing" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Invoicing
            </TabsTrigger>
            <TabsTrigger value="banking" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Banking
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
                <CardDescription>
                  Configure your core business identification details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN (Goods and Services Tax Identification Number)</Label>
                  <Input 
                    id="gstin" 
                    placeholder="e.g. 22AAAAA0000A1Z5" 
                    {...register('gstin', { 
                      pattern: {
                        value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                        message: "Invalid GSTIN format"
                      }
                    })} 
                  />
                  {errors.gstin && <p className="text-sm text-red-500">{errors.gstin.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    This GSTIN will be displayed on all your generated invoices.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoicing Settings Tab */}
          <TabsContent value="invoicing">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Configuration</CardTitle>
                <CardDescription>
                  Customize how your invoices are generated and numbered.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                    <Input 
                      id="invoice_prefix" 
                      placeholder="e.g. INV-" 
                      {...register('invoice_prefix')} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_start_number">Starting Number</Label>
                    <Input 
                      id="invoice_start_number" 
                      type="number" 
                      placeholder="e.g. 1001" 
                      {...register('invoice_start_number')} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_terms">Default Terms & Conditions</Label>
                  <Textarea 
                    id="default_terms" 
                    placeholder="Enter your standard terms and conditions..." 
                    className="min-h-[120px]"
                    {...register('default_terms')} 
                  />
                  <p className="text-xs text-muted-foreground">
                    These terms will appear at the bottom of every invoice by default.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banking Settings Tab */}
          <TabsContent value="banking">
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>
                  These details will be printed on invoices for receiving payments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input 
                      id="bank_name" 
                      placeholder="e.g. HDFC Bank" 
                      {...register('bank_name')} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch_name">Branch Name</Label>
                    <Input 
                      id="branch_name" 
                      placeholder="e.g. Koramangala Branch" 
                      {...register('branch_name')} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input 
                      id="account_number" 
                      placeholder="Enter account number" 
                      {...register('account_number')} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                    <Input 
                      id="ifsc_code" 
                      placeholder="e.g. HDFC0001234" 
                      {...register('ifsc_code')} 
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <QrCode className="h-5 w-5" /> Digital Payments
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="upi_id">UPI ID (VPA)</Label>
                      <Input 
                        id="upi_id" 
                        placeholder="e.g. business@okhdfcbank" 
                        {...register('upi_id')} 
                      />
                      <p className="text-xs text-muted-foreground">
                        Your Unified Payments Interface ID for direct transfers.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment QR Code</Label>
                      <div className="flex flex-col gap-4">
                        {qrCodeUrl ? (
                          <div className="relative w-40 h-40 border rounded-lg overflow-hidden group">
                            <img 
                              src={qrCodeUrl} 
                              alt="Payment QR Code" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={removeQrCode}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-40 h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
                            <QrCode className="h-8 w-8 mb-2 opacity-50" />
                            <span className="text-xs">No QR Code</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="qr-upload"
                            onChange={handleQrUpload}
                            disabled={isUploadingQr}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isUploadingQr}
                            onClick={() => document.getElementById('qr-upload').click()}
                          >
                            {isUploadingQr ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {qrCodeUrl ? 'Change QR Code' : 'Upload QR Code'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Settings
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
};

export default DiorSettings;