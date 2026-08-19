import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Server, Bell, Key } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { VAPID_KEY } from '@/lib/firebase';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const StatusBadge = ({ status, text }) => {
    const colors = {
        success: 'bg-green-100 text-green-800 border-green-200',
        error: 'bg-red-100 text-red-800 border-red-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        neutral: 'bg-slate-100 text-slate-800 border-slate-200'
    };
    const icons = {
        success: <CheckCircle2 className="w-4 h-4 mr-1" />,
        error: <XCircle className="w-4 h-4 mr-1" />,
        warning: <AlertTriangle className="w-4 h-4 mr-1" />,
        neutral: <div className="w-4 h-4 mr-1" />
    };

    return (
        <Badge variant="outline" className={`${colors[status]} flex items-center px-3 py-1`}>
            {icons[status]} {text}
        </Badge>
    );
};

const SystemHealth = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [health, setHealth] = useState({
        firebaseConfig: { status: 'neutral', message: 'Checking...' },
        serviceWorker: { status: 'neutral', message: 'Checking...' },
        vapidKey: { status: 'neutral', message: 'Checking...' },
        edgeFunction: { status: 'neutral', message: 'Checking...' },
        dbConnection: { status: 'neutral', message: 'Checking...' }
    });

    const checkHealth = async () => {
        setLoading(true);
        const newHealth = { ...health };

        // 1. Check Firebase Config (Frontend)
        const isFirebaseConfigured = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_API_KEY_HERE';
        newHealth.firebaseConfig = isFirebaseConfigured 
            ? { status: 'success', message: 'Environment variables detected' }
            : { status: 'error', message: 'Missing VITE_FIREBASE_* env vars' };

        // 2. Check VAPID Key
        const isVapidSet = VAPID_KEY && VAPID_KEY !== 'YOUR_VAPID_KEY_HERE';
        newHealth.vapidKey = isVapidSet
            ? { status: 'success', message: 'Key present' }
            : { status: 'error', message: 'VAPID Key is placeholder' };

        // 3. Check Service Worker Registration
        if ('serviceWorker' in navigator) {
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                const fcmSw = regs.find(r => r.active && r.active.scriptURL.includes('firebase-messaging-sw.js'));
                newHealth.serviceWorker = fcmSw
                    ? { status: 'success', message: 'Active' }
                    : { status: 'warning', message: 'Not found (may load on permission grant)' };
            } catch (e) {
                newHealth.serviceWorker = { status: 'error', message: e.message };
            }
        } else {
            newHealth.serviceWorker = { status: 'error', message: 'Not supported' };
        }

        // 4. Check DB Connection (Notification Tokens table)
        try {
            const { error } = await supabase.from('notification_tokens').select('count', { count: 'exact', head: true });
            if (error) throw error;
            newHealth.dbConnection = { status: 'success', message: 'Table accessible' };
        } catch (e) {
            newHealth.dbConnection = { status: 'error', message: e.message };
        }

        // 5. Check Edge Function
        try {
            const start = Date.now();
            const { data, error } = await supabase.functions.invoke('send-fcm-notification', {
                body: { user_id: user?.id, title: 'Ping', body: 'Ping', dry_run: true } 
            });
            const duration = Date.now() - start;

            if (error) {
                newHealth.edgeFunction = { status: 'error', message: `Failed: ${error.message}` };
            } else {
                 // Even if it returns error logic inside (like missing service account), it's reachable
                 if (data?.error) {
                     newHealth.edgeFunction = { status: 'warning', message: `Reachable but error: ${data.error}` };
                 } else {
                     newHealth.edgeFunction = { status: 'success', message: `Healthy (${duration}ms)` };
                 }
            }
        } catch (e) {
            newHealth.edgeFunction = { status: 'error', message: e.message };
        }

        setHealth(newHealth);
        setLoading(false);
    };

    useEffect(() => {
        checkHealth();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">System Diagnostics</h2>
                <Button onClick={checkHealth} disabled={loading} variant="outline">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Run Checks
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Frontend Config */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Key className="w-4 h-4" /> Firebase Config
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Env Variables</span>
                            <StatusBadge {...health.firebaseConfig} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">VAPID Key</span>
                            <StatusBadge {...health.vapidKey} />
                        </div>
                        {health.firebaseConfig.status === 'error' && (
                            <p className="text-xs text-red-500 mt-2">
                                Please create .env file with VITE_FIREBASE_* variables.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Service Worker */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Bell className="w-4 h-4" /> Web Push
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Service Worker</span>
                            <StatusBadge {...health.serviceWorker} />
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Permission</span>
                            <Badge variant="outline">{Notification.permission}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Backend & Edge */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Server className="w-4 h-4" /> Backend Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">DB Connection</span>
                            <StatusBadge {...health.dbConnection} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Edge Function</span>
                            <StatusBadge {...health.edgeFunction} />
                        </div>
                        {health.edgeFunction.status === 'warning' && (
                            <p className="text-xs text-amber-600 mt-2 truncate" title={health.edgeFunction.message}>
                                {health.edgeFunction.message}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Checklist</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-2">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Ensure <strong>FIREBASE_SERVICE_ACCOUNT</strong> secret is set in Supabase Edge Functions.</li>
                        <li>Ensure <strong>.env</strong> file exists with correct Firebase keys for the frontend.</li>
                        <li>Check if <strong>notification_tokens</strong> table has RLS enabled (it should).</li>
                    </ul>
                </AlertDescription>
            </Alert>
        </div>
    );
};

export default SystemHealth;