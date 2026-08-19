import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, MapPin, Building2, FileText, Trash2, AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

const ProfilePage = () => {
  const { user, signOut, refreshUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testNotifLoading, setTestNotifLoading] = useState(false);
  
  const navigate = useNavigate();
  const { notificationPermission, enableNotifications, fcmToken, error: notifError } = useNotifications(user);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      business_name: '',
      contact_person: '',
      phone: '',
      email: '',
      street_address: '',
      city: '',
      pincode: '',
      gstin: '',
    }
  });

  useEffect(() => {
    if (user?.profile) {
      setValue('business_name', user.profile.business_name || '');
      setValue('contact_person', user.profile.contact_person || '');
      setValue('phone', user.profile.phone || ''); 
      setValue('email', user.email || ''); 
      setValue('street_address', user.profile.street_address || '');
      setValue('city', user.profile.city || '');
      setValue('pincode', user.profile.pincode || '');
      setValue('gstin', user.profile.gstin || '');
    }
  }, [user, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: data.business_name,
          contact_person: data.contact_person,
          street_address: data.street_address,
          city: data.city,
          pincode: data.pincode,
          gstin: data.gstin,
          phone: data.phone 
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast({ title: "Profile updated successfully!" });
      
      // Call the refreshed context function
      if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error updating profile", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      toast({ title: "Avatar updated!" });
      
      if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error uploading avatar", description: error.message });
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
        const { data, error } = await supabase.functions.invoke('delete-account');
        if (error) throw error;

        toast({ title: "Account deleted", description: "Your account has been permanently removed." });
        await signOut();
        navigate('/');
    } catch (error) {
        console.error('Delete account error:', error);
        toast({ 
            variant: "destructive", 
            title: "Deletion failed", 
            description: error.message || "Failed to delete account. Please try again later." 
        });
    } finally {
        setDeleting(false);
    }
  };

  const handleTestNotification = async () => {
      if (!user) return;

      setTestNotifLoading(true);
      try {
          const { data, error } = await supabase.functions.invoke('send-fcm-notification', {
              body: JSON.stringify({
                  user_id: user.id,
                  title: "Test Notification",
                  body: "This is a test message. If you see this, push notifications are working!",
                  data: { test: 'true' }
              })
          });
          
          if (error) throw error;
          
          if (data && data.results && data.results.some(r => r.status === 'sent')) {
             toast({ title: "Sent!", description: "Notification dispatched. Check your device." });
          } else {
             const errMsg = data?.message || "No active tokens found or delivery failed.";
             toast({ variant: "destructive", title: "Delivery Failed", description: errMsg });
          }

      } catch (err) {
          console.error("Test notification error:", err);
          toast({ variant: "destructive", title: "Failed", description: err.message });
      } finally {
          setTestNotifLoading(false);
      }
  };

  if (!user) return null;

  return (
    <div className="container max-w-4xl mx-auto p-4 md:py-8">
      <Helmet>
        <title>My Profile - ShopoApp</title>
      </Helmet>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-6 gradient-text">My Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar Section */}
          <div className="md:col-span-1 space-y-6">
            <Card className="glass-effect">
              <CardContent className="pt-6 flex flex-col items-center">
                <div className="relative group">
                  <Avatar className="h-32 w-32 mb-4 border-4 border-white shadow-lg">
                    <AvatarImage src={user.profile?.avatar_url} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-600">
                      {user.profile?.business_name?.substring(0, 2).toUpperCase() || 'US'}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-sm font-medium"
                  >
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </label>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 text-center">{user.profile?.business_name}</h3>
                <p className="text-sm text-slate-500 capitalize px-3 py-1 bg-slate-100 rounded-full mt-2">
                  {user.profile?.role}
                </p>
                <div className="mt-4 w-full text-center text-xs text-slate-400">
                    Display ID: {user.profile?.display_id}
                </div>
              </CardContent>
            </Card>

            {/* Connected Accounts */}
            {user.app_metadata?.provider === 'google' || user.user_metadata?.google_sub ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Connected Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback>G</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-slate-900 truncate">{user.user_metadata?.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Signed in via Google
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {/* Notifications Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4" /> Push Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3">
                        {notifError && (
                            <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                                Error: {notifError}
                            </div>
                        )}
                        
                        {notificationPermission === 'granted' ? (
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 p-2 rounded border border-green-100">
                                <CheckCircle className="h-4 w-4" /> Active on this device
                            </div>
                        ) : (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={enableNotifications}
                            >
                                Enable Notifications
                            </Button>
                        )}
                        
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full"
                            onClick={handleTestNotification}
                            disabled={testNotifLoading || notificationPermission !== 'granted'}
                        >
                            {testNotifLoading ? 'Sending...' : 'Send Test Notification'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* Details Form */}
          <div className="md:col-span-2 space-y-6">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
                <CardDescription>Manage your business profile information.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Business Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="business_name" className="pl-10" {...register('business_name')} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="contact_person" className="pl-10" {...register('contact_person')} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="email" className="pl-10 bg-slate-50 dark:bg-slate-900" {...register('email')} disabled />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="phone" className="pl-10" {...register('phone')} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="street_address">Street Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input id="street_address" className="pl-10" {...register('street_address')} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" {...register('city')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input id="pincode" {...register('pincode')} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN (Optional)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input id="gstin" className="pl-10" {...register('gstin')} placeholder="e.g. 29AAAAA0000A1Z5" />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading} className="w-full md:w-auto">
                      {loading ? 'Saving Changes...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-100 bg-red-50/30">
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" /> Danger Zone
                    </CardTitle>
                    <CardDescription className="text-red-700/70">
                        Irreversible actions for your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h4 className="font-semibold text-slate-800">Delete Account</h4>
                            <p className="text-sm text-slate-500">Permanently remove your account and all associated data.</p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Account
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your account
                                        and remove your data from our servers.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAccount} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                                        {deleting ? "Deleting..." : "Yes, delete my account"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;