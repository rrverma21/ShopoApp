import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Building2, CreditCard, Landmark, MapPin, QrCode, Trash2, Info, Receipt } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrency } from '@/lib/utils';
const SUPPORTED_COUNTRIES = [{
  name: "India",
  flag: "🇮🇳",
  currency: "INR",
  symbol: "₹"
}, {
  name: "Australia",
  flag: "🇦🇺",
  currency: "AUD",
  symbol: "$"
}, {
  name: "New Zealand",
  flag: "🇳🇿",
  currency: "NZD",
  symbol: "$"
}, {
  name: "Singapore",
  flag: "🇸🇬",
  currency: "SGD",
  symbol: "$"
}, {
  name: "Canada",
  flag: "🇨🇦",
  currency: "CAD",
  symbol: "$"
}, {
  name: "Pakistan",
  flag: "🇵🇰",
  currency: "PKR",
  symbol: "₨"
}, {
  name: "United Kingdom",
  flag: "🇬🇧",
  currency: "GBP",
  symbol: "£"
}, {
  name: "Austria",
  flag: "🇦🇹",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Belgium",
  flag: "🇧🇪",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Bulgaria",
  flag: "🇧🇬",
  currency: "BGN",
  symbol: "лв"
}, {
  name: "Croatia",
  flag: "🇭🇷",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Cyprus",
  flag: "🇨🇾",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Czech Republic",
  flag: "🇨🇿",
  currency: "CZK",
  symbol: "Kč"
}, {
  name: "Denmark",
  flag: "🇩🇰",
  currency: "DKK",
  symbol: "kr"
}, {
  name: "Estonia",
  flag: "🇪🇪",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Finland",
  flag: "🇫🇮",
  currency: "EUR",
  symbol: "€"
}, {
  name: "France",
  flag: "🇫🇷",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Germany",
  flag: "🇩🇪",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Greece",
  flag: "🇬🇷",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Hungary",
  flag: "🇭🇺",
  currency: "HUF",
  symbol: "Ft"
}, {
  name: "Ireland",
  flag: "🇮🇪",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Italy",
  flag: "🇮🇹",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Latvia",
  flag: "🇱🇻",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Lithuania",
  flag: "🇱🇹",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Luxembourg",
  flag: "🇱🇺",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Malta",
  flag: "🇲🇹",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Netherlands",
  flag: "🇳🇱",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Poland",
  flag: "🇵🇱",
  currency: "PLN",
  symbol: "zł"
}, {
  name: "Portugal",
  flag: "🇵🇹",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Romania",
  flag: "🇷🇴",
  currency: "RON",
  symbol: "lei"
}, {
  name: "Slovakia",
  flag: "🇸🇰",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Slovenia",
  flag: "🇸🇮",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Spain",
  flag: "🇪🇸",
  currency: "EUR",
  symbol: "€"
}, {
  name: "Sweden",
  flag: "🇸🇪",
  currency: "SEK",
  symbol: "kr"
}, {
  name: "UAE",
  flag: "🇦🇪",
  currency: "AED",
  symbol: "د.إ"
}, {
  name: "Saudi Arabia",
  flag: "🇸🇦",
  currency: "SAR",
  symbol: "﷼"
}, {
  name: "South Africa",
  flag: "🇿🇦",
  currency: "ZAR",
  symbol: "R"
}, {
  name: "China",
  flag: "🇨🇳",
  currency: "CNY",
  symbol: "¥"
}, {
  name: "South Korea",
  flag: "🇰🇷",
  currency: "KRW",
  symbol: "₩"
}, {
  name: "Mexico",
  flag: "🇲🇽",
  currency: "MXN",
  symbol: "$"
}, {
  name: "Vietnam",
  flag: "🇻🇳",
  currency: "VND",
  symbol: "₫"
}, {
  name: "Philippines",
  flag: "🇵🇭",
  currency: "PHP",
  symbol: "₱"
}, {
  name: "Bangladesh",
  flag: "🇧🇩",
  currency: "BDT",
  symbol: "৳"
}, {
  name: "Sri Lanka",
  flag: "🇱🇰",
  currency: "LKR",
  symbol: "₨"
}, {
  name: "United States",
  flag: "🇺🇸",
  currency: "USD",
  symbol: "$"
}, {
  name: "Malaysia",
  flag: "🇲🇾",
  currency: "MYR",
  symbol: "RM"
}, {
  name: "Japan",
  flag: "🇯🇵",
  currency: "JPY",
  symbol: "¥"
}];
const getTaxTypeForCountry = country => {
  const gst = ["India", "Australia", "New Zealand", "Singapore", "Canada"];
  const sst = ["Malaysia"];
  const consumption = ["Japan", "South Korea", "China"];
  const sales = ["United States", "Pakistan"];
  if (gst.includes(country)) return "GST";
  if (sst.includes(country)) return "SST";
  if (consumption.includes(country)) return "Consumption Tax";
  if (sales.includes(country)) return "Sales Tax";
  return "VAT";
};
const GeneralSettingsTab = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    updateCurrency
  } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopTypes, setShopTypes] = useState([]);
  const [uploadingQr, setUploadingQr] = useState(false);
  const userOrderMode = user?.profile?.order_mode || 'Retailer';
  const membershipPlanName = user?.profile?.membership_plans?.name || 'Unknown Plan';
  const [form, setForm] = useState({
    shop_type: '',
    country: 'India',
    tax_type: 'GST',
    description: '',
    search_keywords: '',
    seller_bank_name: '',
    seller_bank_account_number: '',
    seller_bank_ifsc: '',
    seller_bank_branch: '',
    seller_upi_id: '',
    seller_qr_code: '',
    seller_place_of_supply: ''
  });
  const createDefaultSettings = async () => {
    try {
      const defaultSettings = {
        user_id: user.id,
        shop_type: '',
        shop_category: userOrderMode,
        country: 'India',
        currency: 'INR',
        tax_type: 'GST',
        description: '',
        search_keywords: [],
        seller_bank_name: '',
        seller_bank_account_number: '',
        seller_bank_ifsc: '',
        seller_bank_branch: '',
        seller_upi_id: '',
        seller_qr_code: '',
        seller_place_of_supply: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const {
        data,
        error
      } = await supabase.from('pos_retailer_settings').insert(defaultSettings).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default settings:', error);
      throw error;
    }
  };
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch shop types
      const {
        data: typesData,
        error: typesError
      } = await supabase.from('shop_types').select('id, name').eq('is_active', true);
      if (typesError) throw typesError;
      setShopTypes(typesData || []);

      // Fetch settings using maybeSingle() to handle NULL case
      const {
        data: settingsData,
        error: settingsError
      } = await supabase.from('pos_retailer_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (settingsError) throw settingsError;

      // If no settings exist, create default settings
      if (!settingsData) {
        console.log('No settings found, creating default settings...');
        const newSettings = await createDefaultSettings();
        setForm({
          shop_type: newSettings.shop_type || '',
          country: newSettings.country || 'India',
          tax_type: newSettings.tax_type || 'GST',
          description: newSettings.description || '',
          search_keywords: '',
          seller_bank_name: '',
          seller_bank_account_number: '',
          seller_bank_ifsc: '',
          seller_bank_branch: '',
          seller_upi_id: '',
          seller_qr_code: '',
          seller_place_of_supply: ''
        });
        updateCurrency(newSettings.country || 'India');
        toast({
          title: "Welcome!",
          description: "Default settings have been created for you."
        });
      } else {
        // Settings exist, populate form
        setForm({
          shop_type: settingsData.shop_type || '',
          country: settingsData.country || 'India',
          tax_type: settingsData.tax_type || getTaxTypeForCountry(settingsData.country || 'India'),
          description: settingsData.description || '',
          search_keywords: Array.isArray(settingsData.search_keywords) ? settingsData.search_keywords.join(', ') : settingsData.search_keywords || '',
          seller_bank_name: settingsData.seller_bank_name || '',
          seller_bank_account_number: settingsData.seller_bank_account_number || '',
          seller_bank_ifsc: settingsData.seller_bank_ifsc || '',
          seller_bank_branch: settingsData.seller_bank_branch || '',
          seller_upi_id: settingsData.seller_upi_id || '',
          seller_qr_code: settingsData.seller_qr_code || '',
          seller_place_of_supply: settingsData.seller_place_of_supply || ''
        });
        updateCurrency(settingsData.country || 'India');
      }
    } catch (error) {
      console.error('Error fetching general settings:', error);
      toast({
        title: "Error",
        description: "Failed to load general settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleQrUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `seller-qr-codes/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('qrcodes').upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('qrcodes').getPublicUrl(filePath);
      setForm(prev => ({
        ...prev,
        seller_qr_code: publicUrl
      }));
      toast({
        title: "Success",
        description: "QR Code uploaded successfully"
      });
    } catch (error) {
      console.error('QR Upload Error:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingQr(false);
    }
  };
  const handleSave = async () => {
    if (userOrderMode === 'Wholesaler' || userOrderMode === 'Wholesale + Retail') {
      if (!form.seller_bank_name || !form.seller_bank_account_number || !form.seller_bank_ifsc) {
        toast({
          title: "Missing Bank Details",
          description: "Bank Name, Account Number, and IFSC are mandatory for Wholesalers and Hybrid modes.",
          variant: "destructive"
        });
        return;
      }
    }
    try {
      setSaving(true);
      const keywordsArray = form.search_keywords.split(',').map(k => k.trim()).filter(Boolean);

      // We must fetch existing to avoid overwriting unhandled fields
      const {
        data: existingData
      } = await supabase.from('pos_retailer_settings').select('*').eq('user_id', user.id).maybeSingle();
      const payload = {
        ...existingData,
        user_id: user.id,
        shop_type: form.shop_type,
        shop_category: userOrderMode,
        country: form.country,
        currency: SUPPORTED_COUNTRIES.find(c => c.name === form.country)?.currency || 'INR',
        tax_type: form.tax_type,
        description: form.description,
        search_keywords: keywordsArray,
        seller_bank_name: form.seller_bank_name,
        seller_bank_account_number: form.seller_bank_account_number,
        seller_bank_ifsc: form.seller_bank_ifsc?.toUpperCase(),
        seller_bank_branch: form.seller_bank_branch,
        seller_upi_id: form.seller_upi_id,
        seller_qr_code: form.seller_qr_code,
        seller_place_of_supply: form.seller_place_of_supply,
        updated_at: new Date().toISOString()
      };
      const {
        error
      } = await supabase.from('pos_retailer_settings').upsert(payload, {
        onConflict: 'user_id'
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Settings have been saved successfully."
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        <p className="text-slate-500 font-medium">Loading settings...</p>
      </div>;
  }
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Shop Information</CardTitle>
          <CardDescription>Basic details about your shop configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="shopType">Shop Type</Label>
              <Select value={form.shop_type} onValueChange={val => setForm({
              ...form,
              shop_type: val
            })}>
                <SelectTrigger id="shopType">
                  <SelectValue placeholder="Select shop type" />
                </SelectTrigger>
                <SelectContent>
                  {shopTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country & Currency</Label>
              <Select value={form.country} onValueChange={val => {
              const newTaxType = getTaxTypeForCountry(val);
              setForm({
                ...form,
                country: val,
                tax_type: newTaxType
              });
              updateCurrency(val);
            }}>
                <SelectTrigger id="country" className="h-10">
                  <SelectValue placeholder="Select country">
                    {(() => {
                    const c = SUPPORTED_COUNTRIES.find(c => c.name === form.country);
                    return c ? <div className="flex items-center gap-2">
                          <span className="country-flag text-base leading-none">{c.flag}</span>
                          <span>{c.name} - {c.symbol}</span>
                        </div> : form.country || "Select country";
                  })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {SUPPORTED_COUNTRIES.map(country => <SelectItem key={country.name} value={country.name}>
                      <div className="flex items-center gap-2">
                        <span className="country-flag text-base leading-none">{country.flag}</span>
                        <span>{country.name} - {country.symbol}</span>
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Applicable Tax Type</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Automatically determined by selected country.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Receipt className="h-4 w-4 text-indigo-500" />
                {form.tax_type || 'Tax'}
              </div>
              <p className="text-xs text-slate-500">This tax format will be used across POS and Invoices.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Order Mode (Business Category)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Controlled by your membership plan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-col gap-1">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{userOrderMode}</span>
                  <Badge variant="secondary" className="font-normal text-xs bg-white dark:bg-slate-700">
                    from {membershipPlanName}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">This is set by your Membership Plan.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="A short description of your shop" className="resize-none" rows={3} value={form.description} onChange={e => setForm({
            ...form,
            description: e.target.value
          })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Search Keywords (comma-separated)</Label>
            <Input id="keywords" placeholder="gifts, stationery, dairy products" value={form.search_keywords} onChange={e => setForm({
            ...form,
            search_keywords: e.target.value
          })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-blue-600" />
            Bank & Tax Details
          </CardTitle>
          <CardDescription>
            Details used for invoicing and payments. Mandatory for Wholesalers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name {(userOrderMode === 'Wholesaler' || userOrderMode === 'Wholesale + Retail') && <span className="text-red-500">*</span>}</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="bankName" className="pl-9" placeholder="e.g. HDFC Bank" value={form.seller_bank_name} onChange={e => setForm({
                ...form,
                seller_bank_name: e.target.value
              })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number {(userOrderMode === 'Wholesaler' || userOrderMode === 'Wholesale + Retail') && <span className="text-red-500">*</span>}</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="accountNumber" className="pl-9" placeholder="000000000000" value={form.seller_bank_account_number} onChange={e => setForm({
                ...form,
                seller_bank_account_number: e.target.value
              })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifsc">IFSC Code {(userOrderMode === 'Wholesaler' || userOrderMode === 'Wholesale + Retail') && <span className="text-red-500">*</span>}</Label>
              <Input id="ifsc" placeholder="HDFC0001234" className="uppercase" maxLength={11} value={form.seller_bank_ifsc} onChange={e => setForm({
              ...form,
              seller_bank_ifsc: e.target.value.toUpperCase()
            })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch Name</Label>
              <Input id="branch" placeholder="e.g. Mumbai Main" value={form.seller_bank_branch} onChange={e => setForm({
              ...form,
              seller_bank_branch: e.target.value
            })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="upi">UPI ID (VPA)</Label>
              <Input id="upi" placeholder="username@bank" value={form.seller_upi_id} onChange={e => setForm({
              ...form,
              seller_upi_id: e.target.value
            })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos">Place of Supply (City/State)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="pos" className="pl-9" placeholder="e.g. Mumbai, Maharashtra" value={form.seller_place_of_supply} onChange={e => setForm({
                ...form,
                seller_place_of_supply: e.target.value
              })} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment QR Code</Label>
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative">
                {form.seller_qr_code ? <>
                    <img src={form.seller_qr_code} alt="QR Code" className="w-full h-full object-cover" />
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 hover:opacity-100 transition-opacity" onClick={() => setForm({
                  ...form,
                  seller_qr_code: ''
                })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </> : <QrCode className="h-10 w-10 text-slate-300" />}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" className="w-full text-sm" onChange={handleQrUpload} disabled={uploadingQr} />
                  {uploadingQr && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <p className="text-xs text-muted-foreground">Upload your UPI QR code image to display on invoices.</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end bg-slate-50 dark:bg-slate-900 border-t rounded-b-xl p-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>;
};
export default GeneralSettingsTab;