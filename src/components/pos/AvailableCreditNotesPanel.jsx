import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { History, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CreditNoteUsageHistory from './CreditNoteUsageHistory';
import { validateCreditNoteUsable, calculateRemainingBalance } from '@/utils/creditNoteUtils';
import { useToast } from '@/components/ui/use-toast';
import { roundAmount } from '@/utils/roundAmount';
import { supabase } from '@/lib/supabaseClient';

const AvailableCreditNotesPanel = ({ 
  open, 
  onOpenChange, 
  creditNotes, 
  onApply, 
  maxAllowedAmount, 
  currentBillId,
  loading = false,
  error = null,
  onRetry
}) => {
  const [selectedNote, setSelectedNote] = useState(null);
  const [amountToApply, setAmountToApply] = useState('');
  const [showHistory, setShowHistory] = useState(null);
  const [localNotes, setLocalNotes] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Sync local notes with props initially
  useEffect(() => {
    if (creditNotes) {
      setLocalNotes(creditNotes);
    }
  }, [creditNotes]);

  useEffect(() => {
    if (error) {
      console.error("Credit Notes Panel Error:", error);
    }
  }, [error]);

  // Refetch notes directly from DB to guarantee accurate display after usage
  const refreshNotes = async () => {
    if (!creditNotes || creditNotes.length === 0) return;
    setIsRefreshing(true);
    try {
      const ids = creditNotes.map(n => n.id);
      const { data, err } = await supabase
        .from('pos_credit_notes')
        .select('*')
        .in('id', ids);
        
      if (data && !err) {
        setLocalNotes(prev => prev.map(n => {
          const fresh = data.find(d => d.id === n.id);
          return fresh ? { ...n, ...fresh } : n;
        }));
      }
    } catch (err) {
      console.error("Failed to refresh notes from DB", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh when opened
  useEffect(() => {
    if (open) {
      refreshNotes();
    }
  }, [open]);

  const handleApply = async () => {
    if (!selectedNote) return;
    
    const validation = validateCreditNoteUsable(selectedNote, amountToApply);
    
    if (!validation.valid) {
      toast({ title: 'Invalid Amount', description: validation.error, variant: 'destructive' });
      return;
    }
    
    const roundedInput = roundAmount(parseFloat(amountToApply));
    
    if (roundedInput > roundAmount(maxAllowedAmount)) {
      toast({ title: 'Amount Exceeds Bill', description: `Cannot apply more than bill total: ${formatCurrency(maxAllowedAmount)}`, variant: 'destructive' });
      return;
    }
    
    try {
      await onApply(selectedNote, roundedInput);
      // Immediately refetch to ensure Used/Balance reflect DB updates
      await refreshNotes();
    } catch (e) {
      console.error("Error applying credit note:", e);
    }
    
    setSelectedNote(null);
    setAmountToApply('');
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    const bal = note.remaining_balance !== undefined && note.remaining_balance !== null 
        ? roundAmount(note.remaining_balance) 
        : roundAmount(calculateRemainingBalance(note));
    setAmountToApply(roundAmount(Math.min(bal, maxAllowedAmount)).toString());
    setShowHistory(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center pr-4">
            <DialogTitle>Available Credit Notes</DialogTitle>
            <Button variant="ghost" size="sm" onClick={refreshNotes} disabled={isRefreshing} className="h-8 w-8 p-0" title="Refresh values">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <DialogDescription>Apply a credit note to the current bill.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-destructive text-center">{error}</p>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
              )}
            </div>
          ) : loading && localNotes.length === 0 ? (
            <div className="text-center py-6 text-slate-500 animate-pulse">Loading credit notes...</div>
          ) : (!localNotes || localNotes.length === 0) ? (
            <div className="text-center py-6 text-slate-500">No available credit notes.</div>
          ) : (
            localNotes.map(note => {
              // Ensure we display DB values directly, fallback to calculated only if DB fields are null
              const originAmount = roundAmount(note.amount || note.original_amount || note.initial_amount || 0);
              const bal = (note.remaining_balance !== undefined && note.remaining_balance !== null)
                ? roundAmount(note.remaining_balance)
                : roundAmount(calculateRemainingBalance(note));
              const usedAmount = (note.used_amount !== undefined && note.used_amount !== null)
                ? roundAmount(note.used_amount)
                : roundAmount(originAmount - bal);
              
              const isSelected = selectedNote?.id === note.id;
              const isPartiallyUsed = note.status === 'Partially Used';
              
              return (
                <div key={note.id} className={`p-3 border rounded-lg transition-colors ${isSelected ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'bg-card border-border'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {note.credit_note_number || (note.id ? 'CN-' + note.id.split('-')[0].toUpperCase() : 'CN-UNKNOWN')}
                        </span>
                        <Badge variant={note.status === 'Active' ? 'default' : isPartiallyUsed ? 'secondary' : 'outline'} className={note.status === 'Active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'}>
                          {note.status || 'Active'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Issued: {note.issued_date || note.created_at ? format(new Date(note.issued_date || note.created_at), 'dd MMM yyyy') : 'N/A'}
                      </div>
                    </div>
                    
                    {!isSelected && bal > 0 && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowHistory(showHistory === note.id ? null : note.id)}>
                          <History className="w-3 h-3 mr-1" /> History
                        </Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleSelectNote(note)}>
                          Select
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Values mapped explicitly from DB fields to ensure absolute correctness */}
                  <div className="flex items-center justify-between gap-2 mt-4 bg-secondary/30 p-2.5 rounded-md border border-border/50">
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Initial</div>
                      <div className="font-medium text-muted-foreground text-sm">{formatCurrency(originAmount)}</div>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Used</div>
                      <div className="font-medium text-amber-600 dark:text-amber-400 text-sm">{formatCurrency(usedAmount)}</div>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Balance</div>
                      <div className="font-bold text-primary text-sm">{formatCurrency(bal)}</div>
                    </div>
                  </div>
                  
                  {showHistory === note.id && (
                    <div className="mt-3">
                      <CreditNoteUsageHistory creditNoteId={note.id} />
                    </div>
                  )}

                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Amount to Apply</label>
                          <Input 
                            type="number" 
                            value={amountToApply} 
                            onChange={(e) => setAmountToApply(e.target.value)} 
                            max={bal}
                            className="h-8"
                          />
                        </div>
                        <div className="flex items-end pb-0.5 gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedNote(null)} className="h-8 w-8 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                          <Button size="sm" onClick={handleApply} className="h-8" disabled={!amountToApply || parseFloat(amountToApply) <= 0}>
                            <Check className="w-4 h-4 mr-1" /> Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvailableCreditNotesPanel;