import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoleSelector from "@/components/pos/employees/RoleSelector";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const EmployeeForm = ({ employee, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    salary: '',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active'
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        role: employee.role || '',
        salary: employee.salary || '',
        joining_date: employee.joining_date || new Date().toISOString().split('T')[0],
        status: employee.status || 'active'
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleStatusChange = (value) => {
    setFormData(prev => ({ ...prev, status: value }));
  };

  const validate = () => {
    if (!formData.name) return "Name is required";
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) return "Valid email is required";
    if (!formData.phone || !/^\d{10}$/.test(formData.phone)) return "Valid 10-digit phone number is required";
    if (!formData.role) return "Role is required";
    if (!formData.salary || isNaN(formData.salary) || Number(formData.salary) < 0) return "Valid salary is required";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast({ title: "Validation Error", description: error, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (employee) {
        // Update
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            salary: formData.salary,
            joining_date: formData.joining_date,
            status: formData.status
          })
          .eq('id', employee.id);

        if (updateError) throw updateError;
        toast({ title: "Success", description: "Employee updated successfully" });
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('employees')
          .insert([{
            user_id: user.id,
            ...formData
          }]);

        if (insertError) throw insertError;
        toast({ title: "Success", description: "Employee added successfully" });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({ 
        title: "Error", 
        description: err.message.includes('unique constraint') ? 'Email already exists' : 'Failed to save employee', 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (10 digits) *</Label>
          <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="9876543210" maxLength={10} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <RoleSelector value={formData.role} onValueChange={handleRoleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Monthly Salary (₹) *</Label>
          <Input id="salary" name="salary" type="number" value={formData.salary} onChange={handleChange} placeholder="25000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="joining_date">Joining Date *</Label>
          <Input id="joining_date" name="joining_date" type="date" value={formData.joining_date} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {employee ? 'Update Employee' : 'Add Employee'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default EmployeeForm;