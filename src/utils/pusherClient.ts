import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;
const activeSubscriptions = new Map<string, any>();

export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";

  if (!key) {
    return null;
  }

  if (!pusherClient) {
    pusherClient = new Pusher(key, {
      cluster,
    });
  }
  return pusherClient;
}

export function subscribeUserMessages(userId: string, onMessage: (data: any) => void) {
  if (!userId) return () => {};

  const client = getPusherClient();
  if (!client) return () => {};

  const channelName = `user-${userId}`;
  let channel = activeSubscriptions.get(channelName);

  if (!channel) {
    channel = client.subscribe(channelName);
    activeSubscriptions.set(channelName, channel);
  }

  channel.bind("new-message", onMessage);

  return () => {
    channel.unbind("new-message", onMessage);
  };
}

export function unsubscribeUserMessages(userId: string) {
  if (!userId) return;

  const client = getPusherClient();
  if (!client) return;

  const channelName = `user-${userId}`;
  if (activeSubscriptions.has(channelName)) {
    client.unsubscribe(channelName);
    activeSubscriptions.delete(channelName);
  }
}
