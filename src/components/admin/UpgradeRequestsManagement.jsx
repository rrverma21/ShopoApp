import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import UpgradeRequestDetailsModal from './UpgradeRequestDetailsModal';

const UpgradeRequestsManagement = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase.from('upgrade_requests').select('*').order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setRequests(data || []);
      setFilteredRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRequests(requests);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredRequests(requests.filter(r => 
      r.seller_name?.toLowerCase().includes(lower) || 
      r.seller_email?.toLowerCase().includes(lower) ||
      r.requested_plan?.toLowerCase().includes(lower)
    ));
  }, [searchTerm, requests]);

  const handleRowClick = (req) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Approved</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 border-amber-100 dark:border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Upgrade Requests</p>
              <h3 className="text-3xl font-bold text-amber-600 dark:text-amber-500 mt-1">
                {statusFilter === 'pending' ? requests.length : requests.filter(r => r.status === 'pending').length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
              <ArrowUpCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Upgrade Requests</CardTitle>
              <CardDescription>Manage and review seller plan upgrade requests.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email or plan..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-1 border">
                <Button variant={statusFilter === 'pending' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('pending')} className="text-xs">Pending</Button>
                <Button variant={statusFilter === 'approved' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('approved')} className="text-xs">Approved</Button>
                <Button variant={statusFilter === 'rejected' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('rejected')} className="text-xs">Rejected</Button>
                <Button variant={statusFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('all')} className="text-xs">All</Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead>Seller Details</TableHead>
                <TableHead>Current Plan</TableHead>
                <TableHead>Requested Plan</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading requests...</TableCell></TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">No requests found.</TableCell></TableRow>
              ) : (
                filteredRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" onClick={() => handleRowClick(req)}>
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{req.seller_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{req.seller_email}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{req.current_plan}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">{req.requested_plan}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {req.created_at ? format(new Date(req.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(req.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UpgradeRequestDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        request={selectedRequest}
        onUpdated={fetchRequests}
      />
    </div>
  );
};

export default UpgradeRequestsManagement;