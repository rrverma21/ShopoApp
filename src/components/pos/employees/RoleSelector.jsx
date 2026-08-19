import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ROLES = [
  { id: 'manager', label: 'Manager', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'accountant', label: 'Accountant', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'cashier', label: 'Cashier', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'sales_executive', label: 'Sales Executive', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'delivery_man', label: 'Delivery Man', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'other', label: 'Others', color: 'bg-gray-100 text-gray-700 border-gray-200' }
];

export const getRoleColor = (roleId) => {
  const role = ROLES.find(r => r.id === roleId?.toLowerCase().replace(' ', '_')) || ROLES[5];
  return role.color;
};

const RoleSelector = ({ value, onValueChange, className }) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${role.color.split(' ')[0]}`} />
              {role.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default RoleSelector;