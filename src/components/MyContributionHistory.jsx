import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Filter, 
  Loader2, 
  Eye,
  Award,
  Package,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import ContributionDetailsModal from './ContributionDetailsModal';

const MyContributionHistory = ({ userPhone, refreshTrigger }) => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContribution, setSelectedContribution] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (userPhone) {
      fetchContributions();
    }
  }, [userPhone, refreshTrigger]);

  useEffect(() => {
    if (!userPhone) return;

    // Real-time subscription for updates
    const channel = supabase
      .channel('public:product_contributions')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'product_contributions',
          filter: `phone=eq.${userPhone}`
        }, 
        (payload) => {
          fetchContributions(); // Simplest way to ensure consistent state
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userPhone]);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_contributions')
        .select('*')
        .eq('phone', userPhone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions(data || []);
    } catch (error) {
      console.error('Error fetching contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
  };

  const stats = {
    total: contributions.length,
    approved: contributions.filter(c => c.status === 'approved').length,
    pending: contributions.filter(c => c.status === 'pending').length,
    rejected: contributions.filter(c => c.status === 'rejected').length,
    points: contributions.reduce((acc, curr) => acc + (curr.points_awarded || 0), 0)
  };

  const filteredContributions = contributions.filter(c => {
    const matchesSearch = 
      c.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.barcode?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && contributions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p>Loading your contribution history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-8 w-full max-w-5xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
           <CardContent className="p-4 flex flex-col items-center text-center">
             <History className="w-5 h-5 text-slate-400 mb-2" />
             <p className="text-sm text-slate-500 font-medium">Total</p>
             <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
           </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900">
           <CardContent className="p-4 flex flex-col items-center text-center">
             <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
             <p className="text-sm text-green-700 dark:text-green-400 font-medium">Approved</p>
             <p className="text-2xl font-bold text-green-800 dark:text-green-300">{stats.approved}</p>
           </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900">
           <CardContent className="p-4 flex flex-col items-center text-center">
             <Clock className="w-5 h-5 text-orange-500 mb-2" />
             <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">Pending</p>
             <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">{stats.pending}</p>
           </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900">
           <CardContent className="p-4 flex flex-col items-center text-center">
             <XCircle className="w-5 h-5 text-red-500 mb-2" />
             <p className="text-sm text-red-700 dark:text-red-400 font-medium">Rejected</p>
             <p className="text-2xl font-bold text-red-800 dark:text-red-300">{stats.rejected}</p>
           </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900 col-span-2 md:col-span-1">
           <CardContent className="p-4 flex flex-col items-center text-center">
             <Award className="w-5 h-5 text-blue-500 mb-2" />
             <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Points Earned</p>
             <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{stats.points}</p>
           </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
               <CardTitle className="text-lg">Contribution History</CardTitle>
               <CardDescription>Track the status of your submitted products</CardDescription>
             </div>
             
             <div className="flex items-center gap-2">
               <div className="relative w-full md:w-64">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                 <Input 
                   type="text" 
                   placeholder="Search products..." 
                   className="pl-9 bg-white dark:bg-slate-900"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
               
               <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                 <Filter className="h-4 w-4 text-slate-400 ml-1" />
                 <select 
                   className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer text-slate-700 dark:text-slate-300 pr-4"
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                 >
                   <option value="all">All</option>
                   <option value="pending">Pending</option>
                   <option value="approved">Approved</option>
                   <option value="rejected">Rejected</option>
                 </select>
               </div>
             </div>
           </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead>Product Info</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="hidden md:table-cell">Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContributions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                        <Package className="h-10 w-10 text-slate-300" />
                        {contributions.length === 0 ? (
                           <div className="text-center">
                             <p className="font-medium text-slate-900 dark:text-white">No contributions yet</p>
                             <p className="text-sm">Submit your first product above to start earning points!</p>
                           </div>
                        ) : (
                           <p>No contributions match your search or filter.</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContributions.map((contribution) => (
                    <motion.tr 
                      key={contribution.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <TableCell>
                         <div className="font-medium text-slate-900 dark:text-white">
                           {contribution.product_name}
                         </div>
                         <div className="text-xs text-slate-500 mt-0.5 md:hidden">
                           {format(new Date(contribution.created_at), 'MMM d, yyyy')}
                         </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {contribution.barcode}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500">
                        {format(new Date(contribution.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(contribution.status)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {contribution.points_awarded > 0 ? (
                          <span className="text-green-600">+{contribution.points_awarded}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedContribution(contribution);
                            setIsModalOpen(true);
                          }}
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ContributionDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contribution={selectedContribution}
      />
    </div>
  );
};

export default MyContributionHistory;