import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTelegramUser, MOCK_USER } from '../utils/telegram';

export type Language = 'en' | 'ru' | 'kz';
export type Theme = 'dark' | 'light' | 'gold' | 'blue';

interface GameResult {
  gameId: string;
  score: string | number;
  date: string;
  timestamp: number;
  coinsEarned: number;
}

export interface GuildMember {
  id: string;
  name: string;
  score: number;
}

export interface GuildMessage {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  isBot?: boolean;
}

export interface Guild {
  id: string;
  name: string;
  creatorId: string;
  emblem: string;
  description: string;
  members: GuildMember[];
  messages: GuildMessage[];
  totalScore: number;
}

interface UserProfile {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  guildId?: string | null;
  level: number;
  xp: number;
  achievements: string[]; // List of unlocked achievement IDs
}

export interface Challenge {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  isClaimed: boolean;
  type: 'play_count' | 'total_coins'; // simplified types
}

export interface SocialTask {
  id: string;
  platform: 'instagram' | 'youtube' | 'telegram';
  url: string;
  reward: number; // gems (crystals)
  isClaimed: boolean;
}

export interface BrainStats {
  focus: number;
  memory: number;
  logic: number;
  speed: number;
  flexibility: number;
}

interface UserState {
  language: Language;
  soundEnabled: boolean;
  theme: Theme;
  
  // Brain Stats
  brainStats: BrainStats;

  // User Profile
  user: UserProfile;

  // Economy
  coins: number;
  gems: number; // Added gems currency
  hp: number; // Health Points
  maxHp: number;
  fecBalance: number; // New Crypto Token
  inventory: string[]; // List of owned skin IDs
  activeSkin: string;
  unclaimedLevelRewards: number[]; // Track which level rewards are waiting to be claimed

  // Guild
  currentGuild: Guild | null;

  // Progress
  dailyGoalMinutes: number;
  streak: number;
  history: GameResult[];
  lastDailyGoalClaimDate: string | null;
  challenges: Challenge[];
  lastChallengeDate: string | null;
  
  // Social Tasks
  socialTasks: SocialTask[];

  // Daily Login Rewards
  dailyRewardStreak: number;
  lastDailyRewardDate: string | null;

  // Monetization (Real money plans)
  plan: 'free' | 'silver' | 'gold' | 'premium';
  planExpiry: number | null;
  
  // Actions
  setLanguage: (lang: Language) => void;
  toggleSound: () => void;
  setTheme: (theme: Theme) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  addGameResult: (result: Omit<GameResult, 'date' | 'timestamp'>) => void;
  upgradePlan: (plan: 'silver' | 'gold' | 'premium', days: number) => void;
  buySkin: (skinId: string, cost: number) => boolean;
  equipSkin: (skinId: string) => void;
  claimDailyReward: (amount: number) => void;
  
  // New Actions
  refreshChallenges: () => void;
  claimChallengeReward: (challengeId: string) => void;
  watchAd: (reward: number) => void;
  claimSocialReward: (taskId: string) => void;
  addFec: (amount: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  claimLevelReward: (level: number) => void;
  decrementHp: () => boolean;
  restoreHp: (amount: number) => void;
  
  // Guild Actions
  joinGuild: (guild: Guild) => void;
  leaveGuild: () => void;
  updateGuild: (guild: Guild) => void;
  updateBrainStats: (gameId: string, score: number) => void;
}

const telegramUser = getTelegramUser() || MOCK_USER;

const generateDailyChallenges = (): Challenge[] => [
  {
    id: '1',
    description: 'Play 5 games',
    target: 5,
    current: 0,
    reward: 50,
    isClaimed: false,
    type: 'play_count'
  },
  {
    id: '2',
    description: 'Earn 100 coins',
    target: 100,
    current: 0,
    reward: 100,
    isClaimed: false,
    type: 'total_coins'
  },
  {
    id: '3',
    description: 'Play 10 games',
    target: 10,
    current: 0,
    reward: 150,
    isClaimed: false,
    type: 'play_count'
  }
];

const initialSocialTasks: SocialTask[] = [
  {
    id: 'ig_bauka',
    platform: 'instagram',
    url: 'https://www.instagram.com/bauka02.35?igsh=YnJiOHIxaXhkNmk4',
    reward: 10,
    isClaimed: false
  },
  {
    id: 'yt_founding',
    platform: 'youtube',
    url: 'https://www.youtube.com/@founding.01',
    reward: 10,
    isClaimed: false
  },
  {
    id: 'tg_founding',
    platform: 'telegram',
    url: 'https://t.me/+od_Mx-6Iz3Q3NWEy',
    reward: 10,
    isClaimed: false
  }
];

export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      language: 'kz',
      soundEnabled: true,
      theme: 'light',
      
      brainStats: {
        focus: 20,
        memory: 20,
        logic: 20,
        speed: 20,
        flexibility: 20
      },

      user: {
        id: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
        guildId: null,
        level: 1,
        xp: 0,
        achievements: []
      },

      coins: 100,
      gems: 0, // Initial gems
      fecBalance: 0,
      inventory: ['default'],
      activeSkin: 'default',
      unclaimedLevelRewards: [],
      
      currentGuild: null,

      dailyGoalMinutes: 10,
      streak: 0,
      history: [],
      lastDailyGoalClaimDate: null,
      challenges: generateDailyChallenges(),
      lastChallengeDate: new Date().toISOString().split('T')[0],
      
      socialTasks: initialSocialTasks,

      plan: 'free',
      planExpiry: null,
      hp: 100,
      maxHp: 100,

      dailyRewardStreak: 0,
      lastDailyRewardDate: null,

      setLanguage: (language) => set({ language }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setTheme: (theme) => set({ theme }),
      
      updateUserProfile: (data) => set((state) => ({
        user: { ...state.user, ...data }
      })),

      addGameResult: (result) => set((state) => {
        const xpGained = result.coinsEarned;
        const newXp = state.user.xp + xpGained;
        const newLevel = Math.floor(newXp / 1000) + 1;
        
        // Update Brain Stats
        const newStats = { ...state.brainStats };
        const increment = 1; // Points per game

        switch (result.gameId) {
          case 'schulte':
          case 'odd_one':
            newStats.focus = Math.min(100, newStats.focus + increment);
            newStats.speed = Math.min(100, newStats.speed + increment);
            break;
          case 'memory':
          case 'pairs':
            newStats.memory = Math.min(100, newStats.memory + increment);
            newStats.focus = Math.min(100, newStats.focus + increment);
            break;
          case 'math':
          case '2048':
            newStats.logic = Math.min(100, newStats.logic + increment);
            newStats.speed = Math.min(100, newStats.speed + increment);
            break;
          case 'stroop':
          case 'tetris':
            newStats.flexibility = Math.min(100, newStats.flexibility + increment);
            newStats.focus = Math.min(100, newStats.focus + increment);
            break;
        }
        
        // Check for level up
        let newUnclaimedRewards = [...(state.unclaimedLevelRewards || [])];
        if (newLevel > state.user.level) {
          for (let l = state.user.level + 1; l <= newLevel; l++) {
            if (!newUnclaimedRewards.includes(l)) {
              newUnclaimedRewards.push(l);
            }
          }
        }

        // Check for achievements
        const newAchievements = [...(state.user.achievements || [])];
        const gameCount = state.history.length + 1;
        
        if (gameCount >= 1 && !newAchievements.includes('first_game')) {
          newAchievements.push('first_game');
        }
        if (gameCount >= 10 && !newAchievements.includes('gamer_10')) {
          newAchievements.push('gamer_10');
        }
        if (gameCount >= 50 && !newAchievements.includes('pro_gamer')) {
          newAchievements.push('pro_gamer');
        }
        if (newXp >= 5000 && !newAchievements.includes('xp_master')) {
          newAchievements.push('xp_master');
        }

        // Update challenges
        const updatedChallenges = state.challenges.map(ch => {
          if (ch.isClaimed) return ch;
          if (ch.type === 'play_count') return { ...ch, current: ch.current + 1 };
          if (ch.type === 'total_coins') return { ...ch, current: ch.current + result.coinsEarned };
          return ch;
        });

        return {
          coins: state.coins + result.coinsEarned,
          history: [
            ...state.history,
            {
              ...result,
              date: new Date().toISOString().split('T')[0],
              timestamp: Date.now(),
            }
          ],
          user: {
            ...state.user,
            xp: newXp,
            level: newLevel,
            achievements: newAchievements
          },
          challenges: updatedChallenges,
          unclaimedLevelRewards: newUnclaimedRewards,
          brainStats: newStats
        };
      }),

      upgradePlan: (plan, days) => set((state) => {
        const currentPlan = state.plan;
        const currentExpiry = state.planExpiry || Date.now();
        let newExpiry = currentExpiry;
        
        if (plan !== currentPlan) {
          newExpiry = Date.now() + days * 24 * 60 * 60 * 1000;
        } else {
          newExpiry = currentExpiry + days * 24 * 60 * 60 * 1000;
        }

        return {
          plan,
          planExpiry: newExpiry,
          hp: state.maxHp
        };
      }),

      buySkin: (skinId, cost) => {
        const { coins, inventory } = get();
        if (coins >= cost && !inventory.includes(skinId)) {
          set({ 
            coins: coins - cost, 
            inventory: [...inventory, skinId] 
          });
          return true;
        }
        return false;
      },

      equipSkin: (skinId) => set({ activeSkin: skinId }),
      
      claimDailyLoginReward: () => {
        const { lastDailyRewardDate, dailyRewardStreak, coins, gems, user } = get();
        const today = new Date().toISOString().split('T')[0];
        
        if (lastDailyRewardDate === today) {
          return { success: false, reward: { coins: 0, gems: 0, xp: 0 } };
        }

        let newStreak = dailyRewardStreak;
        // Check if missed a day (allow 48h window basically, or just check previous date string)
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (lastDailyRewardDate === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1; // Reset if streak broken or first time
        }
        
        // Cap streak at 7 for visual cycle, but can keep counting internally if needed
        // For rewards logic let's cycle 1-7
        const dayInCycle = ((newStreak - 1) % 7) + 1;
        
        let rewardCoins = 50 * dayInCycle;
        let rewardGems = dayInCycle === 7 ? 10 : (dayInCycle >= 3 ? 2 : 0);
        let rewardXp = 20 * dayInCycle;

        // Big bonus for day 7
        if (dayInCycle === 7) {
          rewardCoins = 1000;
          rewardGems = 20;
          rewardXp = 500;
        }

        set({
          coins: coins + rewardCoins,
          gems: (gems || 0) + rewardGems,
          user: { ...user, xp: user.xp + rewardXp },
          dailyRewardStreak: newStreak,
          lastDailyRewardDate: today
        });

        return { success: true, reward: { coins: rewardCoins, gems: rewardGems, xp: rewardXp } };
      },

      refreshChallenges: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastChallengeDate } = get();
        if (lastChallengeDate !== today) {
          set({ 
            challenges: generateDailyChallenges(),
            lastChallengeDate: today
          });
        }
      },

      claimChallengeReward: (challengeId) => set((state) => {
        const challenge = state.challenges.find(c => c.id === challengeId);
        if (!challenge || challenge.isClaimed || challenge.current < challenge.target) return state;

        return {
          coins: state.coins + challenge.reward,
          challenges: state.challenges.map(c => 
            c.id === challengeId ? { ...c, isClaimed: true } : c
          )
        };
      }),

      watchAd: (reward) => set((state) => ({
        coins: state.coins + reward
      })),

      claimSocialReward: (taskId) => set((state) => {
        const task = state.socialTasks.find(t => t.id === taskId);
        // Only claim if not already claimed
        if (!task || task.isClaimed) return state;

        return {
          gems: (state.gems || 0) + task.reward,
          socialTasks: state.socialTasks.map(t => 
            t.id === taskId ? { ...t, isClaimed: true } : t
          )
        };
      }),

      addFec: (amount) => set((state) => ({
        fecBalance: (state.fecBalance || 0) + amount
      })),
      addCoins: (amount) => set((state) => ({
        coins: (state.coins || 0) + amount
      })),

      spendCoins: (amount) => {
        const { coins } = get();
        if (coins >= amount) {
          set({ coins: coins - amount });
          return true;
        }
        return false;
      },
      claimLevelReward: (level) => set((state) => ({
        unclaimedLevelRewards: state.unclaimedLevelRewards.filter(l => l !== level),
        // Reward: 100 coins + 5 gems per level
        coins: state.coins + 100,
        gems: (state.gems || 0) + 5
      })),
      decrementHp: () => {
        const { hp } = get();
        if (hp > 0) {
          set({ hp: hp - 1 });
          return true;
        }
        return false;
      },
      restoreHp: (amount) => set((state) => ({
        hp: Math.min(state.hp + amount, state.maxHp)
      })),
      
      joinGuild: (guild) => set((state) => ({
        currentGuild: guild,
        user: { ...state.user, guildId: guild.id }
      })),
      leaveGuild: () => set((state) => ({
        currentGuild: null,
        user: { ...state.user, guildId: null }
      })),
      updateGuild: (guild) => set({ currentGuild: guild })
    }),
    {
      name: 'focus-storage-v12', // Bump version for Guilds Persistence
    }
  )
);
