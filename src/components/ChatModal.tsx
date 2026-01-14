import { useState, useEffect, useRef } from 'react';
import { Send, User, X, MessageCircle, Plus, Users, Brain, Bitcoin, MessageSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { initSocket, onGlobalMessage, onGlobalHistory, sendGlobalMessage, disconnectSocket, joinGlobalChat, offGlobalMessage, offGlobalHistory, ChatMessage } from '../client/socket';

interface Message {
  id: string;
  userId: number;
  username: string;
  text: string;
  timestamp: number;
  photoUrl?: string;
  isMe: boolean;
}

interface ChatGroup {
  id: string;
  name: string;
  icon: any;
  color: string;
  onlineCount: number;
  messages: Message[];
}

const INITIAL_GROUPS: ChatGroup[] = [
  {
    id: 'global',
    name: 'Глобал Чат',
    icon: MessageSquare,
    color: 'text-blue-400',
    onlineCount: 1243,
    messages: [],
  },
  {
    id: 'smart',
    name: 'Ақылдылар Тобы',
    icon: Brain,
    color: 'text-purple-400',
    onlineCount: 456,
    messages: [],
  },
  {
    id: 'crypto',
    name: 'Крипто Мастерлер',
    icon: Bitcoin,
    color: 'text-yellow-400',
    onlineCount: 789,
    messages: [],
  },
];

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  const { user, theme } = useStore();
  const [groups, setGroups] = useState<ChatGroup[]>(INITIAL_GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [inputText, setInputText] = useState('');
  const [showAddChat, setShowAddChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isLight = theme === 'light';

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const messages = selectedGroup?.messages || [];

  useEffect(() => {
    if (isOpen && selectedGroupId === 'global') {
      const socket = initSocket();

      const handleMessage = (serverMessage: ChatMessage) => {
        const message: Message = {
          id: serverMessage.id,
          userId: serverMessage.userId || 0,
          username: serverMessage.sender,
          text: serverMessage.text,
          timestamp: new Date(serverMessage.timestamp).getTime(),
          photoUrl: serverMessage.photoUrl,
          isMe: serverMessage.userId === user.id,
        };

        setGroups(prev => prev.map(group =>
          group.id === 'global'
            ? { ...group, messages: [...group.messages, message] }
            : group
        ));
      };

      const handleHistory = (serverMessages: ChatMessage[]) => {
        const messages: Message[] = serverMessages.map(m => ({
          id: m.id,
          userId: m.userId || 0,
          username: m.sender,
          text: m.text,
          timestamp: new Date(m.timestamp).getTime(),
          photoUrl: m.photoUrl,
          isMe: m.userId === user.id,
        }));

        setGroups(prev => prev.map(group =>
          group.id === 'global'
            ? { ...group, messages }
            : group
        ));
      };

      joinGlobalChat(user.firstName || 'Қолданушы', user.id, user.photoUrl);

      onGlobalMessage(handleMessage);
      onGlobalHistory(handleHistory);

      return () => {
        offGlobalMessage(handleMessage);
        offGlobalHistory(handleHistory);
      };
    }
  }, [isOpen, selectedGroupId, user.id, user.firstName, user.photoUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedGroupId]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedGroup) return;

    if (selectedGroupId === 'global') {
      sendGlobalMessage(inputText.trim(), user.firstName || 'Қолданушы', user.id, user.photoUrl);
    } else {
      const newMessage: Message = {
        id: Date.now().toString(),
        userId: user.id,
        username: user.firstName || 'Қолданушы',
        text: inputText.trim(),
        timestamp: Date.now(),
        photoUrl: user.photoUrl,
        isMe: true,
      };

      setGroups(prev => prev.map(group => 
        group.id === selectedGroupId 
          ? { ...group, messages: [...group.messages, newMessage] }
          : group
      ));
    }

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleAddChat = () => {
    if (!newChatName.trim()) return;
    
    const newGroup: ChatGroup = {
      id: Date.now().toString(),
      name: newChatName.trim(),
      icon: Users,
      color: 'text-green-400',
      onlineCount: 1,
      messages: [
        { 
          id: '1', 
          userId: 999, 
          username: 'System', 
          text: `"${newChatName.trim()}" тобы жасалды! 🎉`, 
          timestamp: Date.now(), 
          isMe: false 
        }
      ],
    };

    setGroups(prev => [...prev, newGroup]);
    setNewChatName('');
    setShowAddChat(false);
  };

  if (!isOpen) return null;

  const SelectedIcon = selectedGroup?.icon || MessageCircle;

  return (
    <div className="fixed inset-0 z-[50]">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {showAddChat ? (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddChat(false)}
          />
          <div className={clsx(
            "relative w-full max-w-sm p-6 rounded-2xl shadow-2xl",
            isLight ? "bg-white" : "bg-gray-900 border border-white/10"
          )}>
            <h2 className={clsx("text-xl font-bold mb-4", isLight ? "text-gray-900" : "text-white")}>Жаңа чат</h2>
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="Чат аты..."
              className={clsx(
                "w-full rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 border",
                isLight 
                  ? "bg-gray-100 text-gray-900 border-gray-200 placeholder-gray-400 focus:ring-[#f14635]/50" 
                  : "bg-gray-800 text-white border-white/10 placeholder-gray-500 focus:ring-primary/50"
              )}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddChat(false)}
                className={clsx(
                  "flex-1 py-3 rounded-lg font-medium transition-colors",
                  isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-800 text-white hover:bg-gray-700"
                )}
              >
                Бас тарту
              </button>
              <button
                onClick={handleAddChat}
                disabled={!newChatName.trim()}
                className={clsx(
                  "flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  isLight ? "bg-[#f14635] text-white hover:bg-[#d93a2b]" : "bg-primary text-black hover:bg-yellow-400"
                )}
              >
                Қосу
              </button>
            </div>
          </div>
        </div>
      ) : selectedGroup ? (
        <div className={clsx(
          "absolute right-0 top-0 bottom-0 w-full max-w-md flex flex-col shadow-2xl transition-transform duration-300",
          isLight ? "bg-white" : "bg-black border-l border-white/10"
        )}>
          <header className={clsx(
            "p-4 flex items-center justify-between gap-3 border-b",
            isLight ? "bg-white border-gray-200" : "bg-black/80 border-white/10"
          )}>
            <button
              onClick={() => setSelectedGroupId('')}
              className={clsx("p-2 rounded-full", isLight ? "hover:bg-gray-100" : "hover:bg-white/10")}
            >
              <X size={20} className={isLight ? "text-gray-600" : "text-white"} />
            </button>
            <div className="flex items-center gap-3">
              <div className={clsx("p-2 rounded-full", isLight ? "bg-gray-100" : "bg-white/10")}>
                <SelectedIcon size={20} className={selectedGroup.color} />
              </div>
              <div>
                <h1 className={clsx("text-lg font-bold", isLight ? "text-gray-900" : "text-white")}>{selectedGroup.name}</h1>
                <p className="text-xs text-gray-400">{selectedGroup.onlineCount} онлайн</p>
              </div>
            </div>
            <div className="w-8" />
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={clsx(
                  "flex gap-3 max-w-[85%]",
                  msg.isMe ? "ml-auto flex-row-reverse" : ""
                )}
              >
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

          <div className={clsx(
            "p-4 border-t",
            isLight ? "bg-white border-gray-200" : "bg-black border-white/10"
          )}>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Хабарлама жазыңыз..."
                className={clsx(
                  "flex-1 rounded-full px-4 py-3 focus:outline-none focus:ring-2 border text-sm",
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
                <Send size={18} className={inputText.trim() ? "ml-1" : ""} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={clsx(
          "absolute right-0 top-0 bottom-0 w-full max-w-md flex flex-col shadow-2xl transition-transform duration-300",
          isLight ? "bg-white" : "bg-black border-l border-white/10"
        )}>
          <header className={clsx(
            "p-4 flex items-center justify-between gap-3 border-b",
            isLight ? "bg-white border-gray-200" : "bg-black/80 border-white/10"
          )}>
            <div className="flex items-center gap-3">
              <div className={clsx("p-2 rounded-full", isLight ? "bg-[#f14635]/10 text-[#f14635]" : "bg-primary/10 text-primary")}>
                <MessageCircle size={20} />
              </div>
              <div>
                <h1 className={clsx("text-lg font-bold", isLight ? "text-gray-900" : "text-white")}>Чаттар</h1>
                <p className="text-xs text-gray-400">{groups.length} чат</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={clsx("p-2 rounded-full", isLight ? "hover:bg-gray-100" : "hover:bg-white/10")}
            >
              <X size={20} className={isLight ? "text-gray-600" : "text-white"} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            {groups.map((group) => {
              const GroupIcon = group.icon;
              const lastMessage = group.messages[group.messages.length - 1];

              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={clsx(
                    "w-full p-4 flex items-center gap-3 border-b transition-colors",
                    isLight ? "hover:bg-gray-50 border-gray-100" : "hover:bg-white/5 border-white/5"
                  )}
                >
                  <div className={clsx("p-2 rounded-full", isLight ? "bg-gray-100" : "bg-white/10")}>
                    <GroupIcon size={20} className={group.color} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className={clsx("font-medium text-sm", isLight ? "text-gray-900" : "text-white")}>{group.name}</h3>
                      <span className="text-xs text-gray-400">{group.onlineCount}</span>
                    </div>
                    <p className={clsx("text-xs truncate", isLight ? "text-gray-500" : "text-gray-400")}>
                      {lastMessage?.text}
                    </p>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => setShowAddChat(true)}
              className={clsx(
                "w-full p-4 flex items-center gap-3 border-b transition-colors",
                isLight ? "hover:bg-gray-50 border-gray-100" : "hover:bg-white/5 border-white/5"
              )}
            >
              <div className={clsx("p-2 rounded-full", isLight ? "bg-gray-100" : "bg-white/10")}>
                <Plus size={20} className="text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className={clsx("font-medium text-sm", isLight ? "text-gray-900" : "text-white")}>Жаңа чат қосу</h3>
                <p className="text-xs text-gray-400">Топ немесе чат жасаңыз</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatModal;
