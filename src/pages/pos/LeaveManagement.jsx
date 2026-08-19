import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Clock, Check, X, Calendar } from "lucide-react";
import { format, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const LeaveManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: emps } = await supabase.from('employees').select('*').eq('user_id', user.id);
      setEmployees(emps || []);

      const { data: leaveData, error } = await supabase
        .from('employee_leaves')
        .select(`*, employees(name, role)`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLeaves(leaveData || []);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load leave requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      const { error } = await supabase
        .from('employee_leaves')
        .update({ status, approved_by: user.id })
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Success", description: `Leave request ${status}` });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const filteredLeaves = filterType === 'all' 
    ? leaves 
    : leaves.filter(l => l.status === filterType);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-600" /> Leave Management
          </h1>
          <p className="text-slate-500 mt-1">Review and manage employee leave requests.</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" /> Request Leave
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">No leave requests found.</div>
          ) : (
            filteredLeaves.map((leave) => {
              const days = differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1;
              return (
                <Card key={leave.id} className="hover:border-purple-200 transition-colors">
                  <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-slate-100">{leave.employees?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-slate-900">{leave.employees?.name}</h3>
                        <div className="flex flex-wrap gap-2 items-center mt-1">
                          <Badge variant="outline" className="text-xs">{leave.leave_type}</Badge>
                          <span className="text-sm text-slate-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                            <span className="ml-2 font-medium text-slate-700">({days} days)</span>
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded inline-block max-w-xl">
                          Reason: {leave.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto md:ml-0">
                      {leave.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(leave.id, 'approved')}>
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction(leave.id, 'rejected')}>
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge className={
                          leave.status === 'approved' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }>
                          {leave.status.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;