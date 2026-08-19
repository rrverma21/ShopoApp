import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, Eye, EyeOff, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const RetailerLoginPage = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { signIn, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        if (!authLoading && user && (user.profile?.role === 'retailer' || user.profile?.role === 'seller')) {
            navigate('/pos', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { success } = await signIn(formData.email, formData.password);
            if (success) {
                toast({
                    title: "Welcome back!",
                    description: "You've successfully logged into your business tracker.",
                });
                // The useEffect will handle redirection now that the user state is guaranteed to be updated.
            }
        } catch (error) {
            toast({
                title: "Login Failed",
                description: error.message || "Invalid credentials or not a valid account type for this login.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };
    
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-400"></div>
        </div>
      );
    }
    
    // If user is already logged in as a retailer or seller, and auth is not loading,
    // this page should not be accessible. The useEffect will handle the redirect.
    if (user && (user.profile?.role === 'retailer' || user.profile?.role === 'seller')) {
        return null;
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 p-4">
            <Helmet>
                <title>Retailer Login - Gift & Stationery Business Tracker</title>
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
                            Gift & Stationery Business Tracker
                        </h1>
                        <p className="text-gray-400 mt-2">Sign in to manage your business</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <Input
                                    id="email" name="email" type="email"
                                    placeholder="your@email.com"
                                    value={formData.email} onChange={handleChange}
                                    className="pl-10 bg-gray-700/50 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-gray-300">Password</Label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <Input
                                    id="password" name="password" type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password} onChange={handleChange}
                                    className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        
                        <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-base transition-transform duration-200 hover:scale-105">
                            {loading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-400">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/retailer-signup" className="font-medium text-indigo-400 hover:text-indigo-300">
                                Sign up now
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RetailerLoginPage;