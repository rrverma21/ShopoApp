import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, DollarSign, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const RegistrationFeePayment = () => {
    const { user, refreshUserProfile } = useAuth();
    const [registrationFee, setRegistrationFee] = useState(0);
    const [adminQrCode, setAdminQrCode] = useState(null);
    const [receiptFile, setReceiptFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [pendingPayment, setPendingPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchFeeData = async () => {
            setLoading(true);
            const { data: feeData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'registration_fee')
                .maybeSingle();

            const feeAmount = feeData ? parseFloat(feeData.value) : 0;
            setRegistrationFee(feeAmount);

            if (feeAmount > 0) {
                 const { data: adminProfile } = await supabase
                    .from('profiles')
                    .select('qr_code_url')
                    .eq('role', 'admin')
                    .limit(1)
                    .single();
                setAdminQrCode(adminProfile?.qr_code_url);

                const { data: paymentData } = await supabase
                    .from('membership_payments')
                    .select('*')
                    .eq('seller_id', user.id)
                    .eq('status', 'pending_registration_fee')
                    .maybeSingle();
                setPendingPayment(paymentData);
            }
            setLoading(false);
        };

        if (user) {
            fetchFeeData();
        }
    }, [user]);
    
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handlePaymentSubmit = async () => {
        if (!receiptFile || !user) return;
        setUploading(true);

        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `reg_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('membership-receipts')
            .upload(filePath, receiptFile);

        if (uploadError) {
            toast({ title: "Upload Failed", description: uploadError.message, variant: 'destructive' });
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('membership-receipts').getPublicUrl(filePath);

        const { data, error: dbError } = await supabase
            .from('membership_payments')
            .upsert({
                seller_id: user.id,
                receipt_url: publicUrl,
                status: 'pending_registration_fee',
                // Using a known UUID or a marker for plan_id could be an option if required by schema, but it's nullable in my current thinking
            }, { onConflict: 'seller_id, status', ignoreDuplicates: false })
            .select()
            .single();

        if (dbError) {
            toast({ title: "Submission Failed", description: dbError.message, variant: 'destructive' });
        } else {
            setPendingPayment(data);
            toast({ title: "Success!", description: "Your payment receipt has been submitted for review." });
        }
        setUploading(false);
    };

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>
      );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-slate-50 dark:to-slate-900/20 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
            >
                <Card className="glass-effect shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full w-fit mb-4">
                           <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight gradient-text">
                            One-Time Registration Fee
                        </CardTitle>
                        <CardDescription className="text-lg">
                            To activate your seller account, a payment of <strong>{formatPrice(registrationFee)}</strong> is required.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {pendingPayment ? (
                             <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4"/>
                                <h3 className="text-xl font-semibold">Payment Submitted!</h3>
                                <p className="text-slate-600 dark:text-slate-300 mt-2">Your payment is under review. You will be notified via email upon approval. Thank you for your patience.</p>
                             </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <Label className="font-semibold">1. Make Payment</Label>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Scan the QR code below to pay {formatPrice(registrationFee)}.</p>
                                    {adminQrCode ? (
                                        <div className="flex justify-center p-4 border rounded-md bg-slate-50 dark:bg-slate-800">
                                            <img src={adminQrCode} alt="Admin Payment QR Code" className="w-48 h-48 rounded-md" />
                                        </div>
                                    ) : (
                                        <p className="text-center text-red-500 p-4 border rounded-md bg-red-50 dark:bg-red-900/20">Admin has not set up a payment QR code yet. Please contact support.</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="font-semibold" htmlFor="receipt">2. Upload Payment Receipt</Label>
                                    <Input id="receipt" type="file" accept="image/*" onChange={handleFileChange} />
                                </div>
                                 <Button onClick={handlePaymentSubmit} className="w-full" disabled={!receiptFile || uploading || !adminQrCode}>
                                    {uploading ? 'Submitting...' : <><Upload className="mr-2 h-4 w-4" /> Submit for Review</>}
                                </Button>
                            </div>
                        )}
                        <Button variant="link" onClick={() => supabase.auth.signOut()} className="w-full">
                            Logout
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};


const SellerRouteGuard = ({ children }) => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);
    
    if (loading) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        );
    }
    
    if (user?.needsToPayFee) {
        return <RegistrationFeePayment />;
    }

    if (user && user.profile?.role === 'seller') {
        return children;
    }

    return null; 
};

export default SellerRouteGuard;