import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, CheckCircle, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

export const TermsModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const [activeTab, setActiveTab] = useState<'kz' | 'ru' | 'en'>('kz');

  if (!isOpen) return null;

  const content = {
    kz: {
      title: "Қатысу шарттары",
      grandPrizeLabel: "Бас жүлде",
      rules: [
        "Ұтыс ойынына тек 'Premium' жоспарын сатып алған қолданушылар қатыса алады.",
        "Әрбір Premium қолданушыға бірегей билет нөмірі беріледі.",
        "Ұтыс нәтижесі mini app ішіндегі турнир және VIP analytics бөліктерінде жарияланады.",
        "Жеңімпаз кездейсоқ сандар генераторы арқылы анықталады.",
        "Бас жүлде: Ford Mustang GT.",
        "Қосымша жүлделер: iPhone 17 Pro, PlayStation 5, AirPods Pro.",
        "Қатысушы кәмелетке толған (18+) болуы тиіс.",
        "Ұйымдастырушылар ережелерді өзгертуге құқылы."
      ]
    },
    ru: {
      title: "Условия участия",
      grandPrizeLabel: "Главный приз",
      rules: [
        "В розыгрыше могут участвовать только пользователи, купившие план 'Premium'.",
        "Каждому Premium пользователю присваивается уникальный номер билета.",
        "Результаты розыгрыша будут официально объявлены в мини-приложении через турнирный и VIP analytics разделы.",
        "Победитель будет определен с помощью генератора случайных чисел.",
        "Главный приз: Ford Mustang GT.",
        "Дополнительные призы: iPhone 17 Pro, PlayStation 5, AirPods Pro.",
        "Участник должен быть совершеннолетним (18+).",
        "Организаторы оставляют за собой право изменять правила."
      ]
    },
    en: {
      title: "Terms & Conditions",
      grandPrizeLabel: "Grand Prize",
      rules: [
        "Only users who purchased the 'Premium' plan can participate in the raffle.",
        "Each Premium user is assigned a unique ticket number.",
        "The raffle results will be officially announced inside the mini app through the tournament and VIP analytics sections.",
        "The winner will be determined using a random number generator.",
        "Grand Prize: Ford Mustang GT.",
        "Additional Prizes: iPhone 17 Pro, PlayStation 5, AirPods Pro.",
        "Participants must be of legal age (18+).",
        "Organizers reserve the right to modify the rules."
      ]
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1a1a1a] w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col max-h-[80vh]"
        >
           {/* Header */}
           <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-500/20 rounded-xl">
                 <FileText className="text-blue-500" size={24} />
               </div>
               <h2 className="text-xl font-bold text-white">
                 {content[activeTab].title}
               </h2>
             </div>
             <button 
               onClick={onClose}
               className="p-2 bg-white/5 rounded-full text-gray-400 hover:bg-white/10 transition-colors"
             >
               <X size={20} />
             </button>
           </div>

           {/* Language Tabs */}
           <div className="flex p-2 gap-2 bg-black/20 border-b border-white/5">
             {(['kz', 'ru', 'en'] as const).map((lang) => (
               <button
                 key={lang}
                 onClick={() => setActiveTab(lang)}
                 className={clsx(
                   "flex-1 py-2 rounded-lg text-sm font-bold transition-all uppercase flex items-center justify-center gap-2",
                   activeTab === lang 
                     ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                     : "bg-white/5 text-gray-400 hover:bg-white/10"
                 )}
               >
                 {lang === 'kz' ? '🇰🇿 KZ' : lang === 'ru' ? '🇷🇺 RU' : '🇺🇸 EN'}
               </button>
             ))}
           </div>

           {/* Content */}
           <div className="p-6 overflow-y-auto custom-scrollbar">
             <div className="space-y-4">
               {content[activeTab].rules.map((rule, index) => (
                 <div key={index} className="flex gap-3 items-start p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                   <CheckCircle className="text-green-500 min-w-[20px] mt-0.5" size={20} />
                   <p className="text-gray-300 text-sm leading-relaxed">{rule}</p>
                 </div>
               ))}
             </div>
             
            <div className="relative mt-8 overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-400/10 via-red-500/10 to-transparent p-5 text-center shadow-[0_18px_40px_rgba(245,158,11,0.12)]">
              <div className="absolute -left-6 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-yellow-300/20 blur-3xl" />
              <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-red-500/20 blur-2xl" />
              <div className="relative">
                <p className="text-yellow-400 text-[11px] font-bold uppercase tracking-[0.35em] mb-2">{content[activeTab].grandPrizeLabel}</p>
                <p className="text-3xl font-black uppercase tracking-[-0.08em] text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-yellow-300 drop-shadow-[0_0_18px_rgba(253,224,71,0.75)]">
                  Ford Mustang
                </p>
                <p className="mt-1 text-sm font-black uppercase tracking-[0.55em] text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.85)]">
                  GT
                </p>
              </div>
             </div>
           </div>

           {/* Footer */}
           <div className="p-4 border-t border-white/10 bg-white/5 flex flex-col gap-3">
             <div className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
               <Trophy size={20} />
               <span>VIP Analytics + Weekend Tournament</span>
             </div>
             <button 
               onClick={onClose}
               className="w-full py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
             >
               {activeTab === 'kz' ? 'Түсінікті' : activeTab === 'ru' ? 'Понятно' : 'Understood'}
             </button>
           </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
