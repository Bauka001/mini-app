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

export const initSocket = () => null;

export const getSocket = () => null;

export const joinGlobalChat = (userName: string, userId: number, photoUrl?: string) => {
  void userName;
  void userId;
  void photoUrl;
};

export const sendGlobalMessage = (message: string, userName: string, userId: number, photoUrl?: string) => {
  void message;
  void userName;
  void userId;
  void photoUrl;
};

export const disconnectSocket = () => {};

export const onGlobalMessage = (callback: (message: ChatMessage) => void) => {
  void callback;
};

export const onGlobalHistory = (callback: (messages: ChatMessage[]) => void) => {
  void callback;
};

export const offGlobalMessage = (callback: (message: ChatMessage) => void) => {
  void callback;
};

export const offGlobalHistory = (callback: (messages: ChatMessage[]) => void) => {
  void callback;
};
