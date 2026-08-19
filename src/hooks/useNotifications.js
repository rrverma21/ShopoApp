/**
 * FIXED: Auto-reload on tab switch removed
 * Removed: Removed aggressive page refresh logic on notification events
 * Reason: Auto-reload disrupts user experience.
 * Test: Receive notification while on another tab, return to tab: toast shows, no page reload.
 * New behavior: Toast notification only.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { requestForToken, onMessageListener } from '@/lib/firebase';
import { useToast } from '@/components/ui/use-toast';

export const useNotifications = (user) => {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
      setError("Notifications not supported in this browser");
    }
  }, []);

  const saveTokenToDatabase = async (token) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notification_tokens')
        .upsert({ 
          user_id: user.id, 
          token: token,
          platform: 'web',
          is_active: true,
          last_used_at: new Date().toISOString()
        }, { onConflict: 'user_id, token' });

      if (error) throw error;
      console.log('FCM Token saved to DB');
    } catch (err) {
      console.error('Error saving FCM token:', err);
      // We don't set global error here to avoid confusing the user if the token is valid but DB save fails silently (e.g. network)
    }
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers are not supported in this browser.');
    }

    try {
        // Explicitly register the service worker from the public folder
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
        });
        
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Wait for the service worker to be active (sometimes needed for initial load)
        if (registration.installing) {
            console.log('Service Worker installing');
        } else if (registration.waiting) {
            console.log('Service Worker installed');
        } else if (registration.active) {
            console.log('Service Worker active');
        }

        return registration;
    } catch (err) {
        console.error('Service Worker registration failed:', err);
        throw new Error(`Service Worker Error: ${err.message}`);
    }
  };

  const enableNotifications = async () => {
    setError(null);
    
    if (notificationPermission === 'denied') {
        toast({ 
            title: "Permission Denied", 
            description: "Notifications are blocked. Please enable them in your browser settings.",
            variant: "destructive"
        });
        return false;
    }

    try {
        // 1. Check Browser Support
        if (!('Notification' in window)) {
            throw new Error("This browser does not support desktop notification");
        }

        // 2. Register Service Worker
        const registration = await registerServiceWorker();

        // 3. Request Permission & Token
        // We pass the registration to firebase to ensure it uses the correct SW
        const token = await requestForToken(registration);
        
        if (token) {
            setFcmToken(token);
            setNotificationPermission('granted');
            await saveTokenToDatabase(token);
            toast({ title: "Notifications Enabled", description: "You will now receive updates on this device." });
            return true;
        } else {
            // Permission might have been denied during the request
            setNotificationPermission(Notification.permission);
            if (Notification.permission === 'denied') {
                toast({ 
                    title: "Permission Denied", 
                    description: "You blocked notifications. Please reset permissions for this site.",
                    variant: "destructive"
                });
            }
            return false;
        }
    } catch (err) {
        console.error("Error enabling notifications:", err);
        setError(err.message || "Failed to enable notifications");
        toast({ 
            variant: "destructive", 
            title: "Error", 
            description: err.message || "Could not enable notifications." 
        });
        return false;
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onMessageListener()
      .then((payload) => {
        // Foreground notification received
        console.log("Foreground message received:", payload);
        
        // Show a local toast/notification for foreground messages
        // Firebase handles background messages via SW automatically
        toast({
          title: payload.notification?.title || "New Notification",
          description: payload.notification?.body || "You have a new message",
        });
      })
      .catch((err) => console.log('Message listener setup failed: ', err));

    return () => {
       // cleanup if needed (onMessage returns an unsubscribe function but we wrapped it in promise)
    };
  }, [toast]);

  // Auto-check on load if permission is already granted
  useEffect(() => {
    const init = async () => {
        if (user && Notification.permission === 'granted') {
           try {
               const registration = await registerServiceWorker();
               const token = await requestForToken(registration);
               if(token) {
                   setFcmToken(token);
                   saveTokenToDatabase(token);
               }
           } catch (e) {
               console.error("Auto-init notification failed:", e);
           }
        }
    };
    init();
  }, [user]);

  return {
    notificationPermission,
    enableNotifications,
    fcmToken,
    error
  };
};