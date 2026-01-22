import { useState, useEffect, useRef } from 'react';
import { Users, Plus, MessageSquare, Send, Shield, Crown, LogOut, Search, Globe, MoreVertical, Smile, Info, X, Star, Zap as ZapIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore, Guild, GuildMessage } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../hooks/useThemeStyles';

const PLAN_CONFIG = {
  free: { icon: Star, name: 'Free', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500' },
  standard: { icon: Shield, name: 'Standard', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500' },
  hit: { icon: ZapIcon, name: 'Hit Sales', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500' },
  premium: { icon: Crown, name: 'Premium', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-400' }
};

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
];

const EMBLEMS = ['🐲', '⚔️', '🛡️', '👑', '☠️', '🔮', '⚡', '🔥', '❄️', '🌟', '🦁', '🦅', '🐺', '🕷️', '🦂', '🦈'];

export const GuildsPage = () => {
  const navigate = useNavigate();
  const { user, currentGuild, joinGuild, leaveGuild, updateGuild, plan } = useStore();
  const { isLight, isBlue, isGold, bgClass, cardClass, headerClass, textPrimary, textSecondary, textAccent, btnPrimary, btnSecondary } = useThemeStyles();
  
  const currentPlan = PLAN_CONFIG[plan];
  
  const [activeTab, setActiveTab] = useState<'global' | 'list' | 'my_guild'>(currentGuild ? 'my_guild' : 'list');
  const [showGuildInfo, setShowGuildInfo] = useState(false);
  
  // Data State
  const [guilds, setGuilds] = useState<Guild[]>(MOCK_GUILDS);
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
  const previousGuildId = useRef<string | undefined>(undefined);

  // Sync local guilds list with store's currentGuild
  useEffect(() => {
    if (currentGuild) {
      setGuilds(prev => {
        const exists = prev.find(g => g.id === currentGuild.id);
        if (exists) {
          // Update existing
          return prev.map(g => g.id === currentGuild.id ? currentGuild : g);
        } else {
          // Add if missing (e.g. custom created guild after reload)
          return [currentGuild, ...prev];
        }
      });
      
      // Switch to My Guild tab ONLY when guild ID changes (initial load or join new)
      if (currentGuild.id !== previousGuildId.current) {
        setActiveTab('my_guild');
        previousGuildId.current = currentGuild.id;
      }
    } else {
      previousGuildId.current = undefined;
    }
  }, [currentGuild]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    globalMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTab, currentGuild?.messages, globalMessages]);

  const handleCreateGuild = () => {
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
    joinGuild(newGuild);
    setIsCreating(false);
    setActiveTab('my_guild');
    setNewGuildName('');
    setNewGuildDesc('');
  };

  const handleJoinGuild = (guildId: string) => {
    if (currentGuild) {
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
    joinGuild(updatedGuild);
    setActiveTab('my_guild');
  };

  const handleLeaveGuild = () => {
    if (!currentGuild) return;
    if (confirm("Are you sure you want to leave your guild?")) {
      // Update local list to remove user
      const updatedGuild = {
          ...currentGuild,
          members: currentGuild.members.filter(m => m.id !== String(user.id))
      };
      
      setGuilds(prev => prev.map(g => g.id === currentGuild.id ? updatedGuild : g));
      leaveGuild();
      setActiveTab('list');
      setShowGuildInfo(false);
    }
  };

  const sendGuildMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatMessage.trim() || !currentGuild) return;
    
    const newMessage: GuildMessage = {
        id: Date.now(),
        sender: user.firstName,
        text: chatMessage,
        timestamp: new Date().toISOString()
    };

    const updatedGuild = {
        ...currentGuild,
        messages: [...currentGuild.messages, newMessage]
    };

    updateGuild(updatedGuild);
    setGuilds(prev => prev.map(g => g.id === currentGuild.id ? updatedGuild : g));
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
  };

  const filteredGuilds = guilds.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={clsx("min-h-screen relative", bgClass)}>
      {/* Background Ambient */}
      <div className={clsx(
        "fixed top-0 left-0 w-full h-full -z-10",
        isLight ? "bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-green-50 via-[#f2f3f5] to-[#e6e7ea]" :
        isBlue ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-indigo-700/20 to-purple-800/20" :
        isGold ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-600/20 via-black to-black" :
        "bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black"
      )} />

      {/* Header */}
      <div className={clsx("p-4 pt-8 backdrop-blur-xl sticky top-0 z-20 border-b", headerClass)}>
        <div className="flex justify-between items-center mb-4">
            <h1 className={clsx("text-3xl font-black flex items-center gap-3", textPrimary)}>
            <Shield className={clsx(textAccent)} size={32} />
            Guilds
            </h1>
            <div className={clsx(
              "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2",
              isLight ? "bg-green-100 text-green-700" : isBlue ? "bg-blue-500/15 text-blue-400 border border-blue-400/30" : isGold ? "bg-yellow-900/20 text-yellow-400 border border-yellow-500/30" : "bg-white/10 text-green-400"
            )}>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Online: {120 + Math.floor(Math.random() * 50)}
            </div>
        </div>
        
        <div className={clsx("flex p-1 rounded-xl border", cardClass)}>
          <button 
            onClick={() => setActiveTab('global')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'global' 
                ? btnPrimary
                : btnSecondary
            )}
          >
            <Globe size={16} /> Global
          </button>
          <button 
            onClick={() => setActiveTab('my_guild')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'my_guild' 
                ? btnPrimary
                : btnSecondary
            )}
          >
            <Shield size={16} /> My Guild
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'list' 
                ? btnPrimary
                : btnSecondary
            )}
          >
            <Search size={16} /> Find
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100vh-180px)] flex flex-col">
        
        {/* GLOBAL CHAT TAB */}
        {activeTab === 'global' && (
          <div className={clsx("flex-1 rounded-3xl overflow-hidden flex flex-col shadow-2xl border", cardClass)}>
            <div className={clsx(
              "p-4 font-bold text-sm flex items-center justify-between border-b backdrop-blur-md z-10",
              isLight ? "bg-white/80 border-gray-200 text-green-600" : isBlue ? "bg-blue-900/50 border-blue-400/30 text-blue-300" : isGold ? "bg-yellow-900/40 border-yellow-500/20 text-yellow-400" : "bg-black/40 border-white/5 text-primary"
            )}>
              <div className="flex items-center gap-2">
                 <Globe size={18} />
                 <span>Global Community</span>
              </div>
              <MoreVertical size={18} className="opacity-50" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
               {globalMessages.map((msg, idx) => {
                 const isMe = msg.sender === user.firstName;
                 const showAvatar = idx === 0 || globalMessages[idx - 1].sender !== msg.sender || (new Date(msg.timestamp).getTime() - new Date(globalMessages[idx - 1].timestamp).getTime() > 60000);
                 
                 return (
                 <div key={msg.id} className={clsx("flex flex-col animate-in fade-in slide-in-from-bottom-2", msg.isBot ? "items-center w-full" : isMe ? "items-end" : "items-start")}>
                   {msg.isBot ? (
                    <div className={clsx(
                      "px-4 py-1.5 rounded-full text-[10px] font-bold my-2 text-center uppercase tracking-wider border backdrop-blur-sm",
                      isBlue ? "bg-blue-500/10 border-blue-400/40 text-blue-300" : isGold ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400" : "bg-primary/10 border-primary/30 text-primary"
                    )}>
                      {msg.text}
                    </div>
                  ) : (
                    <div className={clsx("flex gap-2 max-w-[85%]", isMe ? "flex-row-reverse" : "flex-row")}>
                      {/* Avatar */}
                      <div className={clsx("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-md mt-auto", 
                         !showAvatar && "opacity-0",
                         isMe 
                           ? (isLight ? "bg-green-600 text-white" : "bg-primary text-black") 
                           : (isLight ? "bg-gray-300 text-gray-700" : "bg-white/20 text-white")
                      )}>
                        {msg.sender[0]}
                      </div>

                      <div className="flex flex-col gap-1">
                          {showAvatar && !isMe && (
                             <span className={clsx("text-[10px] font-bold ml-1", textAccent)}>{msg.sender}</span>
                          )}
                          <div className={clsx(
                            "px-4 py-2.5 text-sm break-words shadow-sm relative group",
                            isMe 
                              ? clsx(
                                  "rounded-2xl rounded-tr-none text-white",
                                  isLight ? "bg-gradient-to-br from-green-500 to-green-600" : isBlue ? "bg-gradient-to-br from-blue-600 to-blue-700" : isGold ? "bg-gradient-to-br from-yellow-600 to-orange-600" : "bg-gradient-to-br from-primary to-purple-600"
                                )
                              : clsx(
                                  "rounded-2xl rounded-tl-none",
                                  isLight ? "bg-white border border-gray-100 text-gray-800" : "bg-white/10 border border-white/5 text-gray-100"
                                )
                          )}>
                            {msg.text}
                            <div className={clsx(
                                "text-[9px] text-right mt-1 opacity-70 font-mono",
                                isMe ? "text-white/80" : textSecondary
                            )}>
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                      </div>
                    </div>
                  )}
                </div>
              )})}
              <div ref={globalMessagesEndRef} />
            </div>

            <form onSubmit={sendGlobalMessage} className={clsx(
              "p-4 pb-6 backdrop-blur-xl border-t z-20",
              isLight ? "bg-white/80 border-gray-200" : isBlue ? "bg-blue-900/40 border-blue-400/20" : isGold ? "bg-yellow-900/30 border-yellow-500/20" : "bg-black/60 border-white/5"
            )}>
              <div className={clsx(
                  "flex items-center gap-2 p-1.5 rounded-full border shadow-lg transition-all focus-within:ring-2",
                  isLight ? "bg-white border-gray-200 focus-within:ring-green-500/20" : "bg-white/5 border-white/10 focus-within:ring-primary/20"
              )}>
                  <button type="button" className={clsx("p-2 rounded-full hover:bg-white/10 transition-colors", textSecondary)}>
                      <Plus size={20} />
                  </button>
                  <input 
                    type="text" 
                    value={globalChatMessage}
                    onChange={(e) => setGlobalChatMessage(e.target.value)}
                    placeholder="Message..."
                    className={clsx(
                      "flex-1 bg-transparent border-none outline-none text-sm px-2 h-full",
                      isLight ? "text-gray-900 placeholder:text-gray-400" : "text-white placeholder:text-gray-500"
                    )}
                  />
                  <button type="button" className={clsx("p-2 rounded-full hover:bg-white/10 transition-colors hidden sm:block", textSecondary)}>
                      <Smile size={20} />
                  </button>
                  <button 
                    type="submit" 
                    disabled={!globalChatMessage.trim()}
                    className={clsx(
                        "p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100",
                        isLight ? "bg-green-600 text-white shadow-green-500/30" : "bg-primary text-black shadow-primary/30",
                        "shadow-lg"
                    )}
                  >
                    <Send size={18} fill="currentColor" />
                  </button>
              </div>
            </form>
          </div>
        )}

        {/* LIST TAB */}
        {activeTab === 'list' && (
          <div className="space-y-4 overflow-y-auto pb-20 no-scrollbar">
            <div className="sticky top-0 z-10 pb-2">
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative group">
                  <Search className={clsx("absolute left-3 top-3.5 transition-colors", textSecondary)} size={18} />
                  <input 
                    type="text" 
                    placeholder="Search guilds..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={clsx(
                      "w-full rounded-2xl pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-gray-600",
                      isLight ? "bg-white border border-gray-200 focus:border-green-500" : isBlue ? "bg-blue-900/20 border border-blue-400/30 focus:border-blue-500" : isGold ? "bg-yellow-900/10 border border-yellow-500/30 focus:border-yellow-500 text-white" : "bg-white/5 border border-white/10 focus:border-primary focus:bg-white/10"
                    )}
                  />
                </div>
                <button 
                  onClick={() => setIsCreating(true)}
                  className={clsx("px-5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all", btnPrimary)}
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            {isCreating && (
              <div className={clsx("p-5 rounded-3xl animate-in fade-in slide-in-from-top-4 mb-4 shadow-2xl border", cardClass)}>
                <h3 className="font-bold mb-4 text-lg">Create New Guild</h3>
                
                <label className={clsx("text-xs font-bold ml-1 mb-1 block uppercase", textSecondary)}>Choose Emblem</label>
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                  {EMBLEMS.map(e => (
                    <button
                      key={e}
                      onClick={() => setSelectedEmblem(e)}
                      className={clsx(
                        "min-w-[48px] h-12 flex items-center justify-center rounded-xl text-2xl border-2 transition-all",
                        selectedEmblem === e 
                          ? clsx(isBlue ? "bg-blue-500 border-blue-500 text-white scale-110 shadow-lg shadow-blue-500/30" : isGold ? "bg-yellow-600 border-yellow-600 text-white scale-110 shadow-lg shadow-yellow-500/30" : isLight ? "bg-green-500 border-green-500 text-white scale-110 shadow-lg" : "bg-primary border-primary scale-110 shadow-lg") 
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
                      isLight ? "bg-white border-gray-200 focus:border-green-500" : isBlue ? "bg-blue-900/20 border-blue-400/30 text-white focus:border-blue-500" : isGold ? "bg-yellow-900/10 border-yellow-500/30 text-white focus:border-yellow-500" : "bg-black/30 border-white/10 text-white focus:border-primary"
                    )}
                    />
                    <input 
                    type="text" 
                    placeholder="Motto / Description" 
                    value={newGuildDesc}
                    onChange={(e) => setNewGuildDesc(e.target.value)}
                    className={clsx(
                      "w-full p-4 rounded-xl border outline-none transition-colors text-sm",
                      isLight ? "bg-white border-gray-200 focus:border-green-500" : isBlue ? "bg-blue-900/20 border-blue-400/30 text-white focus:border-blue-500" : isGold ? "bg-yellow-900/10 border-yellow-500/30 text-white focus:border-yellow-500" : "bg-black/30 border-white/10 text-white focus:border-primary"
                    )}
                    />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsCreating(false)}
                    className={clsx("flex-1 py-3 rounded-xl text-sm font-bold transition-colors", btnSecondary)}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateGuild}
                    disabled={!newGuildName.trim()}
                    className={clsx("flex-1 py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all", btnPrimary)}
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
                   cardClass,
                   isLight && "hover:bg-gray-50"
                 )}>
                   <div className="flex items-center gap-4">
                     <div className={clsx(
                       "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-inner group-hover:scale-110 transition-transform",
                       isLight ? "bg-gradient-to-br from-gray-200 to-gray-300 border-gray-300" : isBlue ? "bg-gradient-to-br from-blue-800 to-indigo-900 border-blue-400/30" : isGold ? "bg-gradient-to-br from-yellow-700 to-yellow-900 border-yellow-500/30" : "bg-gradient-to-br from-gray-800 to-black border-white/10"
                     )}>
                       {guild.emblem || '🐲'}
                     </div>
                     <div>
                       <h3 className={clsx("font-bold leading-tight text-lg", textPrimary)}>{guild.name}</h3>
                       <p className={clsx("text-xs italic mb-1.5 line-clamp-1", textSecondary)}>{guild.description}</p>
                       <div className="flex gap-3">
                         <span className={clsx("text-xs flex items-center gap-1.5 font-mono px-2 py-0.5 rounded-md",
                           isLight ? "text-gray-600 bg-gray-200" : isBlue ? "text-blue-200 bg-blue-900/20" : isGold ? "text-yellow-400 bg-yellow-900/20" : "text-gray-400 bg-black/20"
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
                     onClick={() => handleJoinGuild(guild.id)}
                     className={clsx(
                       "px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                       btnSecondary
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
          !currentGuild ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20 animate-in zoom-in">
              <div className={clsx("w-24 h-24 rounded-full flex items-center justify-center mb-6 border", cardClass)}>
                 <Shield size={48} className={clsx(textAccent)} />
              </div>
              <h3 className={clsx("text-2xl font-black mb-2", textPrimary)}>No Guild Yet</h3>
              <p className={clsx("mb-8 max-w-[200px]", textSecondary)}>Join a guild to chat with friends and compete in wars!</p>
              <button 
                onClick={() => setActiveTab('list')}
                className={clsx("px-8 py-4 font-bold rounded-2xl hover:scale-105 transition-transform shadow-lg", btnPrimary)}
              >
                Find a Guild
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col animate-in fade-in relative">
              
              {/* GUILD INFO MODAL (Overlay) */}
              {showGuildInfo && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                   <div className={clsx(
                     "w-full max-w-sm rounded-3xl p-6 relative shadow-2xl border",
                     isLight ? "bg-white border-gray-200" : isBlue ? "bg-slate-900 border-blue-500/30" : "bg-gray-900 border-white/10"
                   )}>
                      <button 
                        onClick={() => setShowGuildInfo(false)}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 transition-colors"
                      >
                        <X size={20} className={textSecondary} />
                      </button>

                      <div className="flex flex-col items-center mb-6">
                        <div className={clsx(
                          "w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-4 border shadow-xl",
                          isBlue ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-400/30" : isGold ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30 shadow-yellow-500/20" : isLight ? "bg-white border-green-200" : "bg-gradient-to-br from-primary/20 to-purple-500/20 border-white/10"
                        )}>
                          {currentGuild.emblem}
                        </div>
                        <h2 className={clsx("text-2xl font-black mb-1 text-center", textPrimary)}>{currentGuild.name}</h2>
                        <p className={clsx("text-sm italic text-center", textSecondary)}>"{currentGuild.description}"</p>
                      </div>

                      <div className="space-y-3 mb-6">
                         <h3 className={clsx("text-xs font-bold uppercase tracking-wider mb-2", textSecondary)}>Members</h3>
                         <div className="flex flex-wrap gap-2 justify-center">
                            {currentGuild.members.map((m) => (
                              <div key={m.id} className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold",
                                isLight ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
                              )}>
                                <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center text-[10px]", isLight ? "bg-green-200 text-green-800" : "bg-primary text-black")}>
                                  {m.name[0]}
                                </div>
                                <span className={textPrimary}>{m.name}</span>
                              </div>
                            ))}
                         </div>
                      </div>

                      <button 
                        onClick={handleLeaveGuild}
                        className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <LogOut size={18} />
                        Leave Guild
                      </button>
                   </div>
                </div>
              )}

              {/* Chat Area - Now Full Height */}
              <div className={clsx("flex-1 rounded-3xl overflow-hidden flex flex-col shadow-2xl border h-full", cardClass)}>
                <div className={clsx(
                  "p-3 font-bold text-xs flex items-center justify-between border-b backdrop-blur-md z-10",
                  isLight ? "bg-white/80 border-gray-200 text-green-600" : isBlue ? "bg-blue-900/50 border-blue-400/30 text-blue-300" : isGold ? "bg-yellow-900/40 border-yellow-500/20 text-yellow-400" : "bg-black/40 border-white/5 text-primary"
                )}>
                  <div className="flex items-center gap-2">
                     <MessageSquare size={16} />
                     <span>{currentGuild.name} Chat</span>
                  </div>
                  {/* INFO BUTTON */}
                  <button 
                    onClick={() => setShowGuildInfo(true)}
                    className={clsx("p-1.5 rounded-lg transition-colors hover:bg-white/10", textAccent)}
                  >
                    <Info size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                   {currentGuild.messages.length === 0 && (
                     <div className={clsx("text-center text-xs mt-10", textSecondary)}>No messages yet. Say hi!</div>
                   )}
                   {currentGuild.messages.map((msg, idx) => {
                     const isMe = msg.sender === user.firstName;
                     const showAvatar = idx === 0 || currentGuild.messages[idx - 1].sender !== msg.sender || (new Date(msg.timestamp).getTime() - new Date(currentGuild.messages[idx - 1].timestamp).getTime() > 60000);
                     
                     return (
                     <div key={msg.id} className={clsx("flex flex-col animate-in fade-in slide-in-from-bottom-2", msg.isBot ? "items-center w-full" : isMe ? "items-end" : "items-start")}>
                        {msg.isBot ? (
                         <div className={clsx(
                           "px-4 py-1.5 rounded-full text-[10px] font-bold my-2 text-center uppercase tracking-wider border backdrop-blur-sm",
                           isBlue ? "bg-blue-500/10 border-blue-400/40 text-blue-300" : isGold ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400" : isLight ? "bg-green-100 text-green-700 border-green-200" : "bg-primary/10 border-primary/30 text-primary"
                         )}>
                           {msg.text}
                         </div>
                       ) : (
                         <div className={clsx("flex gap-2 max-w-[85%]", isMe ? "flex-row-reverse" : "flex-row")}>
                            {/* Avatar */}
                            <div className={clsx("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-md mt-auto", 
                               !showAvatar && "opacity-0",
                               isMe 
                                 ? (isLight ? "bg-green-600 text-white" : "bg-primary text-black") 
                                 : (isLight ? "bg-gray-300 text-gray-700" : "bg-white/20 text-white")
                            )}>
                              {isMe ? 'You' : msg.sender[0]}
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className={clsx("flex items-center gap-1", isMe ? "flex-row-reverse" : "flex-row")}>
                                  {showAvatar && !isMe && (
                                     <span className={clsx("text-[10px] font-bold ml-1", textAccent)}>{msg.sender}</span>
                                  )}
                                  {isMe && plan !== 'free' && (
                                    <div className={clsx("flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-black uppercase", currentPlan.bg, currentPlan.border, currentPlan.color)}>
                                      <currentPlan.icon size={8} />
                                      {currentPlan.name}
                                    </div>
                                  )}
                                </div>
                                <div className={clsx(
                                  "px-4 py-2.5 text-sm break-words shadow-sm relative group",
                                  isMe 
                                    ? clsx(
                                        "rounded-2xl rounded-tr-none text-white",
                                        isLight ? "bg-gradient-to-br from-green-500 to-green-600" : isBlue ? "bg-gradient-to-br from-blue-600 to-blue-700" : isGold ? "bg-gradient-to-br from-yellow-600 to-orange-600" : "bg-gradient-to-br from-primary to-purple-600"
                                      )
                                    : clsx(
                                        "rounded-2xl rounded-tl-none",
                                        isLight ? "bg-white border border-gray-100 text-gray-800" : "bg-white/10 border border-white/5 text-gray-100"
                                      )
                                )}>
                                  {msg.text}
                                  <div className={clsx(
                                      "text-[9px] text-right mt-1 opacity-70 font-mono",
                                      isMe ? "text-white/80" : textSecondary
                                  )}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                                </div>
                            </div>
                         </div>
                       )}
                     </div>
                   )})}
                   <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendGuildMessage} className={clsx(
                  "p-4 pb-6 backdrop-blur-xl border-t z-20",
                  isLight ? "bg-white/80 border-gray-200" : isBlue ? "bg-blue-900/40 border-blue-400/20" : isGold ? "bg-yellow-900/30 border-yellow-500/20" : "bg-black/60 border-white/5"
                )}>
                  <div className={clsx(
                      "flex items-center gap-2 p-1.5 rounded-full border shadow-lg transition-all focus-within:ring-2",
                      isLight ? "bg-white border-gray-200 focus-within:ring-green-500/20" : "bg-white/5 border-white/10 focus-within:ring-primary/20"
                  )}>
                      <button type="button" className={clsx("p-2 rounded-full hover:bg-white/10 transition-colors", textSecondary)}>
                          <Plus size={20} />
                      </button>
                      <input 
                        type="text" 
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type a message..."
                        className={clsx(
                          "flex-1 bg-transparent border-none outline-none text-sm px-2 h-full",
                          isLight ? "text-gray-900 placeholder:text-gray-400" : "text-white placeholder:text-gray-500"
                        )}
                      />
                      <button type="button" className={clsx("p-2 rounded-full hover:bg-white/10 transition-colors hidden sm:block", textSecondary)}>
                          <Smile size={20} />
                      </button>
                      <button 
                        type="submit" 
                        disabled={!chatMessage.trim()}
                        className={clsx(
                            "p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100",
                            isLight ? "bg-green-600 text-white shadow-green-500/30" : "bg-primary text-black shadow-primary/30",
                            "shadow-lg"
                        )}
                      >
                        <Send size={18} fill="currentColor" />
                      </button>
                  </div>
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
