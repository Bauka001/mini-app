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
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<'global' | 'list' | 'my_guild'>('list');
  
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
    <div className="min-h-screen bg-black text-white relative">
      {/* Background Ambient */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black -z-10" />

      {/* Header */}
      <div className="p-4 pt-8 bg-black/80 backdrop-blur-xl sticky top-0 z-20 border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Shield className="text-primary" size={32} />
            Guilds
            </h1>
            <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Online: {120 + Math.floor(Math.random() * 50)}
            </div>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('global')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'global' ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Globe size={16} /> Global
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'list' ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Search size={16} /> Find
          </button>
          <button 
            onClick={() => setActiveTab('my_guild')}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
              activeTab === 'my_guild' ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-gray-400 hover:text-white hover:bg-white/5"
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
          <div className="flex-1 bg-white/5 rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 bg-white/5 border-b border-white/5 font-bold text-sm flex items-center gap-2 text-primary">
              <Globe size={18} />
              Global Community
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
               {globalMessages.map((msg) => (
                 <div key={msg.id} className={clsx("flex flex-col items-start animate-in fade-in slide-in-from-bottom-2", msg.isBot ? "items-center w-full" : "")}>
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
               <div ref={globalMessagesEndRef} />
            </div>

            <form onSubmit={sendGlobalMessage} className="p-3 bg-black/40 border-t border-white/5 flex gap-2 backdrop-blur-md">
              <input 
                type="text" 
                value={globalChatMessage}
                onChange={(e) => setGlobalChatMessage(e.target.value)}
                placeholder="Message global chat..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
              />
              <button type="submit" className="p-3 bg-primary text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
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
                  <Search className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search guilds..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:border-primary focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="bg-primary text-black px-5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            {isCreating && (
              <div className="bg-white/10 p-5 rounded-3xl border border-white/10 animate-in fade-in slide-in-from-top-4 mb-4 shadow-2xl">
                <h3 className="font-bold mb-4 text-lg">Create New Guild</h3>
                
                <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block uppercase">Choose Emblem</label>
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                  {EMBLEMS.map(e => (
                    <button
                      key={e}
                      onClick={() => setSelectedEmblem(e)}
                      className={clsx(
                        "min-w-[48px] h-12 flex items-center justify-center rounded-xl text-2xl border-2 transition-all",
                        selectedEmblem === e ? "bg-primary border-primary scale-110 shadow-lg" : "bg-black/20 border-transparent hover:bg-white/10"
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
                    className="w-full bg-black/30 p-4 rounded-xl border border-white/10 text-white focus:border-primary outline-none transition-colors"
                    />
                    <input 
                    type="text" 
                    placeholder="Motto / Description" 
                    value={newGuildDesc}
                    onChange={(e) => setNewGuildDesc(e.target.value)}
                    className="w-full bg-black/30 p-4 rounded-xl border border-white/10 text-white focus:border-primary outline-none transition-colors text-sm"
                    />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-3 bg-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createGuild}
                    disabled={!newGuildName.trim()}
                    className="flex-1 py-3 bg-primary text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all"
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
                 <div key={guild.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 flex justify-between items-center hover:bg-white/10 active:scale-[0.99] transition-all group shadow-lg">
                   <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-3xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                       {guild.emblem || '🛡️'}
                     </div>
                     <div>
                       <h3 className="font-bold text-white leading-tight text-lg">{guild.name}</h3>
                       <p className="text-xs text-gray-400 italic mb-1.5 line-clamp-1">{guild.description}</p>
                       <div className="flex gap-3">
                         <span className="text-xs text-gray-400 flex items-center gap-1.5 font-mono bg-black/20 px-2 py-0.5 rounded-md">
                           <Users size={12} /> {guild.members.length}
                         </span>
                         <span className="text-xs text-yellow-500 flex items-center gap-1.5 font-mono bg-yellow-500/10 px-2 py-0.5 rounded-md">
                           <Crown size={12} /> {guild.totalScore}
                         </span>
                       </div>
                     </div>
                   </div>
                   <button 
                     onClick={() => joinGuild(guild.id)}
                     className="px-5 py-2.5 bg-white/10 hover:bg-primary hover:text-black rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
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
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                 <Shield size={48} className="text-gray-600" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">No Guild Yet</h3>
              <p className="text-gray-400 mb-8 max-w-[200px]">Join a guild to chat with friends and compete in wars!</p>
              <button 
                onClick={() => setActiveTab('list')}
                className="px-8 py-4 bg-primary text-black font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                Find a Guild
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col animate-in fade-in">
              <div className="bg-gradient-to-br from-gray-800 to-black p-5 rounded-3xl border border-white/10 mb-4 relative overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 p-3 z-10">
                   <button onClick={leaveGuild} className="text-red-500/70 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all">
                     <LogOut size={20} />
                   </button>
                 </div>
                 
                 <div className="flex flex-col items-center mb-5 relative z-0">
                   <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-5xl border border-white/10 mb-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                     {myGuild.emblem}
                   </div>
                   <h2 className="text-3xl font-black text-white mb-1">{myGuild.name}</h2>
                   <p className="text-sm text-gray-400 italic">"{myGuild.description}"</p>
                 </div>

                 <div className="flex -space-x-3 overflow-hidden mb-2 justify-center py-2">
                    {myGuild.members.slice(0, 5).map((m, i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gray-700 border-2 border-black flex items-center justify-center text-xs font-bold text-white shadow-lg relative z-10" title={m.name}>
                        {m.name[0]}
                      </div>
                    ))}
                    {myGuild.members.length > 5 && (
                      <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-black flex items-center justify-center text-xs text-gray-400 font-bold relative z-0">
                        +{myGuild.members.length - 5}
                      </div>
                    )}
                 </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 bg-white/5 rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                <div className="p-4 bg-white/5 border-b border-white/5 font-bold text-sm flex items-center gap-2 text-gray-300">
                  <MessageSquare size={18} />
                  Guild Chat
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                   {myGuild.messages.length === 0 && (
                     <div className="text-center text-gray-500 text-sm mt-10">No messages yet. Say hi!</div>
                   )}
                   {myGuild.messages.map((msg) => (
                     <div key={msg.id} className={clsx("flex flex-col items-start animate-in fade-in slide-in-from-bottom-2", msg.isBot ? "items-center w-full" : "")}>
                        {msg.isBot ? (
                         <div className="bg-primary/10 border border-primary/30 px-4 py-1.5 rounded-full text-[10px] text-primary font-bold my-2 text-center uppercase tracking-wider">
                           {msg.text}
                         </div>
                       ) : (
                         <>
                           <div className="flex items-baseline gap-2 mb-1 pl-1">
                             <span className="text-xs font-bold text-primary">{msg.sender}</span>
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

                <form onSubmit={sendGuildMessage} className="p-3 bg-black/40 border-t border-white/5 flex gap-2 backdrop-blur-md">
                  <input 
                    type="text" 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                  />
                  <button type="submit" className="p-3 bg-primary text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
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
