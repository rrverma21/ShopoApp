import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Store, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const NewSellerRegistrations = () => {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('30'); // '7', '30', 'all'

  const fetchSellers = async () => {
    setLoading(true);
    try {
      // Use the database function that properly joins with auth.users
      const daysBack = dateFilter === 'all' ? null : parseInt(dateFilter);
      
      const { data, error } = await supabase.rpc('get_new_sellers_with_dates', {
        days_back: daysBack
      });
      
      if (error) throw error;
      
      setSellers(data || []);
      setFilteredSellers(data || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      setSellers([]);
      setFilteredSellers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [dateFilter]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSellers(sellers);
      return;
    }
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = sellers.filter(s => 
      s.business_name?.toLowerCase().includes(lowerSearch) || 
      s.contact_person?.toLowerCase().includes(lowerSearch) ||
      s.phone?.includes(lowerSearch)
    );
    setFilteredSellers(filtered);
  }, [searchTerm, sellers]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-blue-100 dark:border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">New Sellers (Last {dateFilter === 'all' ? 'All Time' : `${dateFilter} Days`})</p>
              <h3 className="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-1">{sellers.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
              <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Seller Registrations</CardTitle>
              <CardDescription>View newly registered sellers and their plan details.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search sellers..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-1 border">
                <Button variant={dateFilter === '7' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDateFilter('7')} className="text-xs">7 Days</Button>
                <Button variant={dateFilter === '30' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDateFilter('30')} className="text-xs">30 Days</Button>
                <Button variant={dateFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDateFilter('all')} className="text-xs">All Time</Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead>Business Details</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Current Plan</TableHead>
                <TableHead className="text-right">Products</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading sellers...</TableCell></TableRow>
              ) : filteredSellers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">No registrations found for this period.</TableCell></TableRow>
              ) : (
                filteredSellers.map((seller) => (
                  <TableRow key={seller.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{seller.business_name || 'Unnamed Business'}</div>
                      <div className="text-xs text-slate-500 mt-1">{seller.contact_person || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{seller.phone || 'No phone'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {seller.user_created_at ? format(new Date(seller.user_created_at), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300">
                        {seller.plan_name || 'Free Starter'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {seller.product_count || 0}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewSellerRegistrations;