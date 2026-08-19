import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
    Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { 
    Search, Store, Phone, Mail, Calendar, Eye, 
    MoreHorizontal, Loader2, Ban, CheckCircle2, User, RefreshCw, Clock,
    CreditCard, CalendarDays, Shield, Zap, Database, XCircle, Users, Activity,
    ArrowUp, ArrowDown
} from 'lucide-react';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore } from 'date-fns';

const ShopOwners = () => {
    const { toast } = useToast();
    const [shopOwners, setShopOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    // Sort State Management - Set to registrationDate descending by default
    const [sortColumn, setSortColumn] = useState('registrationDate');
    const [sortDirection, setSortDirection] = useState('desc');

    // Stats for dashboard
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        disabled: 0,
        newThisMonth: 0
    });

    const fetchShopOwners = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_all_sellers');

            if (error) throw error;

            setShopOwners(data || []);
            calculateStats(data || []);

        } catch (error) {
            console.error('Error fetching shop owners:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch shop owners list.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats = data.reduce((acc, owner) => {
            acc.total++;
            if (owner.is_disabled) acc.disabled++;
            else acc.active++;
            
            const joinDate = new Date(owner.created_at);
            if (joinDate >= firstDayOfMonth) acc.newThisMonth++;
            
            return acc;
        }, { total: 0, active: 0, disabled: 0, newThisMonth: 0 });

        setStats(stats);
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_disabled: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: 'Success',
                description: `Shop owner ${!currentStatus ? 'deactivated' : 'activated'} successfully.`,
                className: "bg-green-50 border-green-200"
            });
            
            fetchShopOwners();

        } catch (error) {
            console.error('Error updating status:', error);
            toast({
                title: 'Error',
                description: 'Failed to update shop owner status.',
                variant: 'destructive',
            });
        }
    };

    const handleViewDetails = async (owner) => {
        setSelectedOwner(owner);
        setDetailsOpen(true);
        setLoadingDetails(true);

        try {
            // Fetch extra profile details for membership
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('membership_plan_id, membership_start_date, membership_end_date')
                .eq('id', owner.id)
                .single();

            if (profileError) throw profileError;

            let planData = null;
            if (profileData?.membership_plan_id) {
                const { data: plan, error: planError } = await supabase
                    .from('membership_plans')
                    .select('*')
                    .eq('id', profileData.membership_plan_id)
                    .single();
                if (!planError) planData = plan;
            }

            // Fetch Usage Metrics in Parallel
            const [
                { count: posProductsCount },
                { count: digitalProductsCount },
                { count: posUsersCount },
                { count: employeesCount }
            ] = await Promise.all([
                supabase.from('point_of_sale_products').select('*', { count: 'exact', head: true }).eq('user_id', owner.id),
                supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', owner.id).eq('is_disabled', false),
                supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('admin_id', owner.id).eq('status', 'active'),
                supabase.from('employees').select('*', { count: 'exact', head: true }).eq('user_id', owner.id)
            ]);

            setSelectedOwner(prev => ({
                ...prev,
                ...profileData,
                plan: planData,
                usage: {
                    posProducts: posProductsCount || 0,
                    digitalProducts: digitalProductsCount || 0,
                    posUsers: posUsersCount || 0,
                    employees: employeesCount || 0
                }
            }));
        } catch (error) {
            console.error("Failed to fetch extra details", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        fetchShopOwners();
    }, []);

    // Sort Handler Function
    const handleSort = (columnName) => {
        if (sortColumn === columnName) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnName);
            setSortDirection('asc');
        }
    };

    // Filter Logic
    const filteredOwners = shopOwners.filter(owner => 
        owner.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone?.includes(searchTerm)
    );

    // Sort Logic
    const sortData = (dataToSort) => {
        if (!sortColumn) return dataToSort;

        return [...dataToSort].sort((a, b) => {
            let aVal, bVal;

            switch (sortColumn) {
                case 'shopName':
                    aVal = (a.business_name || '').toLowerCase();
                    bVal = (b.business_name || '').toLowerCase();
                    break;
                case 'ownerName':
                    aVal = (a.contact_person || '').toLowerCase();
                    bVal = (b.contact_person || '').toLowerCase();
                    break;
                case 'emailVerification':
                    aVal = a.email_confirmed_at ? 1 : 0;
                    bVal = b.email_confirmed_at ? 1 : 0;
                    if (aVal === bVal) {
                        return (a.email || '').localeCompare(b.email || '');
                    }
                    break;
                case 'registrationDate':
                    aVal = new Date(a.created_at).getTime();
                    bVal = new Date(b.created_at).getTime();
                    break;
                case 'status':
                    aVal = a.is_disabled ? 0 : 1; // 1 = Active, 0 = Inactive
                    bVal = b.is_disabled ? 0 : 1;
                    if (aVal === bVal) {
                        return (a.business_name || '').localeCompare(b.business_name || '');
                    }
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedAndFilteredOwners = sortData(filteredOwners);

    const getPlanStatus = (startDate, endDate) => {
        if (!startDate || !endDate) return { label: 'Unknown', color: 'bg-gray-100 text-gray-700', icon: Clock };
        const now = new Date();
        const end = new Date(endDate);
        const start = new Date(startDate);

        if (isBefore(now, start)) return { label: 'Upcoming', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
        if (isAfter(now, end)) return { label: 'Expired', color: 'bg-red-100 text-red-700', icon: XCircle };
        return { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
    };

    const renderUsageCard = (title, icon, current, limit) => {
        const isUnlimited = limit === null || limit === undefined || limit === 0;
        const percentage = isUnlimited ? 0 : Math.round((current / limit) * 100);
        const displayPercentage = isUnlimited ? 0 : percentage;
        const cappedPercentage = Math.min(displayPercentage, 100);
        
        let colorClass = 'bg-green-500';
        let badgeBgClass = 'bg-green-100';
        let badgeTextClass = 'text-green-700';
        let statusText = 'Plenty of space';

        if (!isUnlimited) {
            if (percentage > 100) {
                colorClass = 'bg-red-600';
                badgeBgClass = 'bg-red-100';
                badgeTextClass = 'text-red-700';
                statusText = 'Limit exceeded';
            } else if (percentage >= 81) {
                colorClass = 'bg-red-500';
                badgeBgClass = 'bg-red-100';
                badgeTextClass = 'text-red-700';
                statusText = 'Near limit';
            } else if (percentage >= 51) {
                colorClass = 'bg-yellow-500';
                badgeBgClass = 'bg-yellow-100';
                badgeTextClass = 'text-yellow-700';
                statusText = 'Approaching limit';
            }
        }

        const Icon = icon;

        return (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", badgeBgClass, badgeTextClass)}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <h5 className="font-semibold text-slate-700 text-sm">{title}</h5>
                    </div>
                    <Badge className={cn("border-0 text-xs font-medium", badgeBgClass, badgeTextClass)}>
                        {statusText}
                    </Badge>
                </div>
                
                <div className="mt-4 flex items-end justify-between mb-1">
                    <div className="text-2xl font-bold text-slate-900">
                        {current} <span className="text-sm font-normal text-slate-500">/ {isUnlimited ? 'Unlimited' : limit}</span>
                    </div>
                    {!isUnlimited && (
                        <div className="text-sm font-medium text-slate-600">
                            {percentage}%
                        </div>
                    )}
                </div>
                
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                    <div 
                        className={cn("h-full rounded-full transition-all duration-500", colorClass)} 
                        style={{ width: `${isUnlimited ? 100 : cappedPercentage}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shop Owners</h1>
                    <p className="text-slate-500 mt-1">Manage and monitor all registered shop owners and sellers.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchShopOwners} disabled={loading}>
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none shadow-lg text-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-blue-100 font-medium">Total Shop Owners</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.total}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center text-sm text-blue-100 bg-white/10 w-fit px-2 py-1 rounded">
                            <Store className="w-4 h-4 mr-1" /> All Registered
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 font-medium">Active Accounts</CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-600">{stats.active}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center text-sm text-green-700 bg-green-50 w-fit px-2 py-1 rounded">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Currently Active
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 font-medium">Deactivated</CardDescription>
                        <CardTitle className="text-3xl font-bold text-red-600">{stats.disabled}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center text-sm text-red-700 bg-red-50 w-fit px-2 py-1 rounded">
                            <Ban className="w-4 h-4 mr-1" /> Access Revoked
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 font-medium">New This Month</CardDescription>
                        <CardTitle className="text-3xl font-bold text-indigo-600">{stats.newThisMonth}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center text-sm text-indigo-700 bg-indigo-50 w-fit px-2 py-1 rounded">
                            <User className="w-4 h-4 mr-1" /> Recent Signups
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <CardTitle>Owners Directory</CardTitle>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search by name, email, phone..." 
                                className="pl-9 bg-white border-slate-200 focus:border-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200 bg-white overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 whitespace-nowrap">
                                <TableRow>
                                    <TableHead 
                                        className="font-semibold text-slate-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('shopName')}
                                    >
                                        Shop Details
                                        {sortColumn === 'shopName' && sortDirection === 'asc' && <ArrowUp className="inline ml-2 h-4 w-4 text-blue-600" />}
                                        {sortColumn === 'shopName' && sortDirection === 'desc' && <ArrowDown className="inline ml-2 h-4 w-4 text-blue-600" />}
                                    </TableHead>
                                    <TableHead 
                                        className="font-semibold text-slate-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('ownerName')}
                                    >
                                        Owner Contact
                                        {sortColumn === 'ownerName' && sortDirection === 'asc' && <ArrowUp className="inline ml-2 h-4 w-4 text-blue-600" />}
                                        {sortColumn === 'ownerName' && sortDirection === 'desc' && <ArrowDown className="inline ml-2 h-4 w-4 text-blue-600" />}
                                    </TableHead>
                                    <TableHead 
                                        className="font-semibold text-slate-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('emailVerification')}
                                    >
                                        Email Verification
                                        {sortColumn === 'emailVerification' && sortDirection === 'asc' && <ArrowUp className="inline ml-2 h-4 w-4 text-blue-600" />}
                                        {sortColumn === 'emailVerification' && sortDirection === 'desc' && <ArrowDown className="inline ml-2 h-4 w-4 text-blue-600" />}
                                    </TableHead>
                                    <TableHead 
                                        className="font-semibold text-slate-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('registrationDate')}
                                    >
                                        Registration
                                        {sortColumn === 'registrationDate' && sortDirection === 'asc' && <ArrowUp className="inline ml-2 h-4 w-4 text-blue-600" />}
                                        {sortColumn === 'registrationDate' && sortDirection === 'desc' && <ArrowDown className="inline ml-2 h-4 w-4 text-blue-600" />}
                                    </TableHead>
                                    <TableHead 
                                        className="font-semibold text-slate-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('status')}
                                    >
                                        Status
                                        {sortColumn === 'status' && sortDirection === 'asc' && <ArrowUp className="inline ml-2 h-4 w-4 text-blue-600" />}
                                        {sortColumn === 'status' && sortDirection === 'desc' && <ArrowDown className="inline ml-2 h-4 w-4 text-blue-600" />}
                                    </TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-500">
                                                <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                                                Loading directory...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : sortedAndFilteredOwners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                            No shop owners found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedAndFilteredOwners.map((owner) => (
                                        <TableRow key={owner.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900">{owner.business_name || 'N/A'}</span>
                                                    <span className="text-xs text-slate-500">{owner.city || 'Unknown City'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center text-sm text-slate-700">
                                                        <User className="w-3 h-3 mr-2 text-slate-400" />
                                                        {owner.contact_person || 'N/A'}
                                                    </div>
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <Mail className="w-3 h-3 mr-2 text-slate-400" />
                                                        {owner.email}
                                                    </div>
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <Phone className="w-3 h-3 mr-2 text-slate-400" />
                                                        {owner.phone || 'N/A'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {owner.email_confirmed_at ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-full font-semibold flex w-fit items-center gap-1.5 px-3 py-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0 rounded-full font-semibold flex w-fit items-center gap-1.5 px-3 py-1">
                                                        <Clock className="w-3.5 h-3.5" /> Pending
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3 mr-2 text-slate-400" />
                                                    {format(new Date(owner.created_at), 'MMM dd, yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {owner.is_disabled ? (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-0">Deactivated</Badge>
                                                ) : (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Active</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewDetails(owner)}>
                                                            <Eye className="mr-2 h-4 w-4" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className={owner.is_disabled ? "text-green-600" : "text-red-600"}
                                                            onClick={() => toggleStatus(owner.id, owner.is_disabled)}
                                                        >
                                                            {owner.is_disabled ? (
                                                                <>
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Activate Account
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Ban className="mr-2 h-4 w-4" /> Deactivate Account
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Shop Owner Details</DialogTitle>
                        <DialogDescription>
                            Detailed information for {selectedOwner?.business_name}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedOwner && (
                        <div className="flex flex-col gap-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Business Info</h4>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="font-medium text-lg">{selectedOwner.business_name}</div>
                                            <div className="text-sm text-slate-600 mt-1">{selectedOwner.street_address || 'No street address'}</div>
                                            <div className="text-sm text-slate-600">{selectedOwner.city}, {selectedOwner.pincode}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">System Status</h4>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                                            <span className="text-sm text-slate-600">Account Status:</span>
                                            {selectedOwner.is_disabled ? (
                                                <Badge variant="destructive">Deactivated</Badge>
                                            ) : (
                                                <Badge className="bg-green-600">Active</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Person</h4>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium">{selectedOwner.contact_person}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Mail className="w-4 h-4 text-slate-400" />
                                                <span>{selectedOwner.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                <span>{selectedOwner.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600 mt-2 pt-2 border-t border-slate-200">
                                                <span className="text-slate-500 font-medium mr-2">Email Status:</span>
                                                {selectedOwner.email_confirmed_at ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-full font-semibold px-2 py-0.5 text-xs">Verified</Badge>
                                                ) : (
                                                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0 rounded-full font-semibold px-2 py-0.5 text-xs">Pending</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Active Membership Plan Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Membership Plan</h4>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    {loadingDetails ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                        </div>
                                    ) : selectedOwner.plan ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-xl font-bold text-slate-900">{selectedOwner.plan.name}</h3>
                                                        {(() => {
                                                            const status = getPlanStatus(selectedOwner.membership_start_date, selectedOwner.membership_end_date);
                                                            const StatusIcon = status.icon;
                                                            return (
                                                                <Badge className={cn("border-0 rounded-full flex items-center gap-1 px-2.5 py-0.5 font-medium", status.color)}>
                                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                                    {status.label}
                                                                </Badge>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="flex items-center text-slate-600 text-sm gap-2">
                                                        <CreditCard className="w-4 h-4" />
                                                        <span className="font-medium">₹{selectedOwner.plan.price}</span>
                                                        <span className="text-slate-400">|</span>
                                                        <span>{selectedOwner.plan.duration_days} Days</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col text-sm text-slate-600 space-y-1 sm:text-right">
                                                    <div className="flex items-center sm:justify-end gap-2">
                                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                                        <span>Started: <span className="font-medium text-slate-900">{selectedOwner.membership_start_date ? format(new Date(selectedOwner.membership_start_date), 'MMM dd, yyyy') : '-'}</span></span>
                                                    </div>
                                                    <div className="flex items-center sm:justify-end gap-2">
                                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                                        <span>Expires: <span className="font-medium text-slate-900">{selectedOwner.membership_end_date ? format(new Date(selectedOwner.membership_end_date), 'MMM dd, yyyy') : '-'}</span></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                                        <Store className="w-4 h-4 text-slate-400" />
                                                        <span>POS Products</span>
                                                    </div>
                                                    <span className="font-medium text-slate-900">{selectedOwner.plan.max_products || 'Unlimited'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                                        <Database className="w-4 h-4 text-slate-400" />
                                                        <span>Digital Products</span>
                                                    </div>
                                                    <span className="font-medium text-slate-900">{selectedOwner.plan.max_digital_products || 'Unlimited'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                                        <Users className="w-4 h-4 text-slate-400" />
                                                        <span>POS Users</span>
                                                    </div>
                                                    <span className="font-medium text-slate-900">{selectedOwner.plan.max_pos_users || 'Unlimited'}</span>
                                                </div>
                                                {selectedOwner.plan.max_employees && (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center text-sm text-slate-600 gap-2">
                                                            <Shield className="w-4 h-4 text-slate-400" />
                                                            <span>Employees</span>
                                                        </div>
                                                        <span className="font-medium text-slate-900">{selectedOwner.plan.max_employees}</span>
                                                    </div>
                                                )}
                                                {selectedOwner.plan.max_pincodes && (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center text-sm text-slate-600 gap-2">
                                                            <Zap className="w-4 h-4 text-slate-400" />
                                                            <span>Pincodes</span>
                                                        </div>
                                                        <span className="font-medium text-slate-900">{selectedOwner.plan.max_pincodes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center">
                                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 mb-3 px-3 py-1 text-sm rounded-full">No Active Plan</Badge>
                                            <p className="text-sm text-slate-500">This shop owner currently does not have an active membership subscription.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Plan Usage Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Plan Usage</h4>
                                {loadingDetails ? (
                                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {renderUsageCard(
                                            "POS Products Usage",
                                            Store,
                                            selectedOwner?.usage?.posProducts || 0,
                                            selectedOwner?.plan?.max_products
                                        )}
                                        {renderUsageCard(
                                            "Digital Products Usage",
                                            Database,
                                            selectedOwner?.usage?.digitalProducts || 0,
                                            selectedOwner?.plan?.max_digital_products
                                        )}
                                        {renderUsageCard(
                                            "POS Users Usage",
                                            Users,
                                            selectedOwner?.usage?.posUsers || 0,
                                            selectedOwner?.plan?.max_pos_users
                                        )}
                                        {renderUsageCard(
                                            "Employees Usage",
                                            Shield,
                                            selectedOwner?.usage?.employees || 0,
                                            selectedOwner?.plan?.max_employees
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
                        <Button 
                            variant={selectedOwner?.is_disabled ? "default" : "destructive"}
                            className={selectedOwner?.is_disabled ? "bg-green-600 hover:bg-green-700" : ""}
                            onClick={() => {
                                toggleStatus(selectedOwner.id, selectedOwner.is_disabled);
                                setDetailsOpen(false);
                            }}
                        >
                            {selectedOwner?.is_disabled ? 'Activate Account' : 'Deactivate Account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShopOwners;