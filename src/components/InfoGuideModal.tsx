import { useState } from 'react';
import { X, HelpCircle, BookOpen, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export const InfoGuideModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'games' | 'faq'>('games');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{sender: 'user' | 'bot', text: string}[]>([
    { sender: 'bot', text: "Hello! Ask me anything about the app. / Сәлем! Маған сұрақ қойыңыз." }
  ]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    // Simple bot logic
    setTimeout(() => {
      let reply = "I'm still learning. Try asking about games or guilds.";
      const lower = userMsg.toLowerCase();
      
      if (lower.includes('schulte') || lower.includes('шульте')) {
        reply = "Schulte Table improves attention. Find numbers 1-25 in order while focusing on the center dot. / Шульте кестесі зейінді дамытады. Орталық нүктеге қарап, 1-ден 25-ке дейін табыңыз.";
      } else if (lower.includes('pairs') || lower.includes('memory')) {
        reply = "Pairs Game trains memory. Remember card positions in 3 seconds, then match them. / Жұптар ойыны есте сақтауды жаттықтырады. 3 секундта карталарды есте сақтап, жұптарын табыңыз.";
      } else if (lower.includes('odd') || lower.includes('артық')) {
        reply = "Odd One Out tests perception. Find the item that looks different. / Артығын тап - қабылдауды тексереді. Өзгеше затты табыңыз.";
      } else if (lower.includes('guild') || lower.includes('топ')) {
        reply = "Guilds let you team up! Create or join one in the 'Guilds' tab. / Гильдиялар бірігуге мүмкіндік береді! 'Guilds' бөлімінде қосылыңыз немесе ашыңыз.";
      }

      setChatHistory(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-secondary rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <HelpCircle className="text-primary" />
             {t('Info Guide')}
           </h2>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
             <X size={20} className="text-gray-400" />
           </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-black/20">
          <button 
            onClick={() => setActiveTab('games')}
            className={clsx(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'games' ? "bg-primary text-black" : "bg-white/5 text-gray-400"
            )}
          >
            <BookOpen size={14} /> Games Guide
          </button>
          <button 
            onClick={() => setActiveTab('faq')}
            className={clsx(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'faq' ? "bg-primary text-black" : "bg-white/5 text-gray-400"
            )}
          >
            <MessageSquare size={14} /> Ask Bot
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'games' && (
            <div className="space-y-4">
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                 <h3 className="font-bold text-primary mb-1">Schulte Table</h3>
                 <p className="text-xs text-gray-300">Focus on the center red dot. Find numbers 1 to 25 in ascending order using peripheral vision. Do not move your eyes!</p>
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                 <h3 className="font-bold text-primary mb-1">Pairs (Memory)</h3>
                 <p className="text-xs text-gray-300">Memorize the cards shown for 3 seconds. Then find matching pairs as fast as possible.</p>
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                 <h3 className="font-bold text-primary mb-1">Odd One Out</h3>
                 <p className="text-xs text-gray-300">Identify the emoji/icon that is different from the rest. Speed is key!</p>
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                 <h3 className="font-bold text-primary mb-1">Math Battle</h3>
                 <p className="text-xs text-gray-300">Solve arithmetic problems faster than your opponent in real-time PvP.</p>
               </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="flex flex-col h-full min-h-[300px]">
               <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                 {chatHistory.map((msg, i) => (
                   <div key={i} className={clsx("flex", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                     <div className={clsx(
                       "max-w-[80%] p-3 rounded-2xl text-sm",
                       msg.sender === 'user' ? "bg-primary text-black rounded-tr-none" : "bg-white/10 text-white rounded-tl-none"
                     )}>
                       {msg.text}
                     </div>
                   </div>
                 ))}
               </div>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={chatInput}
                   onChange={(e) => setChatInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                   placeholder="Ask about games..." 
                   className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-primary outline-none text-white"
                 />
                 <button onClick={handleSend} className="p-2 bg-primary text-black rounded-xl">
                   <MessageSquare size={18} />
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
