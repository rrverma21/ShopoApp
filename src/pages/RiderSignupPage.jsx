import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Bike, Upload, CheckCircle2, AlertCircle, FileText, User, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const RiderSignupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    vehicleType: '',
    vehicleNumber: '',
    serviceArea: '',
    bankAccountNo: '',
    ifscCode: '',
    password: '' // For creating auth account if needed
  });

  const [documents, setDocuments] = useState({
    drivingLicense: null,
    vehicleRC: null,
    panCard: null,
    aadharCard: null,
    addressProof: null,
    bankProof: null
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, docType) => {
    if (e.target.files && e.target.files[0]) {
      setDocuments({ ...documents, [docType]: e.target.files[0] });
    }
  };

  const generateUUID = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const uploadFile = async (file, path) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('rider-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('rider-documents').getPublicUrl(filePath);
    return { path: filePath, url: data.publicUrl };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Auth Account First
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password || 'tempRider123!',
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: 'rider_applicant'
          }
        }
      });
      
      if (authError) throw authError;

      // Generate ID client-side to avoid RLS select issues
      const registrationId = generateUUID();

      // 2. Insert Registration Data
      // We explicitly provide the ID and DO NOT chain .select() to avoid RLS "read" errors
      const { error: regError } = await supabase
        .from('rider_registrations')
        .insert({
            id: registrationId,
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            vehicle_type: formData.vehicleType,
            vehicle_number: formData.vehicleNumber,
            service_area: formData.serviceArea,
            bank_account_no: formData.bankAccountNo,
            ifsc_code: formData.ifscCode,
            status: 'pending',
            user_id: authData?.user?.id || null 
        });

      if (regError) throw regError;

      // 3. Upload Documents using the generated ID
      const uploadPromises = Object.entries(documents).map(async ([key, file]) => {
        if (!file) return null;
        const { path, url } = await uploadFile(file, registrationId);
        return supabase.from('rider_documents').insert({
            registration_id: registrationId,
            document_type: key,
            file_path: path,
            file_url: url
        });
      });

      await Promise.all(uploadPromises);

      setStep(3); // Success Step
      toast({ title: "Registration Submitted!", description: "We will review your application shortly." });

    } catch (err) {
      console.error(err);
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Become a Rider - B2B Nexus</title>
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Bike className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Join our Delivery Fleet</h2>
          <p className="mt-2 text-sm text-slate-600">Earn money by delivering products in your local area.</p>
        </div>

        {step === 3 ? (
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-white p-10 rounded-2xl shadow-xl">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted Successfully!</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Your application ID has been generated. Our team will verify your documents within 24-48 hours. You will receive an email update once approved.
              </p>
              <Button onClick={() => navigate('/')} className="btn-primary">Back to Home</Button>
           </motion.div>
        ) : (
          <Card className="shadow-xl border-0 overflow-hidden">
             <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">1</span>
                    Personal Info
                </div>
                <div className="h-px bg-slate-700 flex-1 mx-4"></div>
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">2</span>
                    Documents
                </div>
             </div>

             <CardContent className="p-8">
                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input name="fullName" required value={formData.fullName} onChange={handleInputChange} placeholder="As per Aadhaar" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="10 digit mobile" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input name="email" type="email" required value={formData.email} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Create Password</Label>
                                    <Input name="password" type="password" required value={formData.password} onChange={handleInputChange} placeholder="Min 6 chars" />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-semibold flex items-center gap-2"><Bike className="w-4 h-4"/> Vehicle Details</h4>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Vehicle Type</Label>
                                        <Select onValueChange={(val) => setFormData({...formData, vehicleType: val})}>
                                            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Bike">Bike / Motorcycle</SelectItem>
                                                <SelectItem value="Auto Rickshaw">Auto Rickshaw</SelectItem>
                                                <SelectItem value="Tempo">Tempo</SelectItem>
                                                <SelectItem value="Car">Car</SelectItem>
                                                <SelectItem value="Van">Delivery Van</SelectItem>
                                                <SelectItem value="Scooter">Scooter</SelectItem>
                                                <SelectItem value="EV">Electric Scooter</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Vehicle Number</Label>
                                        <Input name="vehicleNumber" required value={formData.vehicleNumber} onChange={handleInputChange} placeholder="MH 01 AB 1234" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Preferred Service Area (Pincode or City)</Label>
                                        <Input name="serviceArea" required value={formData.serviceArea} onChange={handleInputChange} placeholder="e.g. Andheri West, Mumbai" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4"/> Bank Details (For Payouts)</h4>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Account Number</Label>
                                        <Input name="bankAccountNo" required value={formData.bankAccountNo} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>IFSC Code</Label>
                                        <Input name="ifscCode" required value={formData.ifscCode} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="button" onClick={() => setStep(2)} className="btn-primary px-8">Next Step</Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-700 text-sm mb-6">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>Please upload clear images (JPG/PNG/PDF) of your documents. Max size 5MB each.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {[
                                    { id: 'drivingLicense', label: 'Driving License' },
                                    { id: 'vehicleRC', label: 'Vehicle RC Book' },
                                    { id: 'panCard', label: 'PAN Card' },
                                    { id: 'aadharCard', label: 'Aadhar Card' },
                                    { id: 'addressProof', label: 'Current Address Proof' },
                                    { id: 'bankProof', label: 'Cancelled Cheque / Passbook' }
                                ].map((doc) => (
                                    <div key={doc.id} className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-blue-400 transition-colors text-center">
                                        <div className="mb-3 font-medium text-slate-700">{doc.label}</div>
                                        <Label htmlFor={doc.id} className="cursor-pointer inline-block">
                                            {documents[doc.id] ? (
                                                <div className="flex flex-col items-center text-green-600">
                                                    <CheckCircle2 className="w-8 h-8 mb-1" />
                                                    <span className="text-xs truncate max-w-[200px]">{documents[doc.id].name}</span>
                                                    <span className="text-xs text-blue-500 mt-1 hover:underline">Change File</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400 hover:text-blue-500">
                                                    <Upload className="w-8 h-8 mb-2" />
                                                    <span className="text-sm">Click to Upload</span>
                                                </div>
                                            )}
                                        </Label>
                                        <Input id={doc.id} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handleFileChange(e, doc.id)} />
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between pt-6 border-t mt-6">
                                <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                                <Button type="submit" className="btn-primary px-8" disabled={loading}>
                                    {loading ? 'Submitting...' : 'Submit Application'}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </form>
             </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RiderSignupPage;