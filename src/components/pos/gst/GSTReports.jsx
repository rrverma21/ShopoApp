import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportGenerator from './ReportGenerator';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, format } from 'date-fns';

const GSTReports = ({ sellerId }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const isAprilOrLater = currentMonth >= 3;
  const fyStartYear = isAprilOrLater ? currentYear : currentYear - 1;

  const presets = {
    'current_month': {
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    },
    'current_fy': {
      from: `${fyStartYear}-04-01`,
      to: `${fyStartYear + 1}-03-31`
    },
    'prev_fy': {
      from: `${fyStartYear - 1}-04-01`,
      to: `${fyStartYear}-03-31`
    }
  };

  const [dateRange, setDateRange] = useState(presets['current_month']);
  const [preset, setPreset] = useState('current_month');

  const handlePresetChange = (val) => {
    setPreset(val);
    if (presets[val]) {
      setDateRange(presets[val]);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <Label>Quick Selection</Label>
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="current_fy">Current FY ({fyStartYear}-{fyStartYear + 1})</SelectItem>
                  <SelectItem value="prev_fy">Previous FY ({fyStartYear - 1}-{fyStartYear})</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input 
                type="date" 
                value={dateRange.from} 
                onChange={(e) => { setDateRange(p => ({...p, from: e.target.value})); setPreset('custom'); }} 
                className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
              />
            </div>
            
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input 
                type="date" 
                value={dateRange.to} 
                onChange={(e) => { setDateRange(p => ({...p, to: e.target.value})); setPreset('custom'); }}
                className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportGenerator sellerId={sellerId} dateRange={dateRange} />
    </div>
  );
};

export default GSTReports;