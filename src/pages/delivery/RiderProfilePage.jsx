import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, User, Bike, CreditCard, ShieldAlert, Edit2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RiderProfilePage = () => {
    const { user, refreshUserProfile } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [profileData, setProfileData] = useState({
        contact_person: '',
        phone: '',
        email: ''
    });

    const [riderDetails, setRiderDetails] = useState({
        vehicle_type: '',
        vehicle_number: '',
        license_number: '',
        bank_account_no: '',
        ifsc_code: '',
        bank_name: '',
        emergency_contact: ''
    });

    useEffect(() => {
        if (user) {
            fetchRiderData();
        }
    }, [user]);

    const fetchRiderData = async () => {
        // Profile Data
        setProfileData({
            contact_person: user.profile?.contact_person || '',
            phone: user.profile?.phone || '',
            email: user.email || ''
        });

        // Rider Specific Details - try to get from delivery_rider_details
        let { data, error } = await supabase
            .from('delivery_rider_details')
            .select('*')
            .eq('rider_id', user.id)
            .maybeSingle();

        // If not found in delivery_rider_details, try to fetch from registration
        if (!data) {
             const { data: regData } = await supabase
                .from('rider_registrations')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'approved') // Only use approved registration data
                .maybeSingle();
            
             if (regData) {
                 data = regData;
                 // Note: Registration table column names match snake_case used here
             }
        }

        if (data) {
            setRiderDetails({
                vehicle_type: data.vehicle_type || '',
                vehicle_number: data.vehicle_number || '',
                license_number: data.license_number || '',
                bank_account_no: data.bank_account_no || '',
                ifsc_code: data.ifsc_code || '',
                bank_name: data.bank_name || '',
                emergency_contact: data.emergency_contact || ''
            });
        }
    };

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleDetailsChange = (e) => {
        setRiderDetails({ ...riderDetails, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Update Profile (Name/Phone)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    contact_person: profileData.contact_person,
                    phone: profileData.phone
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. Update Rider Details (Upsert)
            const { error: detailsError } = await supabase
                .from('delivery_rider_details')
                .upsert({
                    rider_id: user.id,
                    vehicle_type: riderDetails.vehicle_type,
                    vehicle_number: riderDetails.vehicle_number,
                    license_number: riderDetails.license_number,
                    bank_account_no: riderDetails.bank_account_no,
                    ifsc_code: riderDetails.ifsc_code,
                    bank_name: riderDetails.bank_name,
                    emergency_contact: riderDetails.emergency_contact,
                    updated_at: new Date()
                }, { onConflict: 'rider_id' });

            if (detailsError) throw detailsError;

            await refreshUserProfile();
            toast({ title: "Success", description: "Profile updated successfully" });
            setIsEditing(false);

        } catch (error) {
            console.error("Update failed:", error);
            toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Helmet><title>Rider Profile - B2B Nexus</title></Helmet>
            
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-bold">My Profile</h1>
                </div>
                {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                )}
            </div>

            <div className="container mx-auto px-4 py-6">
                <form onSubmit={handleSave} className="space-y-6 max-w-lg mx-auto">
                    
                    {/* Personal Details */}
                    <Card>
                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                            <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                                <User className="w-4 h-4 text-blue-600" /> Personal Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="contact_person">Full Name</Label>
                                <Input 
                                    id="contact_person" 
                                    name="contact_person" 
                                    value={profileData.contact_person} 
                                    onChange={handleProfileChange}
                                    readOnly={!isEditing}
                                    className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none font-medium text-base" : ""}
                                    required 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input 
                                        id="phone" 
                                        name="phone" 
                                        value={profileData.phone} 
                                        onChange={handleProfileChange}
                                        readOnly={!isEditing}
                                        className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none text-slate-600" : ""}
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input 
                                        id="email" 
                                        value={profileData.email} 
                                        disabled 
                                        className="bg-transparent border-transparent px-0 shadow-none text-slate-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-dashed">
                                <Label htmlFor="emergency_contact" className="text-xs uppercase text-slate-400 font-bold tracking-wider">Emergency Contact</Label>
                                <Input 
                                    id="emergency_contact" 
                                    name="emergency_contact" 
                                    value={riderDetails.emergency_contact} 
                                    onChange={handleDetailsChange}
                                    readOnly={!isEditing}
                                    className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none" : ""}
                                    placeholder={isEditing ? "Name - Phone Number" : "Not provided"}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vehicle Information */}
                    <Card>
                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                            <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                                <Bike className="w-4 h-4 text-green-600" /> Vehicle Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vehicle_type">Vehicle Type</Label>
                                    <Input 
                                        id="vehicle_type" 
                                        name="vehicle_type" 
                                        value={riderDetails.vehicle_type} 
                                        onChange={handleDetailsChange}
                                        readOnly={!isEditing}
                                        className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none font-medium" : ""}
                                        placeholder="e.g., Bike, Scooter"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vehicle_number">Vehicle Number</Label>
                                    <Input 
                                        id="vehicle_number" 
                                        name="vehicle_number" 
                                        value={riderDetails.vehicle_number} 
                                        onChange={handleDetailsChange}
                                        readOnly={!isEditing}
                                        className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none font-mono uppercase" : "uppercase"}
                                        placeholder="MH01AB1234"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="license_number">Driving License</Label>
                                <Input 
                                    id="license_number" 
                                    name="license_number" 
                                    value={riderDetails.license_number} 
                                    onChange={handleDetailsChange}
                                    readOnly={!isEditing}
                                    className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none" : ""}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Banking Details */}
                    <Card>
                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                            <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                                <CreditCard className="w-4 h-4 text-purple-600" /> Banking Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="bank_name">Bank Name</Label>
                                <Input 
                                    id="bank_name" 
                                    name="bank_name" 
                                    value={riderDetails.bank_name} 
                                    onChange={handleDetailsChange}
                                    readOnly={!isEditing}
                                    className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none font-medium" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bank_account_no">Account Number</Label>
                                <Input 
                                    id="bank_account_no" 
                                    name="bank_account_no" 
                                    value={riderDetails.bank_account_no} 
                                    onChange={handleDetailsChange}
                                    readOnly={!isEditing}
                                    type={isEditing ? "text" : "password"} 
                                    className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none font-mono tracking-widest" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ifsc_code">IFSC Code</Label>
                                <Input 
                                    id="ifsc_code" 
                                    name="ifsc_code" 
                                    value={riderDetails.ifsc_code} 
                                    onChange={handleDetailsChange}
                                    readOnly={!isEditing}
                                    className={!isEditing ? "bg-slate-50 border-transparent px-0 shadow-none uppercase font-mono" : "uppercase"}
                                />
                            </div>
                            {isEditing && (
                                <div className="bg-yellow-50 p-3 rounded-md flex gap-2 text-xs text-yellow-800 border border-yellow-200 mt-2">
                                    <ShieldAlert className="w-4 h-4 shrink-0" />
                                    <p>Ensure these details are correct. Earnings will be transferred to this account.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {isEditing && (
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:static md:shadow-none md:border-0 md:bg-transparent md:p-0">
                            <div className="max-w-lg mx-auto flex gap-3">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button type="submit" className="flex-1" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default RiderProfilePage;