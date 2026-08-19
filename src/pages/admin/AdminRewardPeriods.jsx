import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, 
  Calendar, 
  Plus, 
  Target, 
  Gift, 
  Download, 
  Loader2,
  Medal,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const AdminRewardPeriods = () => {
  const { toast } = useToast();
  
  // State Management
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isMarkingWinners, setIsMarkingWinners] = useState(false);
  
  // Create Period Form State
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    rewardPool: ''
  });

  // Fetch Periods on Mount
  useEffect(() => {
    fetchRewardPeriods();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('reward_periods_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_periods' }, () => {
        fetchRewardPeriods();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Leaderboard when Period Changes
  useEffect(() => {
    if (selectedPeriodId) {
      fetchLeaderboard(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const fetchRewardPeriods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reward_periods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPeriods(data || []);
      
      // Auto-select most recent if none selected
      if (data && data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
      toast({
        title: "Error",
        description: "Failed to load reward periods.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (periodId) => {
    try {
      setLeaderboardLoading(true);
      const currentPeriod = periods.find(p => p.id === periodId);
      if (!currentPeriod) return;

      // 1. Fetch Contributors 
      const { data: contributorsData, error: contribError } = await supabase
        .from('contributors')
        .select('id, phone, total_approved_contributions, total_rejected_contributions, created_at, total_points')
        .order('total_approved_contributions', { ascending: false });

      if (contribError) throw contribError;

      // 2. Fetch Winners to annotate
      const { data: winners, error: winnersError } = await supabase
        .from('reward_winners')
        .select('contributor_id, rank, reward_details')
        .eq('period_id', periodId);

      if (winnersError) throw winnersError;

      // Map winners to leaderboard
      const winnersMap = new Map(winners.map(w => [w.contributor_id, w]));
      
      const leaderboardData = contributorsData.map((entry, index) => ({
        contributorId: entry.id,
        phone: entry.phone || 'Unknown',
        approved_uploads: entry.total_approved_contributions || 0,
        total_uploads: (entry.total_approved_contributions || 0) + (entry.total_rejected_contributions || 0),
        points: entry.total_points || 0,
        created_at: entry.created_at,
        rank: index + 1,
        isWinner: winnersMap.has(entry.id),
        rewardDetails: winnersMap.get(entry.id)?.reward_details
      }));

      setLeaderboard(leaderboardData);

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to calculate leaderboard.",
        variant: "destructive"
      });
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleCreatePeriod = async () => {
    // Validation
    if (!formData.name || formData.name.length < 3) {
      toast({ title: "Validation Error", description: "Name must be at least 3 characters.", variant: "destructive" });
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast({ title: "Validation Error", description: "Start and End dates are required.", variant: "destructive" });
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({ title: "Validation Error", description: "Start date cannot be after end date.", variant: "destructive" });
      return;
    }

    try {
      setIsCreating(true);
      const { error } = await supabase
        .from('reward_periods')
        .insert([{
          name: formData.name,
          start_date: formData.startDate,
          end_date: formData.endDate,
          status: 'active',
          is_active: true,
          rewards_config: { pool: formData.rewardPool }
        }]);

      if (error) throw error;

      toast({ title: "Success", description: "Reward period created successfully." });
      setShowCreateModal(false);
      setFormData({ name: '', startDate: '', endDate: '', rewardPool: '' });
      fetchRewardPeriods(); 

    } catch (error) {
      console.error('Error creating period:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkWinners = async () => {
    if (!selectedPeriodId || leaderboard.length === 0) return;

    try {
      setIsMarkingWinners(true);

      // 1. Delete existing winners for this period
      const { error: deleteError } = await supabase
        .from('reward_winners')
        .delete()
        .eq('period_id', selectedPeriodId);

      if (deleteError) throw deleteError;

      // 2. Select top 3 winners
      const topWinners = leaderboard.slice(0, 3).map((entry, index) => ({
        period_id: selectedPeriodId,
        contributor_id: entry.contributorId,
        rank: index + 1,
        total_points: entry.points,
        reward_details: index === 0 ? 'Gold Reward' : index === 1 ? 'Silver Reward' : 'Bronze Reward',
        is_claimed: false
      }));

      if (topWinners.length > 0) {
        const { error: insertError } = await supabase
          .from('reward_winners')
          .insert(topWinners);
          
        if (insertError) throw insertError;
      }

      toast({ title: "Success", description: "Winners have been marked and recorded." });
      fetchLeaderboard(selectedPeriodId); 

    } catch (error) {
      console.error('Error marking winners:', error);
      toast({ title: "Error", description: "Failed to mark winners.", variant: "destructive" });
    } finally {
      setIsMarkingWinners(false);
    }
  };

  const handleExportCSV = () => {
    if (!leaderboard.length) return;

    const currentPeriod = periods.find(p => p.id === selectedPeriodId);
    const fileName = `leaderboard-${currentPeriod?.name || 'export'}.csv`;
    
    // CSV Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Rank,Phone,Approved Uploads,Total Uploads,Points,Is Winner,Reward\n";

    // CSV Rows
    leaderboard.forEach(row => {
      csvContent += `${row.rank},${row.phone},${row.approved_uploads},${row.total_uploads},${row.points},${row.isWinner ? 'Yes' : 'No'},${row.rewardDetails || ''}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Exported", description: "Leaderboard downloaded successfully." });
  };

  const selectedPeriodData = periods.find(p => p.id === selectedPeriodId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reward Periods</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage challenges and distribute community rewards.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
             {/* Period Selector */}
             <Select 
               value={selectedPeriodId || ''} 
               onValueChange={setSelectedPeriodId}
               disabled={loading}
             >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Period
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Period Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Period Details</CardTitle>
              <CardDescription>Configuration for selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
              ) : selectedPeriodData ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedPeriodData.name}</h3>
                    <Badge variant={selectedPeriodData.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                      {selectedPeriodData.status?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Start: {new Date(selectedPeriodData.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>End: {new Date(selectedPeriodData.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Gift className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-emerald-600">
                        Pool: {selectedPeriodData.rewards_config?.pool || 'Not set'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <Button 
                      onClick={handleMarkWinners} 
                      disabled={isMarkingWinners || leaderboard.length === 0}
                      variant="outline" 
                      className="w-full justify-start gap-2"
                    >
                      {isMarkingWinners ? <Loader2 className="w-4 h-4 animate-spin" /> : <Medal className="w-4 h-4 text-orange-500" />}
                      Mark Top 3 as Winners
                    </Button>
                    <Button 
                      onClick={handleExportCSV}
                      disabled={leaderboard.length === 0}
                      variant="outline" 
                      className="w-full justify-start gap-2"
                    >
                      <Download className="w-4 h-4 text-blue-500" />
                      Export Leaderboard CSV
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">No period selected</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Leaderboard Table */}
        <div className="lg:col-span-2">
          <Card className="h-full border-t-4 border-t-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                   <CardTitle>Leaderboard</CardTitle>
                   <CardDescription>Top contributors by approved uploads</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Target className="w-3 h-3" />
                  {leaderboard.length} Contributors
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p>Calculating rankings...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Rank</TableHead>
                      <TableHead>User (Phone)</TableHead>
                      <TableHead className="text-center">Approved Uploads</TableHead>
                      <TableHead className="text-right">Total Uploads</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          No approved contributions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaderboard.map((user) => (
                        <TableRow key={user.contributorId} className={user.isWinner ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}>
                          <TableCell>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                              user.rank === 1 ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400" :
                              user.rank === 2 ? "bg-slate-100 text-slate-700 ring-2 ring-slate-300" :
                              user.rank === 3 ? "bg-orange-100 text-orange-800 ring-2 ring-orange-300" :
                              "bg-slate-50 text-slate-500"
                            )}>
                              {user.rank}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.phone}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{user.approved_uploads}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-700 dark:text-slate-300">
                            {user.total_uploads}
                          </TableCell>
                          <TableCell className="text-right">
                            {user.isWinner && (
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                                Winner
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Period Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Reward Period</DialogTitle>
            <DialogDescription>
              Set up a new contribution challenge period.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input 
                id="name" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. March Madness" 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start" className="text-right">Start</Label>
              <Input 
                id="start" 
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end" className="text-right">End</Label>
              <Input 
                id="end" 
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pool" className="text-right">Reward Pool</Label>
              <Input 
                id="pool" 
                value={formData.rewardPool}
                onChange={(e) => setFormData({...formData, rewardPool: e.target.value})}
                placeholder="e.g. ₹10,000" 
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreatePeriod} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRewardPeriods;