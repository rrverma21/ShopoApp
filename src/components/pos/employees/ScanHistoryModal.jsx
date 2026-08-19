import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { Loader2 } from "lucide-react";

const ScanHistoryModal = ({ open, onOpenChange, employeeId, employeeName }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && employeeId) {
      fetchScans();
    }
  }, [open, employeeId]);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_qr_scans')
        .select('*')
        .eq('employee_id', employeeId)
        .order('scan_datetime', { ascending: false })
        .limit(50);

      if (error) throw error;
      setScans(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-700';
      case 'invalid': return 'bg-red-100 text-red-700';
      case 'exception': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Scan History - {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-1">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : scans.length === 0 ? (
            <div className="text-center p-8 text-slate-500">No scan history found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Device / IP</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell className="font-medium">
                      {format(new Date(scan.scan_datetime), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell className="capitalize">{scan.scan_type?.replace('_', ' ') || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(scan.status)}>
                        {scan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">
                      {scan.ip_address}
                      {scan.device_info && <div className="truncate opacity-75">{JSON.stringify(scan.device_info)}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{scan.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScanHistoryModal;