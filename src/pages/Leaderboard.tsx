import { Trophy, Crown, Medal, MessageCircle, Send } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState, useRef, useEffect } from 'react';

// Mock Leaderboard Data
const MOCK_LEADERBOARD = [
  { id: 101, name: 'Alice', xp: 15400, level: 15, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
  { id: 102, name: 'Bob', xp: 12300, level: 12, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
  { id: 103, name: 'Charlie', xp: 11200, level: 11, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie' },
  { id: 104, name: 'David', xp: 9500, level: 9, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
  { id: 105, name: 'Eve', xp: 8700, level: 8, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve' },
];

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  isBot?: boolean;
}

const MOCK_GLOBAL_CHAT: ChatMessage[] = [
  { id: 1, sender: 'System', text: 'Welcome to Global Leaderboard Chat!', timestamp: new Date().toISOString(), isBot: true },
  { id: 2, sender: 'Guest_123', text: 'How do I get more XP?', timestamp: new Date(Date.now() - 60000).toISOString() },
  { id: 3, sender: 'Helper_Bot', text: 'Play games to earn XP and level up!', timestamp: new Date(Date.now() - 30000).toISOString(), isBot: true },
];

const LeaderboardPage = () => {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'chat'>('leaderboard');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_GLOBAL_CHAT);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeTab]);

  const userInTop5 = MOCK_LEADERBOARD.some(u => u.id === user.id);
  const displayList = [...MOCK_LEADERBOARD];

  displayList.sort((a, b) => b.xp - a.xp);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={24} className="text-yellow-400 fill-yellow-400" />;
      case 1: return <Medal size={24} className="text-gray-300 fill-gray-300" />;
      case 2: return <Medal size={24} className="text-orange-400 fill-orange-400" />;
      default: return <span className="text-lg font-bold text-gray-500 w-6 text-center">{index + 1}</span>;
    }
  };

  const sendChatMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: user.firstName,
      text: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');

    // Simulate bot response
    setTimeout(() => {
      const botResponses = [
        "Keep grinding!",
        "Level up to unlock more games!",
        "Check out the Guilds section too!",
        "Great job on your progress!"
      ];
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];

      setChatMessages(prev => [...prev, {
        id: Date.now(),
        sender: "Bot",
        text: randomResponse,
        timestamp: new Date().toISOString(),
        isBot: true
      }]);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-5">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Trophy className="text-primary" size={32} />
          Leaderboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">Top players this week</p>
      </header>

      {/* Tabs */}
      <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/5">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide bg-primary text-black shadow-lg shadow-primary/20"
        >
          <Trophy size={16} />
          Ranking
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-gray-400 hover:text-white hover:bg-white/5"
        >
          <MessageCircle size={16} />
          Chat
        </button>
      </div>

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top 3 Podium */}
          <div className="flex justify-center items-end gap-4 mb-10 mt-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 overflow-hidden mb-2 relative">
                 <img src={displayList[1].avatar} alt={displayList[1].name} className="w-full h-full" />
                 <div className="absolute bottom-0 w-full bg-gray-300 text-black text-[10px] font-bold text-center">2</div>
              </div>
              <span className="font-bold text-sm">{displayList[1].name}</span>
              <span className="text-xs text-gray-400">{displayList[1].xp} XP</span>
              <div className="w-12 h-24 bg-gray-300/20 rounded-t-lg mt-2 border-t border-gray-300/50" />
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="relative">
                 <Crown size={32} className="text-yellow-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" />
                 <div className="w-20 h-20 rounded-full border-4 border-yellow-400 overflow-hidden mb-2 relative shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                    <img src={displayList[0].avatar} alt={displayList[0].name} className="w-full h-full" />
                 </div>
              </div>
              <span className="font-bold text-lg text-yellow-400">{displayList[0].name}</span>
              <span className="text-xs text-gray-400">{displayList[0].xp} XP</span>
              <div className="w-16 h-32 bg-yellow-400/20 rounded-t-lg mt-2 border-t border-yellow-400/50 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/10 to-transparent" />
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-orange-400 overflow-hidden mb-2 relative">
                 <img src={displayList[2].avatar} alt={displayList[2].name} className="w-full h-full" />
                 <div className="absolute bottom-0 w-full bg-orange-400 text-black text-[10px] font-bold text-center">3</div>
              </div>
              <span className="font-bold text-sm">{displayList[2].name}</span>
              <span className="text-xs text-gray-400">{displayList[2].xp} XP</span>
              <div className="w-12 h-16 bg-orange-400/20 rounded-t-lg mt-2 border-t border-orange-400/50" />
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {displayList.slice(3).map((player, index) => (
              <div key={player.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  {getRankIcon(index + 3)}
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                    <img src={player.avatar} alt={player.name} className="w-full h-full" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{player.name}</div>
                    <div className="text-xs text-gray-400">Lvl {player.level}</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-primary">{player.xp} XP</div>
              </div>
            ))}
          </div>

          {/* Current User Fixed at Bottom */}
          {!userInTop5 && (
            <div className="sticky bottom-24 mt-6">
              <div className="bg-primary/20 backdrop-blur-xl p-4 rounded-2xl flex items-center justify-between border border-primary/50 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-white w-6 text-center">?</span>
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border-2 border-primary">
                    <img src={user.photoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="Me" className="w-full h-full" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{user.firstName} (You)</div>
                    <div className="text-xs text-gray-300">Lvl {user.level}</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-primary">{user.xp} XP</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Chat Tab */}
      {activeTab === 'chat' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-250px)] flex flex-col">
          <div className="flex-1 bg-white/5 rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 bg-white/5 border-b border-white/5 font-bold text-sm flex items-center gap-2 text-primary">
              <MessageCircle size={18} />
              Global Chat
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2">
                  {msg.isBot ? (
                    <div className="bg-primary/10 border border-primary/30 px-4 py-1.5 rounded-full text-[10px] text-primary font-bold my-2 text-center uppercase tracking-wider">
                      {msg.text}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-1 pl-1">
                        <span className="text-xs font-bold text-blue-400">{msg.sender}</span>
                        <span className="text-[10px] text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="bg-white/10 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm break-words max-w-[85%] shadow-sm">
                        {msg.text}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendChatMessage} className="p-3 bg-black/40 border-t border-white/5 flex gap-2 backdrop-blur-md">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:bg-white/10 outline-none transition-all placeholder:text-gray-600 text-white"
              />
              <button type="submit" className="p-3 bg-primary text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
