import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Lock, CheckCircle2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDone, setIsDone] = useState(false);
  
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast({
        title: "Passwords mismatch",
        description: "The new passwords do not match.",
        variant: "destructive"
      });
    }

    if (password.length < 6) {
      return toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      
      setIsDone(true);
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      <Helmet>
        <title>ShopoApp</title>
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-effect shadow-xl border-slate-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 ring-4 ring-blue-50/50">
                <Lock className="h-10 w-10" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Reset Password</CardTitle>
            <CardDescription className="text-slate-500">
              Enter a secure new password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDone ? (
              <div className="text-center space-y-6 py-4">
                <div className="flex flex-col items-center gap-3 text-green-600 bg-green-50 p-6 rounded-2xl border border-green-100">
                  <CheckCircle2 className="h-12 w-12" />
                  <p className="font-semibold text-lg">Success!</p>
                  <p className="text-green-700 text-sm opacity-90">
                    Your password has been reset. Redirecting to login...
                  </p>
                </div>
                <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                  Login Now
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="Minimum 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="Repeat password"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;