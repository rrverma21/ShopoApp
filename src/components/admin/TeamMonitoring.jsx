import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, MapPin, Eye, Calendar, Clock, Filter, Activity 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const TeamMonitoring = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]); // Mock activities for now
  const [selectedMember, setSelectedMember] = useState('all');

  useEffect(() => {
    if(user) {
      fetchMembers();
      // In a real app, we would fetch activity logs from a table like 'activity_logs'
      // For now, we'll mock some data based on the fetched members
      generateMockActivities();
    }
  }, [user]);

  const fetchMembers = async () => {
    // Corrected: Use contact_person instead of full_name
    const { data } = await supabase
      .from('team_members')
      .select('*, profile:profiles!team_members_user_id_fkey(contact_person)')
      .eq('admin_id', user.id);
    setMembers(data || []);
  };

  const generateMockActivities = () => {
    // This mocks a stream of activities. In production, connect this to a real DB table.
    const actions = ['Viewed Shop', 'Updated Order', 'Added Note', 'Checked In'];
    const mock = Array(10).fill(null).map((_, i) => ({
      id: i,
      user: `Team Member ${Math.floor(Math.random() * 5) + 1}`,
      action: actions[Math.floor(Math.random() * actions.length)],
      details: `Pincode: 4000${Math.floor(Math.random() * 90) + 10}`,
      time: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toLocaleString()
    }));
    setActivities(mock);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Monitoring</h2>
          <p className="text-slate-500">Track team activities and coverage.</p>
        </div>
        <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Member" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.profile?.contact_person || 'Unknown'}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-muted-foreground">Team members currently active</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pincodes Covered</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {new Set(members.flatMap(m => m.assigned_pincodes || [])).size}
                </div>
                <p className="text-xs text-muted-foreground">Unique territories assigned</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{activities.length}</div>
                <p className="text-xs text-muted-foreground">Actions in last 24h</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activities.map((activity) => (
                        <TableRow key={activity.id}>
                            <TableCell className="font-medium">{activity.user}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{activity.action}</Badge>
                            </TableCell>
                            <TableCell>{activity.details}</TableCell>
                            <TableCell className="text-slate-500 text-sm">
                                <div className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {activity.time}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                     {activities.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                                No recent activity found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamMonitoring;