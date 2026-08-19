import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Eye, MousePointerClick, DollarSign } from 'lucide-react';

const data = [
  { name: 'Mon', views: 400, clicks: 240, conversions: 24 },
  { name: 'Tue', views: 300, clicks: 139, conversions: 12 },
  { name: 'Wed', views: 200, clicks: 980, conversions: 98 },
  { name: 'Thu', views: 278, clicks: 390, conversions: 39 },
  { name: 'Fri', views: 189, clicks: 480, conversions: 48 },
  { name: 'Sat', views: 239, clicks: 380, conversions: 38 },
  { name: 'Sun', views: 349, clicks: 430, conversions: 43 },
];

const pieData = [
  { name: 'WhatsApp', value: 400 },
  { name: 'SMS', value: 300 },
  { name: 'Direct Link', value: 300 },
];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

const AdvancedAnalyticsDashboard = () => {
    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-indigo-600" />
                    Advanced Analytics
                </h1>
                <p className="text-slate-500 mt-2">Deep dive into your promotion performance and ROI.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div><p className="text-sm text-slate-500">Total Views</p><h3 className="text-2xl font-bold mt-1">2,455</h3></div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Eye className="w-5 h-5" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div><p className="text-sm text-slate-500">Total Clicks</p><h3 className="text-2xl font-bold mt-1">1,203</h3></div>
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><MousePointerClick className="w-5 h-5" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div><p className="text-sm text-slate-500">Conversions</p><h3 className="text-2xl font-bold mt-1">302</h3></div>
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Users className="w-5 h-5" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div><p className="text-sm text-slate-500">Generated Revenue</p><h3 className="text-2xl font-bold mt-1">₹45k</h3></div>
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Engagement Over Time</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
                                <Line type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Traffic Sources</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdvancedAnalyticsDashboard;