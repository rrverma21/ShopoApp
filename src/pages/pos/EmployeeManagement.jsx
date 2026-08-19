import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Lock, Users } from "lucide-react";
import EmployeeCard from "@/components/pos/employees/EmployeeCard";
import EmployeeForm from "./EmployeeForm";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EmployeeManagement = () => {
  const { user } = useAuth();
  const { maxEmployees, currentEmployees, canAddEmployee, hasFeature, refreshLimits, isLoading: isLimitsLoading } = usePlanLimits();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase.from('employees').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      
      if (roleFilter !== 'all') query = query.eq('role', roleFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      
      const { data, error } = await query;
      if (error) throw error;
      setEmployees(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to fetch employees", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchEmployees();
  }, [user, roleFilter, statusFilter]);

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', employeeToDelete.id);
      if (error) throw error;
      toast({ title: "Success", description: "Employee deleted successfully" });
      fetchEmployees();
      refreshLimits();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete employee", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleView = (employee) => {
    navigate(`/pos/employees/${employee.id}`);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
    refreshLimits();
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featureLocked = !isLimitsLoading && !hasFeature('Employee Management');

  if (featureLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Lock className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Feature Locked</h2>
        <p className="text-slate-600 max-w-md mb-6">
          Employee Management is available on higher tier plans. Upgrade your subscription to manage staff, track attendance, and handle payroll.
        </p>
        <Button onClick={() => navigate('/membership')} className="bg-blue-600 hover:bg-blue-700">
          Upgrade Plan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <Users className="w-6 h-6" /> Employee Management
          </h1>
          <p className="text-slate-600 text-sm mt-1">Manage your team, roles, and profiles.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200 text-sm font-medium">
            <span className="text-slate-500">Usage: </span>
            <span className={`${currentEmployees >= maxEmployees ? 'text-red-600 font-bold' : 'text-blue-600'}`}>
              {currentEmployees} / {maxEmployees}
            </span>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingEmployee(null);
          }}>
            <DialogTrigger asChild>
              <Button disabled={!canAddEmployee() && !editingEmployee} className="bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:shadow-lg">
                <Plus className="w-4 h-4 mr-2" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              </DialogHeader>
              <EmployeeForm 
                employee={editingEmployee} 
                onSuccess={handleFormSuccess}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation Tabs (Simple buttons for now) */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 shadow-sm">Employees</Button>
        <Button variant="outline" onClick={() => navigate('/pos/employees/attendance')}>Attendance</Button>
        <Button variant="outline" onClick={() => navigate('/pos/employees/payments')}>Payments</Button>
        <Button variant="outline" onClick={() => navigate('/pos/employees/advances')}>Advances</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="accountant">Accountant</SelectItem>
              <SelectItem value="cashier">Cashier</SelectItem>
              <SelectItem value="sales_executive">Sales Executive</SelectItem>
              <SelectItem value="delivery_man">Delivery Man</SelectItem>
              <SelectItem value="other">Others</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No employees found</h3>
          <p className="text-slate-500 mb-6">Add your first employee to get started.</p>
          <Button onClick={() => setIsFormOpen(true)} disabled={!canAddEmployee()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map(emp => (
            <EmployeeCard 
              key={emp.id} 
              employee={emp} 
              onEdit={handleEdit} 
              onDelete={handleDeleteClick}
              onView={handleView}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee
              {employeeToDelete && <span className="font-medium text-slate-900"> {employeeToDelete.name}</span>} and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeManagement;