import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = 'BPEq93Iymcq6MNkA0Q2s9h9v5j3O3Lq81q_U2dprxZiyO4411w3YQeaqfdkeQDIZc1xmm582dIEm9yO1-dJ0sGU';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push messaging is not supported.');
  }

  const registration = await navigator.serviceWorker.ready;
  
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    // Already subscribed
    return subscription;
  }
  
  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission for notifications was denied.');
  }

  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: userId,
      subscription: subscription,
    });

  if (error) {
    // If it fails to save, unsubscribe to avoid a broken state
    await subscription.unsubscribe();
    console.error('Failed to save push subscription:', error);
    throw new Error('Could not save push subscription to the server.');
  }

  return subscription;
}