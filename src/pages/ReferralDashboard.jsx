import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, IndianRupee, Loader2, CheckCircle2, Trophy, Gift } from 'lucide-react';
import { getReferralHistory, getReferralStats } from '@/services/referralService';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import ReferralCodeDisplay from '@/components/referrals/ReferralCodeDisplay';

const ReferralDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const referralCode = user?.profile?.referral_code;

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    const [statsRes, historyRes] = await Promise.all([
      getReferralStats(user.id),
      getReferralHistory(user.id)
    ]);
    if (statsRes.success) setStats(statsRes.data);
    if (historyRes.success) setHistory(historyRes.data);
    setLoading(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <Helmet><title>Refer & Earn | ShopoApp</title></Helmet>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden bg-slate-900 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="bg-blue-500 hover:bg-blue-600 mb-4 px-3 py-1 text-white border-none">Rewards Program</Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight text-white">Refer Friends, <br/><span className="text-blue-400">Earn Rewards!</span></h1>
            <p className="text-slate-300 text-lg mb-8">Share your unique referral code with friends. When they register using your code and subscribe, you earn rewards.</p>
            
            <ReferralCodeDisplay referralCode={referralCode} isLoading={loading} />
            
          </div>
          <div className="hidden md:flex justify-center items-center h-full">
            <div className="bg-blue-500/10 p-12 rounded-full border border-blue-500/20 relative">
              <Gift className="w-32 h-32 text-blue-400 animate-pulse" />
              <div className="absolute -bottom-4 -right-4 bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl transform rotate-12 shadow-lg">
                Earn 10%!
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <IndianRupee className="w-8 h-8 mb-4 opacity-80" />
            <p className="text-blue-100 font-medium">Wallet Balance</p>
            <h3 className="text-3xl font-bold">₹{user?.profile?.wallet_balance || 0}</h3>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-4 text-blue-500" />
            <p className="text-slate-500 font-medium">Total Invites</p>
            <h3 className="text-3xl font-bold text-foreground">{stats?.total || 0}</h3>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <CheckCircle2 className="w-8 h-8 mb-4 text-green-500" />
            <p className="text-slate-500 font-medium">Successful</p>
            <h3 className="text-3xl font-bold text-foreground">{stats?.successful || 0}</h3>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <Trophy className="w-8 h-8 mb-4 text-orange-500" />
            <p className="text-slate-500 font-medium">Earnings</p>
            <h3 className="text-3xl font-bold text-foreground">₹{stats?.earnings || 0}</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border overflow-hidden bg-card text-card-foreground">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle>Referral History</CardTitle>
          <CardDescription>Track your active and completed referrals</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Details</TableHead>
                  <TableHead>Date Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">You haven't referred anyone yet. Share your code to get started!</TableCell>
                  </TableRow>
                ) : (
                  history.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-bold text-foreground">
                           {row.referred_user_id ? `User: ${row.referred_user_id.substring(0, 8)}...` : 'New User'}
                        </div>
                        <div className="text-xs text-muted-foreground">ID: {row.referred_user_id || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'successful' ? 'default' : 'secondary'} className={row.status === 'successful' ? 'bg-green-600 text-white hover:bg-green-700' : ''}>
                          {row.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                        {row.reward_amount > 0 ? `+₹${row.reward_amount}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralDashboard;