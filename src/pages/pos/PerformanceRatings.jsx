import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Star, User } from "lucide-react";
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const PerformanceRatings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterEmp, setFilterEmp] = useState('all');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: emps } = await supabase.from('employees').select('*').eq('user_id', user.id);
      setEmployees(emps || []);

      const { data: ratingData, error } = await supabase
        .from('employee_performance_ratings')
        .select(`*, employees(name, role)`)
        .order('rating_date', { ascending: false });
      
      if (error) throw error;
      setRatings(ratingData || []);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load ratings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredRatings = filterEmp === 'all' 
    ? ratings 
    : ratings.filter(r => r.employee_id === filterEmp);

  const getRatingColor = (score) => {
    if (score >= 4.5) return "text-green-600";
    if (score >= 3.5) return "text-blue-600";
    if (score >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" /> Performance Ratings
          </h1>
          <p className="text-slate-500 mt-1">Track and evaluate employee performance.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Rating
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRatings.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">No performance ratings found.</div>
          ) : (
            filteredRatings.map((rating) => (
              <Card key={rating.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                          {rating.employees?.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-slate-900">{rating.employees?.name}</h3>
                        <p className="text-xs text-slate-500">{rating.employees?.role}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{format(new Date(rating.rating_date), 'MMM d, yyyy')}</Badge>
                  </div>
                  
                  <div className="mb-4">
                     <div className="flex justify-between items-center mb-1">
                       <span className="text-sm font-medium text-slate-700">Overall Rating</span>
                       <span className={`text-lg font-bold ${getRatingColor(rating.rating_score)}`}>{rating.rating_score}/5.0</span>
                     </div>
                     <Progress value={rating.rating_score * 20} className="h-2" />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 mb-4 min-h-[60px]">
                    "{rating.feedback || "No additional comments provided."}"
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Reviewer ID: {rating.rated_by?.slice(0,8)}...</span>
                    <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 p-0">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceRatings;