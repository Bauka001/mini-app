import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, User, MessageCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';

interface Message {
  id: string;
  userId: number;
  username: string;
  text: string;
  timestamp: number;
  photoUrl?: string;
  isMe: boolean;
}

// Mock messages for "Global Channel" feel
const MOCK_MESSAGES: Message[] = [
  { id: '1', userId: 999, username: 'FocusBot', text: 'Welcome to the global community chat! 🌍', timestamp: Date.now() - 100000, isMe: false },
  { id: '2', userId: 101, username: 'Alice', text: 'Anyone want to beat my Schulte record? 15s! 🚀', timestamp: Date.now() - 50000, isMe: false },
  { id: '3', userId: 102, username: 'Bob', text: 'Just bought the Neon skin, looks amazing!', timestamp: Date.now() - 20000, isMe: false },
];

const CommunityPage = () => {
  const { t } = useTranslation();
  const { user, theme } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isLight = theme === 'light';

  // Load initial messages (simulate fetching from server)
  useEffect(() => {
    // In a real app, fetch from backend
    // Here we merge mock messages with any local session messages if we wanted persistence
    setMessages(MOCK_MESSAGES);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.firstName, // Or username if available
      text: inputText.trim(),
      timestamp: Date.now(),
      photoUrl: user.photoUrl,
      isMe: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Simulate a reply after a while to make it feel alive
    if (Math.random() > 0.7) {
      setTimeout(() => {
        const reply: Message = {
          id: (Date.now() + 1).toString(),
          userId: 888,
          username: 'Gamer_Pro',
          text: 'Nice one! 👍',
          timestamp: Date.now(),
          isMe: false,
        };
        setMessages(prev => [...prev, reply]);
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className={clsx("h-full flex flex-col pb-24", isLight ? "bg-[#f2f3f5]" : "bg-black")}>
      {/* Header */}
      <header className={clsx(
        "p-4 pt-8 backdrop-blur-md border-b sticky top-0 z-10 flex items-center gap-3",
        isLight ? "bg-white/80 border-gray-200" : "bg-secondary/80 border-white/5"
      )}>
        <div className={clsx("p-2 rounded-full", isLight ? "bg-[#f14635]/10 text-[#f14635]" : "bg-primary/10 text-primary")}>
          <MessageCircle size={24} />
        </div>
        <div>
          <h1 className={clsx("text-xl font-bold", isLight ? "text-gray-900" : "text-white")}>{t('community_chat', 'Community Chat')}</h1>
          <p className={clsx("text-xs", isLight ? "text-gray-500" : "text-gray-400")}>{t('online_users', '1,243 online')}</p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={clsx(
              "flex gap-3 max-w-[85%]",
              msg.isMe ? "ml-auto flex-row-reverse" : ""
            )}
          >
            {/* Avatar */}
            <div className={clsx(
              "flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border",
              isLight ? "bg-gray-200 border-gray-300" : "bg-gray-700 border-white/10"
            )}>
              {msg.photoUrl ? (
                <img src={msg.photoUrl} alt={msg.username} className="w-full h-full object-cover" />
              ) : (
                <div className={clsx("w-full h-full flex items-center justify-center", isLight ? "text-gray-500" : "text-gray-400")}>
                  <User size={16} />
                </div>
              )}
            </div>

            {/* Bubble */}
            <div className={clsx(
              "flex flex-col",
              msg.isMe ? "items-end" : "items-start"
            )}>
              <span className={clsx("text-[10px] mb-1 px-1", isLight ? "text-gray-500" : "text-gray-500")}>
                {msg.username}
              </span>
              <div className={clsx(
                "px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm",
                msg.isMe 
                  ? (isLight ? "bg-[#f14635] text-white rounded-tr-none" : "bg-primary text-black rounded-tr-none")
                  : (isLight ? "bg-white border border-gray-200 text-gray-800 rounded-tl-none" : "bg-secondary border border-white/10 text-white rounded-tl-none")
              )}>
                {msg.text}
              </div>
              <span className={clsx("text-[9px] mt-1 px-1", isLight ? "text-gray-400" : "text-gray-600")}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={clsx(
        "p-4 backdrop-blur-md border-t fixed bottom-[80px] left-0 right-0 w-full",
        isLight ? "bg-white/80 border-gray-200" : "bg-black/80 border-white/10"
      )}>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('type_message', 'Type a message...')}
            className={clsx(
              "flex-1 rounded-full px-4 py-3 focus:outline-none focus:ring-2 border",
              isLight 
                ? "bg-gray-100 text-gray-900 border-gray-200 placeholder-gray-400 focus:ring-[#f14635]/50" 
                : "bg-secondary text-white border-white/5 placeholder-gray-500 focus:ring-primary/50"
            )}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg",
              isLight ? "bg-[#f14635] text-white shadow-red-500/20" : "bg-primary text-black shadow-primary/20"
            )}
          >
            <Send size={20} className={inputText.trim() ? "ml-1" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
