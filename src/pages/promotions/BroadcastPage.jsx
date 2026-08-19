import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { MessageSquare, Send, Clock, Users, RefreshCw } from 'lucide-react';
import { createBroadcast, getBroadcasts } from '@/services/promotions/broadcastService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const BroadcastPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [broadcasts, setBroadcasts] = useState([]);
    
    const [formData, setFormData] = useState({
        message: '',
        channel: 'whatsapp',
        scheduleType: 'now',
        scheduledTime: ''
    });

    useEffect(() => {
        if (user) fetchBroadcasts();
    }, [user]);

    const fetchBroadcasts = async () => {
        try {
            const data = await getBroadcasts(user.id);
            setBroadcasts(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSend = async () => {
        setLoading(true);
        try {
            await createBroadcast({
                shop_id: user.id,
                message: formData.message,
                channel: formData.channel,
                status: formData.scheduleType === 'now' ? 'sent' : 'scheduled',
                scheduled_time: formData.scheduleType === 'now' ? new Date().toISOString() : new Date(formData.scheduledTime).toISOString()
            });
            toast({ title: 'Success', description: 'Broadcast created successfully' });
            setFormData({ message: '', channel: 'whatsapp', scheduleType: 'now', scheduledTime: '' });
            fetchBroadcasts();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                    Broadcast Center
                </h1>
                <p className="text-slate-500 mt-2">Send bulk promotions via WhatsApp or SMS to your customers.</p>
            </div>

            <Tabs defaultValue="new" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="new">New Broadcast</TabsTrigger>
                    <TabsTrigger value="history">History & Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="new">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Compose Message</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Channel</Label>
                                    <Select value={formData.channel} onValueChange={(v) => setFormData({...formData, channel: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                            <SelectItem value="sms">SMS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Message Template</Label>
                                    <Textarea 
                                        className="h-32 mt-2" 
                                        placeholder="Hi {{customer_name}}, we have a special offer for you!"
                                        value={formData.message}
                                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Use {'{{customer_name}}'} to personalize.</p>
                                </div>
                                
                                <div>
                                    <Label>Schedule</Label>
                                    <Select value={formData.scheduleType} onValueChange={(v) => setFormData({...formData, scheduleType: v})}>
                                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="now">Send Immediately</SelectItem>
                                            <SelectItem value="later">Schedule for Later</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.scheduleType === 'later' && (
                                    <div>
                                        <Label>Date & Time</Label>
                                        <Input 
                                            type="datetime-local" 
                                            className="mt-2"
                                            value={formData.scheduledTime}
                                            onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                                        />
                                    </div>
                                )}

                                <Button onClick={handleSend} disabled={loading || !formData.message} className="w-full">
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                    {formData.scheduleType === 'now' ? 'Send Broadcast' : 'Schedule Broadcast'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Select Audience</CardTitle>
                                <CardDescription>Choose who will receive this message</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg text-center bg-slate-50">
                                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                    <h3 className="font-semibold text-slate-700">All Active Customers</h3>
                                    <p className="text-sm text-slate-500 mt-1">Broadcast will be sent to all customers in your POS database who have opted in.</p>
                                    <Button variant="outline" className="mt-4" onClick={() => toast({description: "🚧 Segmentation feature coming soon!"})}>Select Specific Segment</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Broadcast History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {broadcasts.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No broadcasts found.</p>
                            ) : (
                                <div className="space-y-4">
                                    {broadcasts.map(b => (
                                        <div key={b.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50">
                                            <div>
                                                <p className="font-medium">{b.message.substring(0, 50)}...</p>
                                                <div className="flex gap-2 text-sm text-slate-500 mt-1">
                                                    <span className="capitalize">{b.channel}</span> • 
                                                    <span>{new Date(b.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default BroadcastPage;