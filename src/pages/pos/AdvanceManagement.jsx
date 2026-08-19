import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Check, X, Undo2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const AdvanceManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newAdvance, setNewAdvance] = useState({ employee_id: '', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (user) {
      fetchEmployees();
      fetchAdvances();
    }
  }, [user]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, name').eq('user_id', user.id).eq('status', 'active');
    setEmployees(data || []);
  };

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      // Need to join employees to get name. Supabase JS generic client might not do deep joins easily without defined relationships in code or views, 
      // but 'employees' table is related via FK.
      const { data, error } = await supabase
        .from('employee_advances')
        .select(`
          *,
          employee:employees(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvances(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load advances", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('employee_advances').insert([newAdvance]);
      if (error) throw error;
      toast({ title: "Success", description: "Advance request created" });
      setIsFormOpen(false);
      setNewAdvance({ employee_id: '', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });
      fetchAdvances();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create request", variant: "destructive" });
    }
  };

  const updateStatus = async (id, status, extraData = {}) => {
    try {
      const { error } = await supabase
        .from('employee_advances')
        .update({ status, ...extraData })
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: `Advance marked as ${status}` });
      fetchAdvances();
    } catch (error) {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/pos/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Advances</h1>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Advance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                <Select value={newAdvance.employee_id} onValueChange={(v) => setNewAdvance(prev => ({...prev, employee_id: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (₹)</label>
                <Input type="number" required value={newAdvance.amount} onChange={e => setNewAdvance(prev => ({...prev, amount: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" required value={newAdvance.date} onChange={e => setNewAdvance(prev => ({...prev, date: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Input required value={newAdvance.reason} onChange={e => setNewAdvance(prev => ({...prev, reason: e.target.value}))} />
              </div>
              <Button type="submit" className="w-full">Submit Request</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="pt-6">
            <p className="text-sm text-orange-600 font-medium">Total Pending Advances</p>
            <h2 className="text-3xl font-bold text-orange-700 mt-2">
              ₹{advances.filter(a => a.status === 'approved' || a.status === 'pending').reduce((sum, a) => sum + Number(a.amount), 0).toLocaleString()}
            </h2>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-6">
            <p className="text-sm text-green-600 font-medium">Total Repaid</p>
            <h2 className="text-3xl font-bold text-green-700 mt-2">
              ₹{advances.filter(a => a.status === 'repaid').reduce((sum, a) => sum + Number(a.amount), 0).toLocaleString()}
            </h2>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Advance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {advances.map(adv => (
              <div key={adv.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-blue-100 transition-all">
                <div className="flex-1 mb-2 md:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800">{adv.employee?.name}</h3>
                    <Badge variant="outline" className={
                      adv.status === 'approved' ? 'text-green-600 border-green-200 bg-green-50' :
                      adv.status === 'rejected' ? 'text-red-600 border-red-200 bg-red-50' :
                      adv.status === 'repaid' ? 'text-slate-500 border-slate-200 bg-slate-100' :
                      'text-yellow-600 border-yellow-200 bg-yellow-50'
                    }>
                      {adv.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500 flex gap-4">
                    <span>Date: {format(new Date(adv.date), 'MMM d, yyyy')}</span>
                    <span>Reason: {adv.reason}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-slate-700">₹{Number(adv.amount).toLocaleString()}</span>
                  
                  {adv.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => updateStatus(adv.id, 'approved')}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => updateStatus(adv.id, 'rejected')}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {adv.status === 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(adv.id, 'repaid', { repaid_date: new Date().toISOString() })}>
                      Mark Repaid
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {advances.length === 0 && <p className="text-center text-slate-500 py-4">No advances found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvanceManagement;