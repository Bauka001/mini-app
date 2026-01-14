import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  userId?: number;
  sender: string;
  text: string;
  timestamp: string;
  photoUrl?: string;
  isBot?: boolean;
}

export interface ChatGroup {
  id: string;
  name: string;
  icon: any;
  color: string;
  onlineCount: number;
  messages: ChatMessage[];
}

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const joinGlobalChat = (userName: string, userId: number, photoUrl?: string) => {
  const s = getSocket();
  if (s) {
    s.emit('join_global_chat', { userName, userId, photoUrl });
  }
};

export const sendGlobalMessage = (message: string, userName: string, userId: number, photoUrl?: string) => {
  const s = getSocket();
  if (s) {
    s.emit('global_message', { message, userName, userId, photoUrl });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onGlobalMessage = (callback: (message: ChatMessage) => void) => {
  const s = getSocket();
  if (s) {
    s.on('new_global_message', callback);
  }
};

export const onGlobalHistory = (callback: (messages: ChatMessage[]) => void) => {
  const s = getSocket();
  if (s) {
    s.on('global_history', callback);
  }
};

export const offGlobalMessage = (callback: (message: ChatMessage) => void) => {
  const s = getSocket();
  if (s) {
    s.off('new_global_message', callback);
  }
};

export const offGlobalHistory = (callback: (messages: ChatMessage[]) => void) => {
  const s = getSocket();
  if (s) {
    s.off('global_history', callback);
  }
};
