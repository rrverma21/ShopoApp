import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, UserPlus, MapPin, Shield, Activity, Search, 
  MoreVertical, Edit, Trash2, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const TeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    roles: [], // Changed from single role to array of roles
    pincodes: ''
  });

  const availableRoles = [
    { value: 'rider_approvals', label: 'Rider Approvals' },
    { value: 'sellers', label: 'Sellers' },
    { value: 'sellers_limit', label: 'Sellers Limit' },
    { value: 'riders', label: 'Riders' },
    { value: 'shop_zones', label: 'Shop & Zones' },
    { value: 'zones', label: 'Zones' },
    { value: 'bookings', label: 'Bookings' },
    { value: 'delivery_stats', label: 'Delivery Stats' },
    // Legacy roles for compatibility
    { value: 'manager', label: 'Manager' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'member', label: 'Member' }
  ];

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
    }
  }, [user]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profile:profiles!team_members_user_id_fkey (
            contact_person,
            phone,
            avatar_url
          )
        `)
        .eq('admin_id', user.id);

      if (error) throw error;
      
      // Ensure role is always treated as an array even if legacy data exists
      const normalizedData = (data || []).map(member => ({
        ...member,
        role: Array.isArray(member.role) ? member.role : [member.role].filter(Boolean)
      }));

      setTeamMembers(normalizedData);
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({
        title: "Error",
        description: "Failed to load team members.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (roleValue) => {
    setFormData(prev => {
      const currentRoles = prev.roles || [];
      if (currentRoles.includes(roleValue)) {
        return { ...prev, roles: currentRoles.filter(r => r !== roleValue) };
      } else {
        return { ...prev, roles: [...currentRoles, roleValue] };
      }
    });
  };

  const handleOpenAddModal = () => {
    setFormData({
      fullName: '',
      phone: '',
      roles: [],
      pincodes: ''
    });
    setIsAddMemberOpen(true);
  };

  const handleCreateMember = async () => {
    try {
      if (formData.roles.length === 0) {
        toast({
          title: "Role Required",
          description: "Please select at least one role for the team member.",
          variant: "destructive"
        });
        return;
      }

      // 1. Find user by phone in profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', formData.phone)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
         toast({
            title: "User not found",
            description: "The user must already be registered on the platform with this phone number.",
            variant: "destructive"
         });
         return;
      }

      const targetUserId = profileData.id;

      // Check if already a team member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('admin_id', user.id)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existingMember) {
        toast({
          title: "Already Added",
          description: "This user is already in your team.",
          variant: "destructive"
        });
        return;
      }

      // 2. Add to team_members table
      const pincodeArray = formData.pincodes.split(',').map(p => p.trim()).filter(p => p);

      const { error: teamError } = await supabase
        .from('team_members')
        .insert({
          admin_id: user.id,
          user_id: targetUserId,
          role: formData.roles, // Passing array
          assigned_pincodes: pincodeArray,
          status: 'active'
        });

      if (teamError) throw teamError;

      toast({
        title: "Success",
        description: "Team member added successfully.",
      });
      setIsAddMemberOpen(false);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error creating member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add team member.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    try {
      const pincodeArray = formData.pincodes.split(',').map(p => p.trim()).filter(p => p);

      const { error } = await supabase
        .from('team_members')
        .update({
          role: formData.roles, // Passing array
          assigned_pincodes: pincodeArray,
          status: formData.status 
        })
        .eq('id', selectedMember.id);

      if (error) throw error;

      toast({ title: "Updated", description: "Team member details updated." });
      setIsEditMemberOpen(false);
      fetchTeamMembers();
    } catch (error) {
       toast({ title: "Error", description: "Failed to update member.", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member from your team?")) return;
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;
      toast({ title: "Removed", description: "Member removed from team." });
      fetchTeamMembers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      ...formData,
      roles: Array.isArray(member.role) ? member.role : [member.role].filter(Boolean),
      pincodes: member.assigned_pincodes ? member.assigned_pincodes.join(', ') : '',
      fullName: member.profile?.contact_person || 'Unknown',
      phone: member.profile?.phone || ''
    });
    setIsEditMemberOpen(true);
  };

  const getRoleLabel = (roleValue) => {
    const role = availableRoles.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  };

  const filteredMembers = teamMembers.filter(m => 
    m.profile?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.profile?.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Team</h2>
          <p className="text-slate-500">Manage your team members, roles, and territory access.</p>
        </div>
        <Button className="btn-primary" onClick={handleOpenAddModal}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Member
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <motion.div 
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                      {member.profile?.contact_person ? member.profile.contact_person.charAt(0) : 'U'}
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">
                        {member.profile?.contact_person || 'Unknown User'}
                      </CardTitle>
                      <CardDescription>{member.profile?.phone}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEditModal(member)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Access
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleRemoveMember(member.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-1">
                    <span className="text-slate-500 text-sm flex items-center mb-1">
                      <Shield className="h-3 w-3 mr-1" /> Roles
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.role && member.role.length > 0 ? (
                        member.role.map((r, idx) => (
                          <Badge key={idx} variant="outline" className="capitalize bg-blue-50 text-blue-700 border-blue-200">
                            {getRoleLabel(r)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No roles assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 text-sm flex items-center mb-1">
                      <MapPin className="h-3 w-3 mr-1" /> Assigned Pincodes
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.assigned_pincodes && member.assigned_pincodes.length > 0 ? (
                        member.assigned_pincodes.map((pin, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {pin}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No pincodes assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t mt-2">
                    <span className="text-slate-500 flex items-center">
                      <Activity className="h-3 w-3 mr-1" /> Status
                    </span>
                    <div className="flex items-center text-green-600 text-xs font-medium">
                      <CheckCircle className="h-3 w-3 mr-1" /> Active
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500">No team members found.</p>
              <Button variant="link" onClick={handleOpenAddModal}>Add your first member</Button>
            </div>
          )}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add an existing registered user to your team by their phone number.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number (Registered User)</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="e.g. 9876543210" />
            </div>
            
            <div className="grid gap-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-4 bg-slate-50 max-h-[200px] overflow-y-auto">
                {availableRoles.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`role-${role.value}`} 
                      checked={formData.roles.includes(role.value)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                    />
                    <label 
                      htmlFor={`role-${role.value}`} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pincodes">Assigned Pincodes (comma separated)</Label>
              <Textarea 
                id="pincodes" 
                name="pincodes" 
                value={formData.pincodes} 
                onChange={handleInputChange} 
                placeholder="e.g. 400001, 400002, 400050" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateMember}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Modify access rights for {formData.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>User</Label>
              <div className="p-2 bg-slate-100 rounded text-sm text-slate-700">
                {formData.fullName} ({formData.phone})
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-4 bg-slate-50 max-h-[200px] overflow-y-auto">
                {availableRoles.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`edit-role-${role.value}`} 
                      checked={formData.roles.includes(role.value)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                    />
                    <label 
                      htmlFor={`edit-role-${role.value}`} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-pincodes">Assigned Pincodes (comma separated)</Label>
              <Textarea 
                id="edit-pincodes" 
                name="pincodes" 
                value={formData.pincodes} 
                onChange={handleInputChange} 
                placeholder="e.g. 400001, 400002" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateMember}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;