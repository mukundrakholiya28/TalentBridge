const Pusher = require("pusher");

let pusherInstance = null;

function getPusherServer() {
    if (!pusherInstance) {
        const appId = process.env.PUSHER_APP_ID;
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY;
        const secret = process.env.PUSHER_SECRET;
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || "mt1";

        if (appId && key && secret) {
            try {
                pusherInstance = new Pusher({
                    appId,
                    key,
                    secret,
                    cluster,
                    useTLS: true
                });
            } catch (err) {
                console.warn("⚠️ Failed to initialize Pusher server instance:", err.message);
            }
        }
    }
    return pusherInstance;
}

async function triggerUserEvent(userId, eventName, payload) {
    if (!userId) return false;
    const pusher = getPusherServer();
    if (!pusher) return false;

    try {
        await pusher.trigger(`user-${userId}`, eventName, payload);
        return true;
    } catch (err) {
        console.error(`Pusher trigger error for user-${userId}:`, err.message);
        return false;
    }
}

module.exports = {
    getPusherServer,
    triggerUserEvent
};
