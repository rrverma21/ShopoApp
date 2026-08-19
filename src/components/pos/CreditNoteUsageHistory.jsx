import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatUsageHistory } from '@/utils/creditNoteUtils';

const CreditNoteUsageHistory = ({ creditNoteId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHistory = async () => {
    if (!creditNoteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_credit_note_usage_history', {
        p_credit_note_id: creditNoteId
      });
      
      if (error) throw error;
      setHistory(formatUsageHistory(data || []));
    } catch (err) {
      console.error('Error fetching cn history:', err);
      toast({ title: 'Error', description: 'Failed to load usage history.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [creditNoteId]);

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  if (!history || history.length === 0) {
    return <div className="text-center p-4 text-sm text-slate-500">No usage history found.</div>;
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-sm">Usage History</h4>
        <Button variant="ghost" size="sm" onClick={fetchHistory}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-sm">
        {history.map(record => (
          <div key={record.id} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-medium">Bill: {record.bill_id}</div>
              <div className="text-xs text-slate-500">{record.formattedDate}</div>
              <div className="text-xs text-slate-400">{record.notes}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-red-500">-{formatPrice(record.amount_used)}</div>
              <div className="text-xs text-slate-500">Bal: {formatPrice(record.remaining_balance)}</div>
              <Badge variant={record.status === 'Cancelled' ? 'destructive' : 'default'} className="mt-1 text-[10px]">
                {record.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreditNoteUsageHistory;