import { useState, useEffect, useRef } from 'react';
import { Users, Plus, MessageSquare, Send, Shield, Crown, LogOut, Search, Globe, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

// MOCK DATA for Offline Mode
const MOCK_GUILDS: Guild[] = [
  {
    id: 'g1',
    name: "Dragon Slayers",
    creatorId: 'u1',
    emblem: '🐉',
    description: "We conquer the hardest games!",
    members: [
        { id: 'u2', name: 'Alex', score: 1500 },
        { id: 'u3', name: 'Sarah', score: 1200 },
    ],
    messages: [
        { id: 1, sender: 'Alex', text: 'Anyone up for a battle?', timestamp: new Date().toISOString() },
        { id: 2, sender: 'Sarah', text: 'I am training right now!', timestamp: new Date().toISOString() },
    ],
    totalScore: 2700
  },
  {
    id: 'g2',
    name: "Mind Masters",
    creatorId: 'u4',
    emblem: '🧠',
    description: "Focus and precision.",
    members: [
        { id: 'u5', name: 'Brainiac', score: 2000 },
    ],
    messages: [],
    totalScore: 2000
  },
  {
    id: 'g3',
    name: "Founding Group",
    creatorId: 'admin',
    emblem: '👑',
    description: "Official community guild.",
    members: [
        { id: 'admin', name: 'Admin', score: 9999 },
        { id: 'u6', name: 'Player1', score: 500 },
        { id: 'u7', name: 'Player2', score: 450 },
    ],
    messages: [
        { id: 1, sender: 'Admin', text: 'Welcome to the official guild!', timestamp: new Date(Date.now() - 3600000).toISOString() },
    ],
    totalScore: 10949
  }
];

const MOCK_GLOBAL_CHAT: GuildMessage[] = [
    { id: 1, sender: 'System', text: 'Welcome to Global Chat!', timestamp: new Date().toISOString(), isBot: true },
    { id: 2, sender: 'Guest_123', text: 'How do I earn gems?', timestamp: new Date(Date.now() - 60000).toISOString() },
    { id: 3, sender: 'Helper_Bot', text: 'You can earn gems by completing social tasks in Settings!', timestamp: new Date(Date.now() - 30000).toISOString(), isBot: true },
];

interface GuildMember {
  id: string;
  name: string;
  score: number;
}

interface GuildMessage {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  isBot?: boolean;
}

interface Guild {
  id: string;
  name: string;
  creatorId: string;
  emblem: string;
  description: string;
  members: GuildMember[];
  messages: GuildMessage[];
  totalScore: number;
}

const EMBLEMS = ['🛡️', '⚔️', '👑', '🐉', '🦁', '🦅', '🐺', '⚡', '🔥', '💎', '🧠', '🚀'];

export const GuildsPage = () => {
  const navigate = useNavigate();
  const { user, theme } = useStore();
  const [activeTab, setActiveTab] = useState<'global' | 'list' | 'my_guild'>('list');
  const isLight = theme === 'light';
  const isBlue = theme === 'blue';
  
  // Data State (Local only for demo)
  const [guilds, setGuilds] = useState<Guild[]>(MOCK_GUILDS);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [globalMessages, setGlobalMessages] = useState<GuildMessage[]>(MOCK_GLOBAL_CHAT);
  
  // UI State
  const [isCreating, setIsCreating] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');
  const [selectedEmblem, setSelectedEmblem] = useState(EMBLEMS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [chatMessage, setChatMessage] = useState('');
  const [globalChatMessage, setGlobalChatMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const globalMessagesEndRef = useRef<HTMLDivElement>(null);

  // Load My Guild from local storage persistence if possible, or just state
  // For this demo, we reset on refresh unless we used useStore for guilds (which is complex).
  // We will just simulate joining.

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    globalMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTab, myGuild?.messages, globalMessages]);

  const createGuild = () => {
    if (!newGuildName.trim()) return;
    
    const newGuild: Guild = {
        id: `g_${Date.now()}`,
        name: newGuildName,
        creatorId: String(user.id),
        emblem: selectedEmblem,
        description: newGuildDesc || "No description",
        members: [{ id: String(user.id), name: user.firstName, score: user.xp }],
        messages: [{
            id: Date.now(),
            sender: 'System',
            text: `Guild "${newGuildName}" created!`,
            timestamp: new Date().toISOString(),
            isBot: true
        }],
        totalScore: user.xp
    };

    setGuilds(prev => [...prev, newGuild]);
    setMyGuild(newGuild);
    setIsCreating(false);
    setActiveTab('my_guild');
    setNewGuildName('');
    setNewGuildDesc('');
  };

  const joinGuild = (guildId: string) => {
    if (myGuild) {
        alert("You are already in a guild! Leave it first.");
        return;
    }
    
    const targetGuild = guilds.find(g => g.id === guildId);
    if (!targetGuild) return;

    // Simulate update
    const updatedGuild = {
        ...targetGuild,
        members: [...targetGuild.members, { id: String(user.id), name: user.firstName, score: user.xp }],
        messages: [...targetGuild.messages, {
            id: Date.now(),
            sender: 'System',
            text: `${user.firstName} joined the guild!`,
            timestamp: new Date().toISOString(),
            isBot: true
        }]
    };

    setGuilds(prev => prev.map(g => g.id === guildId ? updatedGuild : g));
    setMyGuild(updatedGuild);
    setActiveTab('my_guild');
  };

  const leaveGuild = () => {
    if (!myGuild) return;
    if (confirm("Are you sure you want to leave your guild?")) {
      const updatedGuild = {
          ...myGuild,
          members: myGuild.members.filter(m => m.id !== String(user.id))
      };
      // If last member, delete guild? Or just update.
      
      setGuilds(prev => prev.map(g => g.id === myGuild.id ? updatedGuild : g));
      setMyGuild(null);
      setActiveTab('list');
    }
  };

  const sendGuildMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatMessage.trim() || !myGuild) return;
    
    const newMessage: GuildMessage = {
        id: Date.now(),
        sender: user.firstName,
        text: chatMessage,
        timestamp: new Date().toISOString()
    };

    const updatedGuild = {
        ...myGuild,
        messages: [...myGuild.messages, newMessage]
    };

    setMyGuild(updatedGuild);
    setGuilds(prev => prev.map(g => g.id === myGuild.id ? updatedGuild : g));
    setChatMessage('');
  };

  const sendGlobalMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!globalChatMessage.trim()) return;
    
    const newMessage: GuildMessage = {
        id: Date.now(),
        sender: user.firstName,
        text: globalChatMessage,
        timestamp: new Date().toISOString()
    };

    setGlobalMessages(prev => [...prev, newMessage]);
    setGlobalChatMessage('');

    // Simulate Bot Response
    setTimeout(() => {
        const botResponses = [
            "That's interesting!",
            "Keep focusing!",
            "Join a guild to earn more rewards.",
            "Did you try the Squid Game yet?"
        ];
        const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
        
        setGlobalMessages(prev => [...prev, {
            id: Date.now(),
            sender: "Bot",
            text: randomResponse,
            timestamp: new Date().toISOString(),
            isBot: true
        }]);
    }, 2000);
  };

  const filteredGuilds = guilds.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={clsx(
      "min-h-screen relative",
      isLight ? "bg-[#f2f3f5] text-gray-900" : isBlue ? "bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900 text-white" : "bg-black text-white"
    )}>
      {/* Background Ambient */}
      <div className={clsx(
        "fixed top-0 left-0 w-full h-full -z-10",
        isLight ? "bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-[#f2f3f5] to-[#e6e7ea]" :
        isBlue ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-indigo-700/20 to-purple-800/20" :
        "bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black"
      )} />

      {/* Header */}
      <div className={clsx(
        "p-4 pt-8 backdrop-blur-xl sticky top-0 z-20 border-b",
        isLight ? "bg-white/80 border-gray-200" : isBlue ? "bg-blue-900/40 border-blue-400/30" : "bg-black/80 border-white/5"
      )}>
        <div className="flex justify-between items-center mb-4">
            <h1 className={clsx("text-3xl font-black flex items-center gap-3", isLight ? "text-gray-900" : "text-white")}>
            <Shield className={clsx(isBlue ? "text-blue-400" : "text-primary")} size={32} />
            Guilds
            </h1>
            <div className={clsx(
              "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2",
              isLight ? "bg-gray-100 text-green-600" : isBlue ? "bg-blue-500/15 text-green-400 border border-blue-400/30" : "bg-white/10 text-green-400"
            )}>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Online: {120 + Math.floor(Math.random() * 50)}
            </div>
        </div>
        
        <div className={clsx("flex p-1 rounded-xl border",
          isLight ? "bg-gray-100 border-gray-200" : isBlue ? "bg-blue-900/20 border-blue-400/30" : "bg-white/5 border-white/5"
        )}>
          <button 
            onClick={() => setActiveTab('global')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'global' 
                ? clsx(isLight ? "bg-white text-black shadow-sm" : isBlue ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-primary text-black shadow-lg shadow-primary/20")
                : clsx(isLight ? "text-gray-500 hover:text-black" : isBlue ? "text-blue-200/70 hover:text-white hover:bg-blue-900/20" : "text-gray-400 hover:text-white hover:bg-white/5")
            )}
          >
            <Globe size={16} /> Global
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'list' 
                ? clsx(isLight ? "bg-white text-black shadow-sm" : isBlue ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-primary text-black shadow-lg shadow-primary/20")
                : clsx(isLight ? "text-gray-500 hover:text-black" : isBlue ? "text-blue-200/70 hover:text-white hover:bg-blue-900/20" : "text-gray-400 hover:text-white hover:bg-white/5")
            )}
          >
            <Search size={16} /> Find
          </button>
          <button 
            onClick={() => setActiveTab('my_guild')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'my_guild' 
                ? clsx(isLight ? "bg-white text-black shadow-sm" : isBlue ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-primary text-black shadow-lg shadow-primary/20")
                : clsx(isLight ? "text-gray-500 hover:text-black" : isBlue ? "text-blue-200/70 hover:text-white hover:bg-blue-900/20" : "text-gray-400 hover:text-white hover:bg-white/5")
            )}
          >
            <Shield size={16} /> My Guild
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100vh-180px)] flex flex-col">
        
        {/* GLOBAL CHAT TAB */}
        {activeTab === 'global' && (
          <div className={clsx(
            "flex-1 rounded-3xl overflow-hidden flex flex-col shadow-2xl border",
            isLight ? "bg-white border-gray-200" : isBlue ? "bg-blue-900/20 border-blue-400/30" : "bg-white/5 border-white/5"
          )}>
            <div className={clsx(
              "p-4 font-bold text-sm flex items-center gap-2 border-b",
              isLight ? "bg-gray-100 border-gray-200 text-blue-600" : isBlue ? "bg-blue-900/30 border-blue-400/30 text-blue-300" : "bg-white/5 border-white/5 text-primary"
            )}>
              <Globe size={18} />
              Global Community
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
               {globalMessages.map((msg) => (
                 <div key={msg.id} className={clsx("flex flex-col items-start animate-in fade-in slide-in-from-bottom-2", msg.isBot ? "items-center w-full" : "")}>
                   {msg.isBot ? (
                    <div className={clsx(
                      "px-4 py-1.5 rounded-full text-[10px] font-bold my-2 text-center uppercase tracking-wider border",
                      isBlue ? "bg-blue-500/10 border-blue-400/40 text-blue-300" : "bg-primary/10 border-primary/30 text-primary"
                    )}>
                      {msg.text}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-1 pl-1">
                        <span className={clsx("text-xs font-bold", isBlue ? "text-blue-300" : "text-blue-400")}>{msg.sender}</span>
                        <span className={clsx("text-[10px]", isLight ? "text-gray-500" : "text-gray-500")}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className={clsx(
                        "px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm break-words max-w-[85%] shadow-sm",
                        isLight ? "bg-gray-100" : isBlue ? "bg-blue-900/30 border border-blue-400/20" : "bg-white/10"
                      )}>
                        {msg.text}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={globalMessagesEndRef} />
            </div>

            <form onSubmit={sendGlobalMessage} className={clsx(
              "p-3 border-t flex gap-2 backdrop-blur-md",
              isLight ? "bg-white/60 border-gray-200" : isBlue ? "bg-blue-900/30 border-blue-400/20" : "bg-black/40 border-white/5"
            )}>
              <input 
                type="text" 
                value={globalChatMessage}
                onChange={(e) => setGlobalChatMessage(e.target.value)}
                placeholder="Message global chat..."
                className={clsx(
                  "flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all",
                  isLight ? "bg-white border border-gray-200 focus:border-blue-500" : isBlue ? "bg-blue-900/20 border border-blue-400/30 focus:border-blue-500" : "bg-white/5 border border-white/10 focus:border-primary focus:bg-white/10",
                  "placeholder:text-gray-600"
                )}
              />
              <button type="submit" className={clsx(
                "p-3 rounded-xl hover:scale-105 active:scale-95 transition-all",
                isBlue ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-primary text-black shadow-lg shadow-primary/20"
              )}>
                <Send size={20} />
              </button>
            </form>
          </div>
        )}

        {/* LIST TAB */}
        {activeTab === 'list' && (
          <div className="space-y-4 overflow-y-auto pb-20 no-scrollbar">
            <div className="sticky top-0 z-10 pb-2">
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative group">
                  <Search className={clsx("absolute left-3 top-3.5 transition-colors", isLight ? "text-gray-500 group-focus-within:text-blue-600" : isBlue ? "text-blue-300 group-focus-within:text-blue-400" : "text-gray-500 group-focus-within:text-primary")} size={18} />
                  <input 
                    type="text" 
                    placeholder="Search guilds..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={clsx(
                      "w-full rounded-2xl pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-gray-600",
                      isLight ? "bg-white border border-gray-200 focus:border-blue-500" : isBlue ? "bg-blue-900/20 border border-blue-400/30 focus:border-blue-500" : "bg-white/5 border border-white/10 focus:border-primary focus:bg-white/10"
                    )}
                  />
                </div>
                <button 
                  onClick={() => setIsCreating(true)}
                  className={clsx(
                    "px-5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all",
                    isBlue ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-primary text-black shadow-lg shadow-primary/20"
                  )}
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            {isCreating && (
              <div className={clsx(
                "p-5 rounded-3xl animate-in fade-in slide-in-from-top-4 mb-4 shadow-2xl border",
                isLight ? "bg-white border-gray-200" : isBlue ? "bg-blue-900/20 border-blue-400/30" : "bg-white/10 border-white/10"
              )}>
                <h3 className="font-bold mb-4 text-lg">Create New Guild</h3>
                
                <label className={clsx("text-xs font-bold ml-1 mb-1 block uppercase", isLight ? "text-gray-500" : "text-gray-400")}>Choose Emblem</label>
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                  {EMBLEMS.map(e => (
                    <button
                      key={e}
                      onClick={() => setSelectedEmblem(e)}
                      className={clsx(
                        "min-w-[48px] h-12 flex items-center justify-center rounded-xl text-2xl border-2 transition-all",
                        selectedEmblem === e 
                          ? clsx(isBlue ? "bg-blue-500 border-blue-500 text-white scale-110 shadow-lg shadow-blue-500/30" : "bg-primary border-primary scale-110 shadow-lg") 
                          : clsx(isLight ? "bg-gray-100 border-transparent hover:bg-gray-200" : isBlue ? "bg-blue-900/20 border-transparent hover:bg-blue-900/30" : "bg-black/20 border-transparent hover:bg-white/10")
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 mb-4">
                    <input 
                    type="text" 
                    placeholder="Guild Name" 
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    className={clsx(
                      "w-full p-4 rounded-xl border outline-none transition-colors",
                      isLight ? "bg-white border-gray-200 focus:border-blue-500" : isBlue ? "bg-blue-900/20 border-blue-400/30 text-white focus:border-blue-500" : "bg-black/30 border-white/10 text-white focus:border-primary"
                    )}
                    />
                    <input 
                    type="text" 
                    placeholder="Motto / Description" 
                    value={newGuildDesc}
                    onChange={(e) => setNewGuildDesc(e.target.value)}
                    className={clsx(
                      "w-full p-4 rounded-xl border outline-none transition-colors text-sm",
                      isLight ? "bg-white border-gray-200 focus:border-blue-500" : isBlue ? "bg-blue-900/20 border-blue-400/30 text-white focus:border-blue-500" : "bg-black/30 border-white/10 text-white focus:border-primary"
                    )}
                    />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsCreating(false)}
                    className={clsx(
                      "flex-1 py-3 rounded-xl text-sm font-bold transition-colors",
                      isLight ? "bg-gray-100 hover:bg-gray-200" : isBlue ? "bg-blue-900/20 hover:bg-blue-900/30" : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createGuild}
                    disabled={!newGuildName.trim()}
                    className={clsx(
                      "flex-1 py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all",
                      isBlue ? "bg-blue-500 text-white" : "bg-primary text-black"
                    )}
                  >
                    Create Guild
                  </button>
                </div>
              </div>
            )}

            {filteredGuilds.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                 <Shield size={48} className="opacity-20" />
                 <p>{searchQuery ? "No guilds found." : "No guilds yet. Be the first!"}</p>
               </div>
            ) : (
               filteredGuilds.map(guild => (
                 <div key={guild.id} className={clsx(
                   "p-4 rounded-3xl flex justify-between items-center active:scale-[0.99] transition-all group shadow-lg border",
                   isLight ? "bg-white border-gray-200 hover:bg-gray-100" : isBlue ? "bg-blue-900/20 border-blue-400/30 hover:bg-blue-900/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                 )}>
                   <div className="flex items-center gap-4">
                     <div className={clsx(
                       "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-inner group-hover:scale-110 transition-transform",
                       isLight ? "bg-gradient-to-br from-gray-200 to-gray-300 border-gray-300" : isBlue ? "bg-gradient-to-br from-blue-800 to-indigo-900 border-blue-400/30" : "bg-gradient-to-br from-gray-800 to-black border-white/10"
                     )}>
                       {guild.emblem || '🛡️'}
                     </div>
                     <div>
                       <h3 className={clsx("font-bold leading-tight text-lg", isLight ? "text-gray-900" : "text-white")}>{guild.name}</h3>
                       <p className={clsx("text-xs italic mb-1.5 line-clamp-1", isLight ? "text-gray-500" : "text-gray-400")}>{guild.description}</p>
                       <div className="flex gap-3">
                         <span className={clsx("text-xs flex items-center gap-1.5 font-mono px-2 py-0.5 rounded-md",
                           isLight ? "text-gray-600 bg-gray-200" : isBlue ? "text-blue-200 bg-blue-900/20" : "text-gray-400 bg-black/20"
                         )}>
                           <Users size={12} /> {guild.members.length}
                         </span>
                         <span className={clsx("text-xs flex items-center gap-1.5 font-mono px-2 py-0.5 rounded-md",
                           isLight ? "text-yellow-600 bg-yellow-500/10" : "text-yellow-500 bg-yellow-500/10"
                         )}>
                           <Crown size={12} /> {guild.totalScore}
                         </span>
                       </div>
                     </div>
                   </div>
                   <button 
                     onClick={() => joinGuild(guild.id)}
                     className={clsx(
                       "px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                       isLight ? "bg-gray-100 hover:bg-gray-200" : isBlue ? "bg-blue-900/20 text-white hover:bg-blue-500" : "bg-white/10 hover:bg-primary hover:text-black"
                     )}
                   >
                     Join
                   </button>
                 </div>
               ))
            )}
          </div>
        )}



        {/* MY GUILD TAB */}
        {activeTab === 'my_guild' && (
          !myGuild ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20 animate-in zoom-in">
              <div className={clsx("w-24 h-24 rounded-full flex items-center justify-center mb-6 border",
                isLight ? "bg-gray-100 border-gray-300" : isBlue ? "bg-blue-900/20 border-blue-400/30" : "bg-white/5 border-white/10"
              )}>
                 <Shield size={48} className="text-gray-600" />
              </div>
              <h3 className={clsx("text-2xl font-black mb-2", isLight ? "text-gray-900" : "text-white")}>No Guild Yet</h3>
              <p className={clsx("mb-8 max-w-[200px]", isLight ? "text-gray-500" : "text-gray-400")}>Join a guild to chat with friends and compete in wars!</p>
              <button 
                onClick={() => setActiveTab('list')}
                className={clsx(
                  "px-8 py-4 font-bold rounded-2xl hover:scale-105 transition-transform shadow-lg",
                  isBlue ? "bg-blue-500 text-white shadow-blue-500/30" : "bg-primary text-black shadow-primary/20"
                )}
              >
                Find a Guild
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col animate-in fade-in">
              <div className={clsx(
                "p-5 rounded-3xl mb-4 relative overflow-hidden shadow-2xl border",
                isLight ? "bg-gradient-to-br from-gray-100 to-white border-gray-200" : isBlue ? "bg-gradient-to-br from-blue-800 to-indigo-900 border-blue-400/30" : "bg-gradient-to-br from-gray-800 to-black border-white/10"
              )}>
                 <div className="absolute top-0 right-0 p-3 z-10">
                   <button onClick={leaveGuild} className="text-red-500/70 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all">
                     <LogOut size={20} />
                   </button>
                 </div>
                 
                 <div className="flex flex-col items-center mb-5 relative z-0">
                   <div className={clsx(
                     "w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-3 border shadow-[0_0_30px_rgba(255,255,255,0.1)]",
                     isBlue ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-400/30" : "bg-gradient-to-br from-primary/20 to-purple-500/20 border-white/10"
                   )}>
                     {myGuild.emblem}
                   </div>
                   <h2 className={clsx("text-3xl font-black mb-1", isLight ? "text-gray-900" : "text-white")}>{myGuild.name}</h2>
                   <p className={clsx("text-sm italic", isLight ? "text-gray-500" : "text-gray-400")}>"{myGuild.description}"</p>
                 </div>

                 <div className="flex -space-x-3 overflow-hidden mb-2 justify-center py-2">
                    {myGuild.members.slice(0, 5).map((m, i) => (
                      <div key={i} className={clsx(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shadow-lg relative z-10",
                        isLight ? "bg-gray-400 border-white" : isBlue ? "bg-blue-800 border-black" : "bg-gray-700 border-black"
                      )} title={m.name}>
                        {m.name[0]}
                      </div>
                    ))}
                    {myGuild.members.length > 5 && (
                      <div className={clsx(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold relative z-0",
                        isLight ? "bg-gray-300 border-white text-gray-600" : isBlue ? "bg-blue-900 border-black text-blue-200" : "bg-gray-800 border-black text-gray-400"
                      )}>
                        +{myGuild.members.length - 5}
                      </div>
                    )}
                 </div>
              </div>

              {/* Chat Area */}
              <div className={clsx(
                "flex-1 rounded-3xl overflow-hidden flex flex-col shadow-2xl border",
                isLight ? "bg-white border-gray-200" : isBlue ? "bg-blue-900/20 border-blue-400/30" : "bg-white/5 border-white/5"
              )}>
                <div className={clsx(
                  "p-4 font-bold text-sm flex items-center gap-2 border-b",
                  isLight ? "bg-gray-100 border-gray-200 text-gray-700" : isBlue ? "bg-blue-900/30 border-blue-400/30 text-blue-300" : "bg-white/5 border-white/5 text-gray-300"
                )}>
                  <MessageSquare size={18} />
                  Guild Chat
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                   {myGuild.messages.length === 0 && (
                     <div className={clsx("text-center text-sm mt-10", isLight ? "text-gray-500" : "text-gray-500")}>No messages yet. Say hi!</div>
                   )}
                   {myGuild.messages.map((msg) => (
                     <div key={msg.id} className={clsx("flex flex-col items-start animate-in fade-in slide-in-from-bottom-2", msg.isBot ? "items-center w-full" : "")}>
                        {msg.isBot ? (
                         <div className={clsx(
                           "px-4 py-1.5 rounded-full text-[10px] font-bold my-2 text-center uppercase tracking-wider border",
                           isBlue ? "bg-blue-500/10 border-blue-400/40 text-blue-300" : "bg-primary/10 border-primary/30 text-primary"
                         )}>
                           {msg.text}
                         </div>
                       ) : (
                         <>
                           <div className="flex items-baseline gap-2 mb-1 pl-1">
                             <span className={clsx("text-xs font-bold", isBlue ? "text-blue-300" : "text-primary")}>{msg.sender}</span>
                             <span className={clsx("text-[10px]", isLight ? "text-gray-500" : "text-gray-500")}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           </div>
                           <div className={clsx(
                             "px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm break-words max-w-[85%] shadow-sm",
                             isLight ? "bg-gray-100" : isBlue ? "bg-blue-900/30 border border-blue-400/20" : "bg-white/10"
                           )}>
                             {msg.text}
                           </div>
                         </>
                       )}
                     </div>
                   ))}
                   <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendGuildMessage} className={clsx(
                  "p-3 border-t flex gap-2 backdrop-blur-md",
                  isLight ? "bg-white/60 border-gray-200" : isBlue ? "bg-blue-900/30 border-blue-400/20" : "bg-black/40 border-white/5"
                )}>
                  <input 
                    type="text" 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className={clsx(
                      "flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all",
                      isLight ? "bg-white border border-gray-200 focus:border-blue-500" : isBlue ? "bg-blue-900/20 border border-blue-400/30 focus:border-blue-500" : "bg-white/5 border border-white/10 focus:border-primary focus:bg-white/10",
                      "placeholder:text-gray-600"
                    )}
                  />
                  <button type="submit" className={clsx(
                    "p-3 rounded-xl hover:scale-105 active:scale-95 transition-all",
                    isBlue ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-primary text-black shadow-lg shadow-primary/20"
                  )}>
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default GuildsPage;
