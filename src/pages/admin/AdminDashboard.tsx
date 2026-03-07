import { Users, MessageSquare, Ticket, ShieldCheck, Coins, AlertCircle, Send, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useState } from 'react';

export const AdminDashboard = () => {
  const { user, adminIds, feedbacks, updateFeedbackStatus, replyToFeedback, tickets, eventParticipants, coins, plan, verifyTicket } = useStore();
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'resolved'>('all');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [ticketNumber, setTicketNumber] = useState('');
  const [verifyResult, setVerifyResult] = useState<'idle' | 'success' | 'fail'>('idle');

  if (!adminIds.includes(user.id)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center bg-white dark:bg-gray-900 p-12 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Кіруге рұқсат жоқ</h2>
          <p className="text-gray-500 max-w-xs mx-auto">Бұл бөлім тек әкімшілерге арналған. Рұқсатыңыз жоқ.</p>
        </div>
      </div>
    );
  }

  const handleReply = (id: string) => {
    const text = replyText[id];
    if (!text?.trim()) return;
    
    replyToFeedback(id, text);
    setReplyText(prev => ({ ...prev, [id]: '' }));
  };

  const filteredFeedbacks = feedbacks.filter(f => filter === 'all' || f.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Әкімші тақтасы</h2>
          <p className="text-gray-500 font-medium">Focus Mini App басқару және мониторинг</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">A</div>
          <div className="pr-4">
            <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">{user.username || 'Admin'}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Бас Әкімші</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-4 rounded-2xl bg-blue-600">
              <Ticket className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Тікеттер</h3>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{tickets.length.toString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-4 rounded-2xl bg-green-600">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Қатысушылар</h3>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{eventParticipants.length.toString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-4 rounded-2xl bg-purple-600">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Шағымдар</h3>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{feedbacks.length.toString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-4 rounded-2xl bg-yellow-500">
              <Coins className="w-6 h-6 text-black" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Баланс</h3>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{coins.toLocaleString()} coins • {plan.toUpperCase()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
           <div>
             <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Кері байланыс және шағымдар</h3>
             <p className="text-sm text-gray-500">Қолданушылар жіберген хабарламалар тізімі</p>
           </div>
           <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl gap-1">
             <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filter === 'all' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>БАРЛЫҒЫ</button>
             <button onClick={() => setFilter('new')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filter === 'new' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:text-gray-700'}`}>ЖАҢА</button>
             <button onClick={() => setFilter('resolved')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filter === 'resolved' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-gray-500 hover:text-gray-700'}`}>ШЕШІЛДІ</button>
           </div>
        </div>

        <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-400 font-bold">Әзірге шағымдар жоқ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredFeedbacks.map((fb) => (
                <div key={fb.id} className="group bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 transition-all hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:border-transparent">
                   <div className="flex flex-col md:flex-row gap-8">
                     {fb.imageUrl && (
                       <div className="w-full md:w-56 h-40 rounded-2xl overflow-hidden bg-gray-200 shadow-inner flex-shrink-0">
                         <img src={fb.imageUrl} alt="Feedback" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       </div>
                     )}
                     <div className="flex-1 flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center text-blue-600 font-bold">
                             {fb.username[0].toUpperCase()}
                           </div>
                           <div>
                             <h4 className="font-black text-gray-900 dark:text-white leading-none">{fb.username}</h4>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">USER ID: {fb.userId}</p>
                           </div>
                         </div>
                         <div className="flex flex-col items-end gap-2">
                           <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${
                             fb.status === 'new' ? 'bg-red-100 text-red-600 border border-red-200' : 
                             fb.status === 'read' ? 'bg-yellow-100 text-yellow-600 border border-yellow-200' : 
                             'bg-green-100 text-green-600 border border-green-200'
                           }`}>
                             {fb.status === 'new' ? 'Жаңа' : fb.status === 'read' ? 'Оқылды' : 'Шешілді'}
                           </span>
                           <span className="text-[10px] text-gray-400 font-bold">{new Date(fb.date).toLocaleString()}</span>
                         </div>
                       </div>
                       
                       <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                         <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{fb.text}</p>
                       </div>

                       {fb.adminReply ? (
                         <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/40 relative">
                           <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg">АДМИН ЖАУАБЫ</div>
                           <p className="text-blue-900 dark:text-blue-300 text-sm italic">{fb.adminReply}</p>
                           <p className="text-[10px] text-blue-400 mt-2 font-bold">{new Date(fb.replyDate!).toLocaleString()}</p>
                         </div>
                       ) : (
                         <div className="mt-auto">
                            <div className="relative">
                              <textarea
                                value={replyText[fb.id] || ''}
                                onChange={(e) => setReplyText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                                placeholder="Жауап жазу..."
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 pr-16 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px] resize-none"
                              />
                              <button 
                                onClick={() => handleReply(fb.id)}
                                disabled={!replyText[fb.id]?.trim()}
                                className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                              >
                                <Send size={18} />
                              </button>
                            </div>
                            <div className="flex gap-2 mt-3">
                               <button onClick={() => updateFeedbackStatus(fb.id, 'read')} className="text-[10px] font-black text-gray-400 hover:text-blue-500 transition-colors uppercase tracking-widest">ОҚЫЛДЫ ДЕП БЕЛГІЛЕУ</button>
                               <span className="text-gray-300">•</span>
                               <button onClick={() => updateFeedbackStatus(fb.id, 'resolved')} className="text-[10px] font-black text-gray-400 hover:text-green-500 transition-colors uppercase tracking-widest">ШЕШІЛДІ ДЕП БЕЛГІЛЕУ</button>
                            </div>
                         </div>
                       )}
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden mt-12">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Тікет верификация</h3>
        </div>
        <div className="p-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 w-full max-w-md">
            <Search size={18} className="text-gray-400" />
            <input value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="Тікет нөмірі" className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => { const ok = verifyTicket(Number(ticketNumber)); setVerifyResult(ok ? 'success' : 'fail'); }} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition">Тексеру</button>
          {verifyResult !== 'idle' && (
            <span className={`${verifyResult === 'success' ? 'text-green-600' : 'text-red-600'} font-bold text-sm`}>{verifyResult === 'success' ? 'Расталды' : 'Қате немесе қолданылған'}</span>
          )}
        </div>
        <div className="px-8 pb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Ticket</th>
                  <th className="py-2">User</th>
                  <th className="py-2">Verified</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {eventParticipants.slice(0, 20).map(p => (
                  <tr key={p.ticketId} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 font-bold">{p.ticketNumber}</td>
                    <td className="py-2">{p.userName}</td>
                    <td className={`py-2 ${p.isVerified ? 'text-green-600' : 'text-gray-500'}`}>{p.isVerified ? 'Иә' : 'Жоқ'}</td>
                    <td className="py-2 text-gray-500">{new Date(p.purchaseDate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
