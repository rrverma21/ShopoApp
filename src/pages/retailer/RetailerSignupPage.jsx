import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, Mail, Briefcase, User, Lock, Eye, EyeOff } from 'lucide-react';

const RetailerSignupPage = () => {
    const [formData, setFormData] = useState({
        businessName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [signupSuccess, setSignupSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast({ title: "Passwords do not match", variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: `${window.location.origin}/retailer/login`,
                    data: {
                        businessName: formData.businessName,
                        role: 'retailer',
                    },
                },
            });

            if (error) throw error;
            
            // Check if user needs email verification
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                 toast({
                    title: 'Signup Failed',
                    description: 'This email address is already in use.',
                    variant: 'destructive',
                });
            } else {
                 setSignupSuccess(true);
            }

        } catch (error) {
            toast({
                title: 'Signup Failed',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };
    
    if (signupSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 p-4">
                 <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "backOut" }}
                    className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl shadow-2xl p-8 text-white w-full max-w-lg"
                >
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                            <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
                        </motion.div>
                        <h1 className="text-3xl font-bold mt-6 bg-gradient-to-r from-green-300 to-teal-300 bg-clip-text text-transparent">Account Created!</h1>
                        <div className="mt-6 p-6 bg-gray-700/50 border border-gray-600 rounded-lg w-full">
                            <div className="flex items-center justify-center">
                                <Mail className="w-8 h-8 text-indigo-400 mr-4 flex-shrink-0"/>
                                <div>
                                    <h2 className="font-semibold text-indigo-300 text-lg">Verify Your Email</h2>
                                    <p className="text-sm text-gray-300 mt-1">A verification link has been sent to <strong>{formData.email}</strong>. Please check your inbox and spam folder to complete your registration.</p>
                                </div>
                            </div>
                        </div>
                        <Button onClick={() => navigate('/retailer/login')} className="mt-8 bg-indigo-600 hover:bg-indigo-700 font-bold text-base">
                            Proceed to Login
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 p-4">
            <Helmet>
                <title>Retailer Signup - Gift & Stationery Business Tracker</title>
            </Helmet>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "backOut" }}
                className="w-full max-w-md"
            >
                <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl shadow-2xl p-8 text-white">
                    <div className="text-center mb-8">
                        <Briefcase className="mx-auto h-12 w-12 text-indigo-400" />
                        <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            Join the Tracker
                        </h1>
                        <p className="text-gray-400 mt-2">Create your account to start managing your business</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="businessName" className="text-gray-300">Business Name</Label>
                            <div className="relative mt-1">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <Input id="businessName" type="text" value={formData.businessName} onChange={handleChange} required placeholder="e.g., Your Store Name" className="pl-10 bg-gray-700/50 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <Input id="email" type="email" value={formData.email} onChange={handleChange} required placeholder="your@email.com" className="pl-10 bg-gray-700/50 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="password" className="text-gray-300">Password</Label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <Input id="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} required className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                         <div>
                            <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} required className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500" />
                                 <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-base transition-transform duration-200 hover:scale-105">
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-400">
                        <p>
                            Already have an account?{' '}
                            <Link to="/retailer/login" className="font-medium text-indigo-400 hover:text-indigo-300">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RetailerSignupPage;