import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calculator, DollarSign, Download, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const PaymentManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (user) fetchPayments();
  }, [user, month, year]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // 1. Fetch active employees
      const { data: emps, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      if (empError) throw empError;

      // 2. Fetch existing payments for month
      const { data: existingPayments, error: payError } = await supabase
        .from('employee_payments')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .in('employee_id', emps.map(e => e.id));

      if (payError) throw payError;

      // 3. Fetch Pending Advances (to calculate deductions automatically if needed)
      const { data: advances } = await supabase
        .from('employee_advances')
        .select('*')
        .eq('status', 'approved')
        .in('employee_id', emps.map(e => e.id));

      // 4. Merge
      const data = emps.map(emp => {
        const existing = existingPayments.find(p => p.employee_id === emp.id);
        const empAdvances = advances?.filter(a => a.employee_id === emp.id).reduce((sum, a) => sum + Number(a.amount), 0) || 0;
        
        if (existing) return { ...existing, employee_name: emp.name, base_salary: emp.salary };
        
        return {
          employee_id: emp.id,
          employee_name: emp.name,
          base_salary: emp.salary,
          salary_amount: emp.salary,
          bonus: 0,
          deductions: empAdvances > 0 ? empAdvances : 0, // Suggest deduction if advances exist
          net_pay: Number(emp.salary) - (empAdvances > 0 ? empAdvances : 0),
          status: 'pending',
          is_new: true,
          has_advances: empAdvances > 0
        };
      });

      setPayments(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load payments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (index, field, value) => {
    const newPayments = [...payments];
    const item = { ...newPayments[index], [field]: Number(value) };
    // Recalculate net pay
    item.net_pay = item.salary_amount + item.bonus - item.deductions;
    newPayments[index] = item;
    setPayments(newPayments);
  };

  const markAsPaid = async (index) => {
    const item = payments[index];
    try {
      const payload = {
        employee_id: item.employee_id,
        month,
        year,
        salary_amount: item.salary_amount,
        bonus: item.bonus,
        deductions: item.deductions,
        net_pay: item.net_pay,
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0]
      };

      let error;
      if (item.id) {
        const { error: updError } = await supabase.from('employee_payments').update(payload).eq('id', item.id);
        error = updError;
      } else {
        const { error: insError } = await supabase.from('employee_payments').insert([payload]);
        error = insError;
      }

      if (error) throw error;

      // If deducted advances, mark advances as repaid? 
      // This logic is complex (which advance was repaid?). For now, manual update in Advances page is safer, 
      // or we just assume full deduction clears outstanding. 
      // Let's keep it simple: just mark payment as paid.

      toast({ title: "Success", description: "Payment recorded" });
      fetchPayments();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/pos/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
        </div>
        
        <div className="flex gap-2 bg-white p-2 rounded-lg border border-slate-200">
          <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 12}, (_, i) => (
                <SelectItem key={i+1} value={(i+1).toString()}>{format(new Date(2024, i, 1), 'MMMM')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Net Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{payments.reduce((sum, p) => sum + (p.net_pay || 0), 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{payments.filter(p => p.status !== 'paid').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{payments.filter(p => p.status === 'paid').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row justify-between items-center">
          <CardTitle>Salary Sheet</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead className="w-[120px]">Bonus</TableHead>
                <TableHead className="w-[120px]">Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">No employees found.</TableCell>
                </TableRow>
              ) : (
                payments.map((payment, index) => (
                  <TableRow key={payment.employee_id}>
                    <TableCell className="font-medium">
                      {payment.employee_name}
                      {payment.has_advances && <span className="block text-xs text-orange-600">Has pending advances</span>}
                    </TableCell>
                    <TableCell>₹{Number(payment.base_salary).toLocaleString()}</TableCell>
                    <TableCell>
                      {payment.status === 'paid' ? (
                        `₹${payment.bonus}`
                      ) : (
                        <Input 
                          type="number" 
                          className="h-8 w-24" 
                          value={payment.bonus} 
                          onChange={(e) => handleUpdate(index, 'bonus', e.target.value)} 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.status === 'paid' ? (
                        `₹${payment.deductions}`
                      ) : (
                        <Input 
                          type="number" 
                          className="h-8 w-24" 
                          value={payment.deductions} 
                          onChange={(e) => handleUpdate(index, 'deductions', e.target.value)} 
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-blue-700">₹{payment.net_pay.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'} className={payment.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}>
                        {payment.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.status !== 'paid' && (
                        <Button size="sm" onClick={() => markAsPaid(index)} className="bg-green-600 hover:bg-green-700 h-8">
                          <CheckCircle className="w-3 h-3 mr-1" /> Pay
                        </Button>
                      )}
                      {payment.status === 'paid' && (
                        <span className="text-xs text-slate-500">Paid on {payment.paid_date}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default PaymentManagement;