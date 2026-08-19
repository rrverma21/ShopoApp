import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Download, Printer, FileText, Filter } from "lucide-react";
import { format } from 'date-fns';

const SalarySlips = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [slips, setSlips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: empData } = await supabase
        .from('employees')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'active');
      setEmployees(empData || []);

      // Fetch slips (from employee_payments table)
      let query = supabase
        .from('employee_payments')
        .select(`
          *,
          employees (name, role)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      // We filter in memory for now or apply more queries if list is huge
      // But typically we fetch relevant set
      const { data: slipData, error } = await query;
      
      if (error) throw error;
      
      // Filter based on ownership (RLS handles this but good to be safe)
      const mySlips = slipData.filter(s => s.employees !== null); // Ensure joined employee exists
      setSlips(mySlips);

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load salary slips", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredSlips = slips.filter(slip => {
    if (selectedEmployee !== 'all' && slip.employee_id !== selectedEmployee) return false;
    if (selectedYear !== 'all' && slip.year.toString() !== selectedYear) return false;
    if (selectedMonth !== 'all' && slip.month.toString() !== selectedMonth) return false;
    return true;
  });

  const handleDownload = (id) => {
    toast({ title: "Download", description: "Downloading PDF... (Feature placeholder)" });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> Salary Slips
          </h1>
          <p className="text-slate-500 mt-1">Manage and generate monthly salary slips for employees.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Generate New Slip
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Filter by Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({length: 12}, (_, i) => (
                    <SelectItem key={i+1} value={(i+1).toString()}>{format(new Date(2024, i, 1), 'MMMM')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : filteredSlips.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No salary slips found for selected criteria.</div>
          ) : (
            <div className="rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Month/Year</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlips.map((slip) => (
                    <TableRow key={slip.id}>
                      <TableCell className="font-medium">
                        {slip.employees?.name}
                        <div className="text-xs text-slate-500">{slip.employees?.role}</div>
                      </TableCell>
                      <TableCell>{format(new Date(slip.year, slip.month - 1), 'MMMM yyyy')}</TableCell>
                      <TableCell className="text-right text-green-600">₹{Number(slip.salary_amount + (slip.bonus || 0)).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">-₹{Number(slip.deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{Number(slip.net_pay).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={
                          slip.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }>
                          {slip.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => handleDownload(slip.id)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600">
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalarySlips;