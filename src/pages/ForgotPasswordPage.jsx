import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setSuccess(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for password reset instructions",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] w-full flex items-center justify-center p-4">
      <Helmet>
        <title>Forgot Password | Shopo</title>
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
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 ring-4 ring-blue-50/50 dark:ring-blue-900/10">
                <Mail className="h-10 w-10" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Forgot Password?</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              No worries, we'll send you reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-6 py-4">
                <div className="flex flex-col items-center gap-3 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-900/30">
                  <CheckCircle2 className="h-12 w-12" />
                  <p className="font-semibold text-lg">Check your email</p>
                  <p className="text-green-700 dark:text-green-300 text-sm opacity-90 leading-relaxed">
                    We've sent a password reset link to <br/>
                    <span className="font-bold">{email}</span>
                  </p>
                </div>
                <Link to="/login">
                  <Button variant="ghost" className="w-full text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 focus-visible:ring-blue-500 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-[0.98]"
                    disabled={loading || !email}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Send className="h-4 w-4" />
                        </motion.div>
                        Sending...
                      </span>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                  <Link to="/login">
                    <Button variant="ghost" className="w-full h-12 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;