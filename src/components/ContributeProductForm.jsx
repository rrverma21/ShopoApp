import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Camera, Search, AlertCircle, Edit2, X, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import SuggestEditModal from '@/components/SuggestEditModal';
import SubmissionReceipt from '@/components/SubmissionReceipt';
import { useDebounce } from '@/hooks/useDebounce';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import MyContributionHistory from '@/components/MyContributionHistory';
import RewardPeriodsDisplay from '@/components/RewardPeriodsDisplay';

const ContributeProductForm = () => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors }, setError, clearErrors } = useForm();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [checkingBarcode, setCheckingBarcode] = useState(false);
  const [existingProduct, setExistingProduct] = useState(null);
  const [duplicateContribution, setDuplicateContribution] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);
  
  const [frontImage, setFrontImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  
  const [backImage, setBackImage] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  
  const [showScanner, setShowScanner] = useState(false);
  const [userPhone, setUserPhone] = useState(null);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);

  const barcodeValue = watch('barcode');
  const debouncedBarcode = useDebounce(barcodeValue, 500); // 500ms debounce as requested

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserPhone(user?.phone || user?.user_metadata?.phone || 'Anonymous');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const checkBarcode = async () => {
      const cleanBarcode = debouncedBarcode?.trim();
      
      if (!cleanBarcode || cleanBarcode.length < 3) {
        setExistingProduct(null);
        setDuplicateContribution(false);
        return;
      }
      
      setCheckingBarcode(true);
      setDuplicateContribution(false);
      
      try {
        // 1. Check if product already exists in the master catalog
        const { data: masterData, error: masterError } = await supabase
          .from('product_master')
          .select('*')
          .ilike('barcode', cleanBarcode)
          .maybeSingle();

        if (masterData) {
          setExistingProduct(masterData);
          setDuplicateContribution(false);
        } else {
          setExistingProduct(null);
          
          // 2. Check if product has already been contributed (Real-time duplicate check)
          const { data: contribData, error: contribError } = await supabase
            .from('product_contributions')
            .select('id')
            .ilike('barcode', cleanBarcode)
            .maybeSingle();
            
          if (contribData) {
            setDuplicateContribution(true);
          } else {
            setDuplicateContribution(false);
          }
        }
      } catch (err) {
        console.error("Barcode check failed:", err);
      } finally {
        setCheckingBarcode(false);
      }
    };

    checkBarcode();
  }, [debouncedBarcode]);

  const handleScan = (code) => {
    const cleanCode = code?.trim();
    setValue('barcode', cleanCode, { shouldValidate: true, shouldDirty: true });
    setShowScanner(false);
    toast({ title: "Barcode Scanned", description: `Captured code: ${cleanCode}` });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      if (type === 'front') {
        setFrontImage(file);
        setFrontPreview(previewUrl);
        if (errors.frontImage) clearErrors('frontImage');
      } else {
        setBackImage(file);
        setBackPreview(previewUrl);
      }
    }
  };

  const handleRemoveFile = (type) => {
    if (type === 'front') {
      setFrontImage(null);
      setFrontPreview(null);
    } else {
      setBackImage(null);
      setBackPreview(null);
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(`contributions/${fileName}`, file);

    if (uploadError) throw uploadError;
    
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(`contributions/${fileName}`);
      
    return publicUrlData.publicUrl;
  };

  const onSubmit = async (formData) => {
    if (existingProduct) {
      setShowEditModal(true);
      return;
    }

    if (duplicateContribution) {
      toast({ 
        title: "Duplicate Barcode Detected", 
        description: "This barcode already exists in our database. Please use a different barcode.", 
        variant: "destructive" 
      });
      return;
    }

    if (!frontImage) {
      setError('frontImage', { type: 'manual', message: 'Front image is required' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentPhone = user?.phone || user?.user_metadata?.phone || 'Anonymous';
      const userId = user?.id;

      let frontUrl = null;
      let backUrl = null;

      if (frontImage) {
        frontUrl = await uploadImage(frontImage);
      }
      
      if (backImage) {
        backUrl = await uploadImage(backImage);
      }

      const { data, error } = await supabase
        .from('product_contributions')
        .insert({
          barcode: formData.barcode.trim(),
          product_name: formData.product_name.trim(),
          mrp: formData.mrp,
          image_url: frontUrl,
          image_url_back: backUrl,
          status: 'pending',
          user_id: userId,
          phone: currentPhone 
        })
        .select()
        .single();

      if (error) throw error;

      toast({ 
        title: "Success! 🎉", 
        description: "Your product contribution has been submitted successfully.", 
        className: "bg-green-50 border-green-200" 
      });

      setSubmissionData(data);
      reset();
      setFrontImage(null);
      setFrontPreview(null);
      setBackImage(null);
      setBackPreview(null);
      setRefreshHistoryTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error("Submission error:", error);
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submissionData) {
    return (
      <div className="py-8">
        <RewardPeriodsDisplay />
        <SubmissionReceipt 
          data={submissionData} 
          onClose={() => setSubmissionData(null)} 
        />
        {userPhone && (
          <MyContributionHistory 
             userPhone={userPhone} 
             refreshTrigger={refreshHistoryTrigger} 
          />
        )}
      </div>
    );
  }

  const renderImageUploader = (type, label, preview, isRequired, error) => (
    <div className="space-y-2">
      <Label>{label} {isRequired && <span className="text-red-500">*</span>}</Label>
      {preview ? (
        <div className="relative border rounded-lg overflow-hidden h-40 group">
          <img src={preview} alt={`${type} preview`} className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
            <Button type="button" size="sm" variant="secondary" onClick={() => document.getElementById(`upload-${type}`).click()}>
              <Edit2 className="w-4 h-4 mr-2" /> Replace
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => handleRemoveFile(type)}>
              <X className="w-4 h-4 mr-2" /> Remove
            </Button>
          </div>
          <input 
            id={`upload-${type}`}
            type="file" 
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, type)}
          />
        </div>
      ) : (
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-800'}`}
          onClick={() => document.getElementById(`upload-${type}`).click()}
        >
          <input 
            id={`upload-${type}`}
            type="file" 
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, type)}
          />
          <div className="flex flex-col items-center gap-2">
            <div className={`p-3 rounded-full ${error ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <ImageIcon className={`h-6 w-6 ${error ? 'text-red-500' : 'text-slate-500'}`} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Click to upload or drag and drop
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error.message}</p>}
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center">
      <RewardPeriodsDisplay />
      
      <div className="w-full max-w-lg mx-auto">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle>Contribute Product</CardTitle>
            <CardDescription>Add missing products to our database and earn rewards.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Barcode Input */}
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode / EAN <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input 
                    id="barcode"
                    placeholder="Scan or enter barcode"
                    {...register('barcode', { 
                      required: "Barcode is required", 
                      minLength: { value: 3, message: "Too short" },
                      onChange: (e) => {
                        // Trim leading spaces immediately to provide better UX
                        if (e.target.value.startsWith(' ')) {
                          e.target.value = e.target.value.trimStart();
                        }
                      }
                    })}
                    className={existingProduct || duplicateContribution ? "border-orange-300 pr-24" : "pr-24"}
                  />
                  
                  {/* Scanner Button */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                     <Button 
                       type="button" 
                       size="sm" 
                       variant="ghost" 
                       onClick={() => setShowScanner(true)} 
                       className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                       title="Scan Barcode"
                     >
                        <Camera className="h-4 w-4" />
                        <span className="sr-only">Scan Barcode</span>
                     </Button>
                  </div>

                  {/* Status Icon */}
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    {checkingBarcode ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <Search className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>
                {errors.barcode && <p className="text-xs text-red-500">{errors.barcode.message}</p>}
                
                {/* Duplicate Contribution Warning */}
                {duplicateContribution && !checkingBarcode && !existingProduct && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 text-sm flex items-start gap-3 mt-2"
                  >
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-800 dark:text-yellow-300">Duplicate Found</p>
                      <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                        ⚠️ This barcode already exists in our database. Please use a different barcode or update the existing product.
                      </p>
                      <div className="mt-2 flex justify-end">
                         <Button 
                           type="button" 
                           size="sm" 
                           variant="outline" 
                           className="h-8 bg-white dark:bg-black border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                           onClick={() => setValue('barcode', '')}
                         >
                           Clear Barcode
                         </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Existing Product Alert */}
                {existingProduct && !checkingBarcode && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-sm flex items-start gap-3"
                  >
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-800 dark:text-orange-200">Product Found!</p>
                      <p className="text-orange-700 dark:text-orange-300 mt-1 mb-2">
                        "{existingProduct.product_name}" is already in our catalog.
                      </p>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        className="w-full bg-white dark:bg-black border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={() => setShowEditModal(true)}
                      >
                        <Edit2 className="h-3 w-3 mr-2" /> Suggest Edit Instead
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Product Details (Hidden if existing found) */}
              {!existingProduct && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="product_name">Product Name <span className="text-red-500">*</span></Label>
                    <Input 
                      id="product_name"
                      placeholder="e.g. Amul Gold Milk 500ml"
                      {...register('product_name', { required: "Name is required" })}
                    />
                    {errors.product_name && <p className="text-xs text-red-500">{errors.product_name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mrp">MRP (₹) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="mrp"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register('mrp', { required: "MRP is required", min: 0 })}
                    />
                    {errors.mrp && <p className="text-xs text-red-500">{errors.mrp.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderImageUploader('front', 'Front Image', frontPreview, true, errors.frontImage)}
                    {renderImageUploader('back', 'Back Image (Optional)', backPreview, false, null)}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || duplicateContribution || checkingBarcode}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Contribution"}
                  </Button>
                </motion.div>
              )}
            </form>
          </CardContent>
        </Card>

        <SuggestEditModal 
          isOpen={showEditModal} 
          onClose={() => setShowEditModal(false)}
          product={existingProduct}
          initialBarcode={barcodeValue}
        />

        <BarcodeScanner 
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScan}
        />
      </div>

      {userPhone && (
        <div className="w-full mt-12 pb-12">
          <MyContributionHistory 
             userPhone={userPhone} 
             refreshTrigger={refreshHistoryTrigger} 
          />
        </div>
      )}
    </div>
  );
};

export default ContributeProductForm;