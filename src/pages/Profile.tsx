import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Edit2, Trophy, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUserProfile, history, unclaimedLevelRewards, claimLevelReward } = useStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [username, setUsername] = useState(user.username || '');

  const handleSave = () => {
    updateUserProfile({
      firstName,
      username
    });
    setIsEditing(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateUserProfile({ photoUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClaimReward = (level: number) => {
    claimLevelReward(level);
    WebApp.HapticFeedback.notificationOccurred('success');
    alert(`Level ${level} Rewards Claimed! +100 Coins, +5 Gems`);
  };

  return (
    <div className="min-h-screen bg-black text-white relative pb-20">
      {/* Background Glow */}
      <div className="fixed top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="p-4 flex items-center justify-between relative z-10 sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{t('profile', 'Profile')}</h1>
        
        {isEditing ? (
          <button 
            onClick={handleSave}
            className="text-primary font-bold text-sm bg-primary/10 px-3 py-1 rounded-lg"
          >
            {t('save', 'Save')}
          </button>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-primary"
          >
            <Edit2 size={20} />
          </button>
        )}
      </div>

      <div className="p-6 flex flex-col items-center relative z-10">
        {/* Avatar */}
        <div className="relative mb-6 group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />
          <div className="w-32 h-32 rounded-full p-[3px] bg-gradient-to-tr from-primary to-orange-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
              <img 
                src={user.photoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
              {isEditing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors z-20"
                >
                  <Camera size={32} className="text-white" />
                </button>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 right-0 bg-gray-900 border border-white/10 p-2 rounded-full shadow-lg z-20 flex items-center gap-1 px-3">
             <Trophy size={12} className="text-yellow-500" />
            <span className="text-xs font-bold text-white">Lvl {user.level}</span>
          </div>
        </div>

        {/* Info Form */}
        <div className="w-full max-w-sm space-y-6">
          
          {/* Level Rewards */}
          {(unclaimedLevelRewards || []).length > 0 && (
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-4 rounded-2xl shadow-lg animate-pulse">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <Gift size={20} />
                Level Up Rewards Available!
              </h3>
              <div className="space-y-2">
                {unclaimedLevelRewards.map(level => (
                  <div key={level} className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                    <span className="text-sm font-bold text-white">Level {level} Reward</span>
                    <button 
                      onClick={() => handleClaimReward(level)}
                      className="px-3 py-1 bg-white text-orange-600 text-xs font-bold rounded-lg hover:scale-105 transition-transform"
                    >
                      Claim
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1 mb-1 block">
                Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
              ) : (
                <div className="text-2xl font-bold text-white px-1">{user.firstName}</div>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1 mb-1 block">
                {t('username', 'Username')}
              </label>
              {isEditing ? (
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              ) : (
                <div className="text-lg text-primary px-1 font-mono">@{user.username || 'username'}</div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center hover:bg-white/10 transition-colors">
              <span className="text-3xl font-black text-white">{user.xp}</span>
              <span className="text-xs text-gray-400 uppercase font-bold">Total XP</span>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center hover:bg-white/10 transition-colors">
              <span className="text-3xl font-black text-white">{user.level}</span>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('level', 'Level')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
