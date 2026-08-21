import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { normalizeProfileRole } from '@/lib/profileRoles';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signIn, user, loading: authLoading, membershipLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !membershipLoading && user) {
      const userRole = normalizeProfileRole(user.profile?.role);
      
      if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'seller') {
        navigate('/pos', { replace: true });
      } else if (userRole === 'customer') {
        navigate('/local-shops', { replace: true });
      } else {
        navigate('/profile', { replace: true });
      }
    }
  }, [user, authLoading, membershipLoading, navigate]);
    
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
    
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { success, error } = await signIn(formData.email, formData.password);
      if (success) {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      } else if (error) {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid email or password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
      
  if (authLoading || (user && membershipLoading)) {
    return (
      <div className="min-h-[calc(100vh-5rem)] w-full flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
        <p className="text-slate-500 font-medium">Preparing your workspace...</p>
      </div>
    );
  }

  if (user) return null;
    
  return (
    <div className="min-h-[calc(100vh-5rem)] w-full flex items-center justify-center p-4 flex-col">
      <Helmet>
        <title>ShopoApp | Login</title>
        <meta name="description" content="ShopoApp Login - Access your retail management dashboard securely." />
      </Helmet>
          
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md my-auto"
      >
        <Card className="glass-effect mb-4 shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="https://horizons-cdn.hostinger.com/3c38fd60-a24a-4d78-a3d8-58678655dafd/a7b90c40bcf1c912ebc37808895f8526.png" 
                alt="ShopoApp Logo" 
                className="h-14 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome Back</CardTitle>
            <p className="text-slate-500 dark:text-slate-400">Sign in to your Shopo account</p>
          </CardHeader>
              
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 h-11 focus-visible:ring-primary bg-background text-foreground"
                    required
                  />
                </div>
              </div>
                  
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 h-11 focus-visible:ring-primary bg-background text-foreground"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-right mt-1">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:underline font-medium transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>
                  
              <Button 
                type="submit" 
                variant="primary"
                className="w-full h-11 text-base mt-2"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
                
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline font-semibold transition-colors">
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
    
export default LoginPage;
