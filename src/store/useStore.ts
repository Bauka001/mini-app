import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'ru' | 'kz';
export type Theme = 'dark' | 'light';

interface GameResult {
  gameId: string;
  score: string | number;
  date: string;
  timestamp: number;
  coinsEarned: number;
}

interface UserState {
  language: Language;
  soundEnabled: boolean;
  theme: Theme;
  
  // Economy
  coins: number;
  inventory: string[]; // List of owned skin IDs
  activeSkin: string;

  // Progress
  dailyGoalMinutes: number;
  streak: number;
  history: GameResult[];
  
  // Monetization (Real money plans)
  plan: 'free' | 'silver' | 'gold' | 'premium';
  planExpiry: number | null;
  
  // Actions
  setLanguage: (lang: Language) => void;
  toggleSound: () => void;
  setTheme: (theme: Theme) => void;
  addGameResult: (result: Omit<GameResult, 'date' | 'timestamp'>) => void;
  upgradePlan: (plan: 'silver' | 'gold' | 'premium', days: number) => void;
  buySkin: (skinId: string, cost: number) => boolean;
  equipSkin: (skinId: string) => void;
}

export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      language: 'kz', // Default to KZ as requested
      soundEnabled: true,
      theme: 'dark',
      
      coins: 100, // Starting bonus
      inventory: ['default'],
      activeSkin: 'default',

      dailyGoalMinutes: 10,
      streak: 0,
      history: [],
      
      plan: 'free',
      planExpiry: null,

      setLanguage: (language) => set({ language }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setTheme: (theme) => set({ theme }),
      
      addGameResult: (result) => set((state) => ({
        coins: state.coins + result.coinsEarned,
        history: [
          ...state.history,
          {
            ...result,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
          }
        ]
      })),

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
    }),
    {
      name: 'focus-storage-v2', // Changed version to reset/update store structure
    }
  )
);
