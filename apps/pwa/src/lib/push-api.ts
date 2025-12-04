import { apiClient } from './api-client';

export interface PushStatus {
  isConfigured: boolean;
  subscriptionCount: number;
}

// API Functions
export async function getVapidPublicKey(): Promise<{ publicKey: string | null }> {
  return apiClient.get('/push/vapid-public-key');
}

export async function subscribeToPush(subscription: {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}): Promise<{ success: boolean; message: string }> {
  return apiClient.post('/push/subscribe', subscription);
}

export async function unsubscribeFromPush(
  endpoint: string
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete('/push/unsubscribe', { endpoint });
}

export async function unsubscribeAll(): Promise<{ success: boolean; message: string }> {
  return apiClient.delete('/push/unsubscribe-all');
}

export async function getPushStatus(): Promise<PushStatus> {
  return apiClient.get('/push/status');
}

// Helper function to register push notifications
export async function registerPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    // Get VAPID public key from server
    const { publicKey } = await getVapidPublicKey();
    if (!publicKey) {
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check current subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    // Send subscription to server
    await subscribeToPush({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return false;
  }
}

// Helper function to unregister push notifications
export async function unregisterPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await unsubscribeFromPush(subscription.endpoint);
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Failed to unregister push notifications:', error);
    return false;
  }
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
