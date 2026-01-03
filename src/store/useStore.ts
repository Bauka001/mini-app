import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTelegramUser, MOCK_USER } from '../utils/telegram';

export type Language = 'en' | 'ru' | 'kz';
export type Theme = 'dark' | 'light' | 'gold';

interface GameResult {
  gameId: string;
  score: string | number;
  date: string;
  timestamp: number;
  coinsEarned: number;
}

interface UserProfile {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  level: number;
  xp: number;
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

interface UserState {
  language: Language;
  soundEnabled: boolean;
  theme: Theme;
  
  // User Profile
  user: UserProfile;

  // Economy
  coins: number;
  gems: number; // Added gems currency
  fecBalance: number; // New Crypto Token
  inventory: string[]; // List of owned skin IDs
  activeSkin: string;
  unclaimedLevelRewards: number[]; // Track which level rewards are waiting to be claimed

  // Progress
  dailyGoalMinutes: number;
  streak: number;
  history: GameResult[];
  lastDailyGoalClaimDate: string | null;
  challenges: Challenge[];
  lastChallengeDate: string | null;
  
  // Social Tasks
  socialTasks: SocialTask[];

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
  spendCoins: (amount: number) => boolean;
  claimLevelReward: (level: number) => void;
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
      theme: 'dark',
      
      user: {
        id: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
        level: 1,
        xp: 0
      },

      coins: 100,
      gems: 0, // Initial gems
      fecBalance: 0,
      inventory: ['default'],
      activeSkin: 'default',
      unclaimedLevelRewards: [],

      dailyGoalMinutes: 10,
      streak: 0,
      history: [],
      lastDailyGoalClaimDate: null,
      challenges: generateDailyChallenges(),
      lastChallengeDate: new Date().toISOString().split('T')[0],
      
      socialTasks: initialSocialTasks,

      plan: 'free',
      planExpiry: null,

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
        
        // Check for level up
        let newUnclaimedRewards = [...(state.unclaimedLevelRewards || [])];
        if (newLevel > state.user.level) {
          for (let l = state.user.level + 1; l <= newLevel; l++) {
            if (!newUnclaimedRewards.includes(l)) {
              newUnclaimedRewards.push(l);
            }
          }
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
            level: newLevel
          },
          challenges: updatedChallenges,
          unclaimedLevelRewards: newUnclaimedRewards
        };
      }),

      upgradePlan: (plan, days) => set({
        plan,
        planExpiry: Date.now() + days * 24 * 60 * 60 * 1000
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
      
      claimDailyReward: (amount) => set((state) => ({
        coins: state.coins + amount,
        lastDailyGoalClaimDate: new Date().toISOString().split('T')[0]
      })),

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
    }),
    {
      name: 'focus-storage-v9', // Bump version to reset state and avoid conflicts
      // Note: Since we added 'gems' and 'socialTasks', existing users might have undefined values.
      // Zustand persist usually merges, but for arrays/new primitives it might need care.
      // We will rely on default values or manual migration logic if this was a production app with critical data.
      // For now, version bump is safest to ensure new structure is used.
    }
  )
);
