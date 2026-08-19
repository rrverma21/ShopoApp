import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Download, IndianRupee, Users, CheckCircle2 } from 'lucide-react';
import { getAllReferrals, getReferralStats } from '@/services/referralService';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';

const AdminReferralPanel = () => {
    const { toast } = useToast();
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchReferrals();
    }, []);

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const data = await getAllReferrals();
            setReferrals(data || []);
        } catch (error) {
            toast({ title: 'Error', description: error.message || 'Failed to fetch referrals', variant: 'destructive' });
        }
        setLoading(false);
    };

    const handleExport = () => {
        const csvContent = [
            ['ID', 'Referrer ID', 'Referred User ID', 'Code', 'Status', 'Reward', 'Created At'],
            ...filteredReferrals.map(r => [
                r.id,
                r.referrer_id || '',
                r.referred_user_id || '',
                r.referral_code,
                r.status,
                r.reward_amount || 0,
                new Date(r.created_at).toLocaleDateString()
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "referrals_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredReferrals = referrals.filter(r => {
        const matchesSearch = (r.referrer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (r.referred_user_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (r.referral_code || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalRewards = referrals.reduce((sum, r) => sum + (parseFloat(r.reward_amount) || 0), 0);
    const successfulCount = referrals.filter(r => r.status === 'successful').length;

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Helmet>
                <title>Referral Management - Admin</title>
            </Helmet>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Referral Analytics</h1>
                    <p className="text-slate-500">Monitor and manage the platform referral program.</p>
                </div>
                <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-4 bg-blue-100 rounded-full text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Referrals</p>
                            <h3 className="text-2xl font-bold">{referrals.length}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-4 bg-green-100 rounded-full text-green-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Successful Conversions</p>
                            <h3 className="text-2xl font-bold">{successfulCount}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-4 bg-purple-100 rounded-full text-purple-600">
                            <IndianRupee className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Rewards Distributed</p>
                            <h3 className="text-2xl font-bold flex items-center">
                                <IndianRupee className="w-5 h-5" />{totalRewards.toLocaleString()}
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Referral Records</CardTitle>
                    <CardDescription>Comprehensive list of all referral activities</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search by ID or code..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="successful">Successful</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Referrer ID</TableHead>
                                    <TableHead>Referred User ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Reward</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredReferrals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">
                                            {referrals.length === 0 ? (
                                                <div className="flex flex-col items-center">
                                                    <img src="https://images.unsplash.com/photo-1516383274235-5f42d6c6426d?auto=format&fit=crop&q=80&w=300&h=200" alt="empty" className="rounded-lg opacity-50 mb-4" />
                                                    <p className="text-slate-500">No referral data found.</p>
                                                </div>
                                            ) : "No matches found for your search."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredReferrals.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-mono font-medium">{row.referral_code}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{row.referrer_id || 'Unknown'}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{row.referred_user_id || 'Unknown'}</TableCell>
                                            <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={row.status === 'successful' ? 'default' : 'secondary'} className={row.status === 'successful' ? 'bg-green-500' : ''}>
                                                    {row.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ₹{row.reward_amount || '0'}
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

export default AdminReferralPanel;