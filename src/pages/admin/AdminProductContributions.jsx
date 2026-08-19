import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, 
  X, 
  Search, 
  FileText, 
  Award, 
  Clock, 
  ChevronLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const AdminProductContributions = () => {
  const { toast } = useToast();
  
  // State
  const [contributions, setContributions] = useState([]);
  const [filteredContributions, setFilteredContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  
  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    points: 0
  });

  // Fetch Data on Mount
  useEffect(() => {
    fetchContributions();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('public:product_contributions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_contributions' }, () => {
        fetchContributions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter Data when dependencies change
  useEffect(() => {
    filterData();
  }, [contributions, selectedStatus, searchQuery]);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_contributions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContributions(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching contributions:', error);
      toast({
        title: "Error",
        description: "Failed to load contribution data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const newStats = data.reduce((acc, item) => {
      acc.total++;
      if (item.status === 'pending') acc.pending++;
      if (item.status === 'approved') {
        acc.approved++;
        acc.points += (item.points_awarded || 0);
      }
      if (item.status === 'rejected') acc.rejected++;
      return acc;
    }, { total: 0, pending: 0, approved: 0, rejected: 0, points: 0 });

    setStats(newStats);
  };

  const filterData = () => {
    let result = [...contributions];

    // Status Filter
    if (selectedStatus !== 'all') {
      result = result.filter(item => item.status === selectedStatus);
    }

    // Search Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.product_name || '').toLowerCase().includes(lowerQuery) ||
        (item.barcode || '').toLowerCase().includes(lowerQuery) ||
        (item.phone || '').includes(lowerQuery)
      );
    }

    setFilteredContributions(result);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      setProcessingId(id);
      
      const updates = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id
      };

      // If approving, award points (example logic: 10 points)
      if (newStatus === 'approved') {
        updates.points_awarded = 10;
      } else {
        updates.points_awarded = 0;
      }

      const { error } = await supabase
        .from('product_contributions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Contribution marked as ${newStatus}.`,
        variant: newStatus === 'approved' ? 'default' : 'destructive'
      });
      
      // Refresh list
      fetchContributions();

    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Product Contributions</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Review and manage crowdsourced product data.</p>
          </div>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Added to catalog</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Distributed</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.points}</div>
            <p className="text-xs text-muted-foreground">Community rewards</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>Recent product contributions from users.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search barcode, name or phone..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={selectedStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button 
                  variant={selectedStatus === 'pending' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('pending')}
                  size="sm"
                >
                  Pending
                </Button>
                <Button 
                  variant={selectedStatus === 'approved' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('approved')}
                  size="sm"
                >
                  Approved
                </Button>
                <Button 
                  variant={selectedStatus === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('rejected')}
                  size="sm"
                >
                  Rejected
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Info</TableHead>
                <TableHead>Contributor Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Points</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton Loading State
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredContributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="h-8 w-8 mb-2 text-slate-300" />
                      <p>No contributions found matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContributions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.product_name} 
                            className="w-10 h-10 rounded-md object-cover border bg-slate-50"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{item.product_name || 'Unknown Product'}</div>
                          <div className="text-xs text-muted-foreground font-mono bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {item.barcode}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">
                      {item.phone || 'Anonymous'}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                      <div className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        item.status === 'approved' ? 'success' : 
                        item.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      } className={
                        item.status === 'approved' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' : 
                        item.status === 'rejected' ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' : 
                        'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200'
                      }>
                        {item.status ? item.status.toUpperCase() : 'UNKNOWN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.points_awarded > 0 ? (
                        <span className="text-emerald-600 font-bold">+{item.points_awarded}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => handleStatusUpdate(item.id, 'rejected')}
                            disabled={processingId === item.id}
                          >
                            {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            onClick={() => handleStatusUpdate(item.id, 'approved')}
                            disabled={processingId === item.id}
                          >
                            {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProductContributions;