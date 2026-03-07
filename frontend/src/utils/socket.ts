import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './authStorage';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, { autoConnect: false });
    }
    return socket;
}

export function connectSocket(): Socket {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
        // Join the user's room using their ID from the JWT
        try {
            const token = getAuthToken();
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.id) {
                    s.emit('join', payload.id);
                }
            }
        } catch { /* ignore */ }
    }
    return s;
}

export function disconnectSocket() {
    if (socket?.connected) {
        socket.disconnect();
    }
}
