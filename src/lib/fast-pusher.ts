import Pusher from 'pusher-js';
import { getCachedData, setCachedData, debounce } from './performance';

let pusherInstance: Pusher | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

interface FastPusherOptions {
  enableLocalCache?: boolean;
  cacheTime?: number;
  onConnectionError?: (error: any) => void;
}

/**
 * Get or create optimized Pusher instance with reconnection logic
 */
export function getFastPusher(options: FastPusherOptions = {}): Pusher {
  const {
    enableLocalCache = true,
    cacheTime = 60 * 1000, // 1 minute
    onConnectionError
  } = options;
  
  if (pusherInstance) return pusherInstance;
  
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2';
  
  if (!pusherKey) {
    throw new Error('NEXT_PUBLIC_PUSHER_KEY is not defined');
  }
  
  pusherInstance = new Pusher(pusherKey, {
    cluster: pusherCluster,
    enabledTransports: ['ws', 'wss'], // WebSocket only for speed
    forceTLS: true,
    
    // Connection timeouts
    activityTimeout: 30000,
    pongTimeout: 10000,
    
    // Reconnection strategy
    maxReconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    maxReconnectGapInSeconds: 30,
  });
  
  // Connection state monitoring
  pusherInstance.connection.bind('connected', () => {
    console.log('[FastPusher] Connected');
    connectionAttempts = 0;
  });
  
  pusherInstance.connection.bind('disconnected', () => {
    console.log('[FastPusher] Disconnected');
  });
  
  pusherInstance.connection.bind('error', (error: any) => {
    console.error('[FastPusher] Connection error:', error);
    connectionAttempts++;
    
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[FastPusher] Max reconnection attempts reached');
      onConnectionError?.(error);
    }
  });
  
  return pusherInstance;
}

/**
 * Subscribe to channel with local storage caching
 */
export function subscribeFast(
  channelName: string,
  eventName: string,
  callback: (data: any) => void,
  options: FastPusherOptions = {}
) {
  const { enableLocalCache = true, cacheTime = 60 * 1000 } = options;
  const cacheKey = `pusher_${channelName}_${eventName}`;
  
  // Get cached data immediately
  if (enableLocalCache) {
    const cached = getCachedData<any>(cacheKey);
    if (cached) {
      callback(cached);
    }
  }
  
  const pusher = getFastPusher(options);
  const channel = pusher.subscribe(channelName);
  
  // Debounced callback to prevent rapid updates
  const debouncedCallback = debounce((data: any) => {
    callback(data);
    
    // Cache the data
    if (enableLocalCache) {
      setCachedData(cacheKey, data, cacheTime);
    }
  }, 100);
  
  channel.bind(eventName, debouncedCallback);
  
  // Return cleanup function
  return () => {
    channel.unbind(eventName, debouncedCallback);
    pusher.unsubscribe(channelName);
  };
}

/**
 * Disconnect Pusher
 */
export function disconnectPusher() {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}

/**
 * Trigger event with optimistic local update
 */
export function triggerOptimistic(
  channelName: string,
  eventName: string,
  data: any,
  callback: (data: any) => void
) {
  // Immediate local update
  callback(data);
  
  // Cache for other subscribers
  const cacheKey = `pusher_${channelName}_${eventName}`;
  setCachedData(cacheKey, data, 60 * 1000);
  
  // Actual event will come from server
}

/**
 * Get connection state
 */
export function getConnectionState(): string {
  return pusherInstance?.connection.state || 'disconnected';
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return getConnectionState() === 'connected';
}
