import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw, Clock, IndianRupee, User, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';

const CreditNoteDetailsModal = ({ open, onClose, creditNote }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        if (!creditNote?.id) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const { data, error: fetchError } = await supabase.rpc('get_credit_note_usage_history', {
                p_credit_note_id: creditNote.id
            });

            if (fetchError) throw fetchError;
            
            // Sort history by date descending
            const sortedHistory = (data || []).sort((a, b) => new Date(b.usage_date) - new Date(a.usage_date));
            setHistory(sortedHistory);
        } catch (err) {
            console.error('Error fetching credit note history:', err);
            setError('Failed to load usage history. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && creditNote?.id) {
            fetchHistory();
        } else {
            setHistory([]);
        }
    }, [open, creditNote?.id]);

    if (!creditNote) return null;

    const getStatusColor = (status) => {
        const lower = (status || '').toLowerCase();
        if (lower.includes('active') || lower.includes('generated')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200';
        if (lower.includes('partial')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200';
        if (lower.includes('full') || lower.includes('used')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200';
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    };

    // Calculate totals from history if needed, or use the note's amounts if available
    const totalUsed = history.reduce((sum, record) => sum + (Number(record.amount_used) || 0), 0);
    const originalAmount = Number(creditNote.amount) || 0;
    const remainingAmount = originalAmount - totalUsed;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[hsl(var(--modal-bg))] text-[hsl(var(--modal-foreground))] border-[hsl(var(--modal-divider))]">
                <DialogHeader className="border-b border-[hsl(var(--modal-divider))] pb-4">
                    <div className="flex justify-between items-start pr-6">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                Credit Note <span className="text-primary">{creditNote.credit_note_number}</span>
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Issued on {creditNote.created_at ? format(new Date(creditNote.created_at), 'PPP') : 'N/A'}
                            </DialogDescription>
                        </div>
                        <Badge variant="outline" className={`px-3 py-1 text-sm ${getStatusColor(creditNote.status)}`}>
                            {creditNote.status || 'Active'}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Customer Info Card */}
                    <Card className="border-[hsl(var(--modal-divider))] shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <User className="w-4 h-4" /> Customer Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">{creditNote.customer_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Contact</p>
                                <p className="font-medium">{creditNote.customer_mobile || 'N/A'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Amount Summary Card */}
                    <Card className="border-[hsl(var(--modal-divider))] shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <IndianRupee className="w-4 h-4" /> Amount Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Original Amount</p>
                                    <p className="text-xl font-bold text-foreground">{formatPrice(originalAmount)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Remaining Balance</p>
                                    <p className={`text-xl font-bold ${remainingAmount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                        {formatPrice(remainingAmount)}
                                    </p>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-[hsl(var(--modal-divider))] mt-2 space-y-1">
                                    <p className="text-sm text-muted-foreground">Total Used</p>
                                    <p className="font-medium text-amber-600 dark:text-amber-400">{formatPrice(totalUsed)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Usage History Section */}
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" /> Usage History
                    </h3>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3 border rounded-lg border-[hsl(var(--modal-divider))]">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading usage history...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-8 h-8 text-destructive" />
                            <p className="text-sm text-destructive">{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchHistory}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Retry
                            </Button>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 border rounded-lg border-dashed border-[hsl(var(--modal-divider))] bg-muted/30">
                            <CalendarDays className="w-10 h-10 text-muted-foreground/50 mb-3" />
                            <p className="text-base font-medium text-foreground">No usage history</p>
                            <p className="text-sm text-muted-foreground mt-1">This credit note has not been used yet.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border border-[hsl(var(--modal-divider))] overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Bill Reference</TableHead>
                                        <TableHead className="text-right">Amount Used</TableHead>
                                        <TableHead className="text-right">Remaining</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">
                                                {format(new Date(record.usage_date), 'MMM dd, yyyy HH:mm')}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {record.bill_id || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">
                                                {formatPrice(record.amount_used)}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {formatPrice(record.remaining_balance)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal">
                                                    {record.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t border-[hsl(var(--modal-divider))]">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreditNoteDetailsModal;