import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Search, Loader2, FileText, Eye, Edit, Trash2, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { usePOSMode } from '@/contexts/POSModeContext';
import CreditNoteDetailsModal from './CreditNoteDetailsModal';

const CreditNotesSection = () => {
    // 1. All hooks called unconditionally at the very top level
    const posModeContext = usePOSMode();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [creditNotes, setCreditNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);

    // 2. Derive state/variables after hooks
    const mode = posModeContext?.mode || 'retail';

    const fetchCreditNotes = async () => {
        if (!user?.id) {
            console.log("[CreditNotes Debug] No authenticated user found. Skipping fetch.");
            return;
        }

        setLoading(true);
        setError(null);
        
        // Determine the correct table based on POS Mode
        const tableName = mode === 'wholesale' ? 'credit_notes' : 'pos_credit_notes';
        
        try {
            const { data, error: fetchError } = await supabase
                .from(tableName)
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) {
                if (fetchError.code === '42501') {
                    throw new Error(`Permission Denied (RLS): You do not have read access to ${tableName}.`);
                }
                throw new Error(fetchError.message || `Failed to fetch from ${tableName}`);
            }

            // Transform data to standard format for the UI to handle variations between retail/wholesale tables
            const transformedData = (data || []).map(note => ({
                id: note.id,
                // Wholesale uses 'credit_note_number', Retail doesn't have it natively, fallback to substring ID
                credit_note_number: note.credit_note_number || `CN-${note.id.substring(0, 8).toUpperCase()}`,
                // Retail uses 'customer_name', Wholesale uses 'bill_to_name'
                customer_name: note.customer_name || note.bill_to_name || 'Walk-in Customer',
                customer_mobile: note.customer_mobile || 'N/A',
                // Retail uses 'amount', Wholesale uses 'total_amount'
                amount: Number(note.amount || note.total_amount || 0),
                remaining_balance: Number(note.remaining_balance || 0),
                status: note.status || 'Active',
                created_at: note.created_at
            }));

            setCreditNotes(transformedData);
        } catch (err) {
            setError(err.message || "An unexpected error occurred while loading credit notes.");
            setCreditNotes([]);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when user or mode changes
    useEffect(() => {
        fetchCreditNotes();
    }, [user?.id, mode]);

    const filteredNotes = useMemo(() => {
        return creditNotes.filter(note => {
            const matchesSearch = 
                (note.credit_note_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (note.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (note.customer_mobile || '').includes(searchTerm);
            
            const statusLower = (note.status || '').toLowerCase();
            
            // Treat 'generated' and 'active' similarly for standard active filter
            let matchesStatus = false;
            if (statusFilter === 'All') {
                matchesStatus = true;
            } else if (statusFilter === 'Active') {
                matchesStatus = (statusLower === 'active' || statusLower === 'generated');
            } else {
                matchesStatus = (statusLower === statusFilter.toLowerCase());
            }

            return matchesSearch && matchesStatus;
        });
    }, [creditNotes, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        return creditNotes.reduce((acc, note) => {
            acc.totalAmount += note.amount;
            const statusLower = (note.status || 'unknown').toLowerCase();
            
            if (statusLower === 'active' || statusLower === 'generated') acc.active++;
            else if (statusLower === 'used' || statusLower === 'fully used') acc.used++;
            else if (statusLower === 'expired') acc.expired++;
            else if (statusLower === 'cancelled') acc.cancelled++;
            else acc.other++;
            
            return acc;
        }, { totalAmount: 0, active: 0, used: 0, expired: 0, cancelled: 0, other: 0 });
    }, [creditNotes]);

    const handleAction = (action, noteId) => {
        if (action === 'View') {
            const note = creditNotes.find(n => n.id === noteId);
            if (note) {
                setSelectedNote(note);
                setIsModalOpen(true);
            }
        } else {
            toast({
                title: `${action} Action`,
                description: `🚧 ${action} action for credit note ${noteId.substring(0,8)} isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀`,
            });
        }
    };

    const getBadgeStyle = (status) => {
        const lower = (status || '').toLowerCase();
        if (lower.includes('active') || lower.includes('generated')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
        if (lower.includes('partial')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
        if (lower.includes('used') || lower.includes('full')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
        if (lower === 'expired') return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        if (lower === 'cancelled') return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700';
    };

    // Early returns containing JSX MUST come AFTER all hooks are called
    if (error) {
        return (
            <Card className="mt-8 border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="bg-destructive/10 p-3 rounded-full">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-destructive">Failed to Load Data</h3>
                        <p className="text-sm text-destructive/80 mt-1 max-w-md mx-auto">{error}</p>
                    </div>
                    <Button onClick={fetchCreditNotes} variant="outline" className="mt-2">
                        <RefreshCw className="w-4 h-4 mr-2" /> Retry Fetch
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mt-8 w-full shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Credit Notes Generated
                            <Badge variant="outline" className="ml-2 text-xs font-normal">
                                {mode} mode
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                            View and manage all credit notes issued in your current POS context.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Amount</p>
                        <p className="text-xl font-bold text-primary mt-1">{formatPrice(stats.totalAmount)}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">Active</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.active}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
                        <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider">Used</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.used}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800/30">
                        <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider">Expired</p>
                        <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.expired}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800/30">
                        <p className="text-xs text-red-600 dark:text-red-400 uppercase font-bold tracking-wider">Cancelled</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">{stats.cancelled}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by number, name or phone..." 
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Used">Used</SelectItem>
                                <SelectItem value="Expired">Expired</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Note Number</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Remaining</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Issued Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                                        <p className="text-sm text-muted-foreground">Loading credit notes...</p>
                                    </TableCell>
                                </TableRow>
                            ) : filteredNotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                                        <p className="text-base font-medium text-foreground">No credit notes found</p>
                                        <p className="text-sm text-muted-foreground">Try adjusting your filters or search term.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredNotes.map((note) => (
                                    <TableRow key={note.id} className="group">
                                        <TableCell className="font-medium text-primary">
                                            {note.credit_note_number || 'N/A'}
                                        </TableCell>
                                        <TableCell>{note.customer_name || 'N/A'}</TableCell>
                                        <TableCell>{note.customer_mobile || 'N/A'}</TableCell>
                                        <TableCell className="text-right font-medium text-foreground">
                                            {formatPrice(note.amount)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-foreground">
                                            {formatPrice(note.remaining_balance)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getBadgeStyle(note.status)}>
                                                {note.status || 'Unknown'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {note.created_at ? format(new Date(note.created_at), 'MMM dd, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleAction('View', note.id)} title="View Details" className="hover:bg-primary/10 hover:text-primary">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <CreditNoteDetailsModal 
                open={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                creditNote={selectedNote} 
            />
        </Card>
    );
};

export default CreditNotesSection;