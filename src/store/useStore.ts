import { getTelegramUser, MOCK_USER } from '../utils/telegram';

export type Language = 'en' | 'ru' | 'kz';
export type Theme = 'dark' | 'light' | 'blue';

interface GameResult {
  gameId: string;
  score: string | number;
  date: string;
  timestamp: number;
  coinsEarned: number;
}

interface UserProfile {
  id: number;
  gameId?: string; // Format like 17096844
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  level: number;
  xp: number;
  achievements: string[];
}

export interface Challenge {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  isClaimed: boolean;
  type: 'play_count' | 'total_coins';
}

export interface SocialTask {
  id: string;
  platform: 'youtube' | 'telegram' | 'instagram' | 'twitter' | 'other';
  url: string;
  reward: number;
  isClaimed: boolean;
}

export interface Feedback {
  id: string;
  userId: number;
  username: string;
  text: string;
  imageUrl?: string;
  date: string;
  status: 'new' | 'read' | 'resolved';
  adminReply?: string;
  replyDate?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'error' | 'guild' | 'mention' | 'dm';
  actionUrl?: string;
}

export interface DailyQuest {
  id: string;
  gamesPlayed: string[];
  isCompleted: boolean;
  isClaimed: boolean;
  lastResetDate: string | null;
}

export interface WeeklyQuest {
  id: string;
  gamesPlayed: number;
  targetGames: number;
  milestones: {
    gamesRequired: number;
    reward: { coins: number; crystals: number; energy: number };
    isClaimed: boolean;
  }[];
  lastResetDate: string | null;
}

export interface MysteryBox {
  id: string;
  type: 'coins' | 'crystals' | 'fec' | 'skin' | 'booster';
  amount: number;
  skinId?: string;
  boosterType?: 'freezes' | 'hints' | 'shields';
}

export interface DailyRewardStreak {
  count: number;
  lastClaimDate: string | null;
  claimedDates: string[];
}

export interface WeeklyChallenge {
  weekKey: string | null;
  dayProgress: Record<string, number>;
  completedDays: string[];
  isClaimed: boolean;
  reward: { coins: number };
}

export interface WeekendEvent {
  weekendKey: string | null;
  isActive: boolean;
  multiplier: number;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  eventName: string;
  eventDate: string;
  price: number;
  purchaseDate: string;
  userId: number;
  userName: string;
  isUsed: boolean;
}

export interface EventParticipant {
  ticketId: string;
  ticketNumber: number;
  userId: number;
  userName: string;
  userPhoto?: string;
  purchaseDate: string;
  isVerified: boolean;
}

export interface BrainStats {
  focus: number;
  memory: number;
  logic: number;
  speed: number;
  flexibility: number;
  combinedScore?: number;
  brainAge?: number;
  brainAgeColor?: 'green' | 'yellow' | 'red';
  dailyWorkoutPlayed?: boolean;
  dailyWorkoutModifier?: number;
}

export type TournamentPaymentMethod = 'ton' | 'vip' | 'ticket';
export interface TournamentGame {
  gameId: string;
  score: string | number;
  playedAt: string;
  tournamentBrainScore: number;
}

export interface TournamentState {
  weekKey: string | null;
  joinedAt: string | null;
  paymentMethod: TournamentPaymentMethod | null;
  games: TournamentGame[];
  score: number;
  vipFreeEntryWeek: string | null;
}

export interface UserState {
  language: Language;
  soundEnabled: boolean;
  theme: Theme;

  brainStats: BrainStats;

  user: UserProfile;

  coins: number;
  gems: number;
  hp: number;
  maxHp: number;
  fecBalance: number;
  skinInventory: string[];
  activeSkin: string;
  unclaimedLevelRewards: number[];
  usedPromocodes: string[];

  dailyGoalMinutes: number;
  streak: number;
  history: GameResult[];
  lastDailyGoalClaimDate: string | null;
  challenges: Challenge[];
  lastChallengeDate: string | null;

  socialTasks: SocialTask[];

  feedbacks: Feedback[];
  notifications: Notification[];

  dailyRewardStreak: DailyRewardStreak;
  weeklyChallenge: WeeklyChallenge;
  weekendEvent: WeekendEvent;
  tournamentTickets: number;

  plan: 'free' | 'silver' | 'gold' | 'basic' | 'pro' | 'premium';

  tickets: Ticket[];
  eventParticipants: EventParticipant[];
  planExpiry: number | null;

  promotionEndISO: string | null;

  dailyQuest: DailyQuest;

  weeklyQuest: WeeklyQuest;

  inventory: {
    freezes: number;
    hints: number;
    shields: number;
  };

  energy: number;
  maxEnergy: number;
  lastEnergyRegenTime: number | null;
  streakProtection: number;
  mysteryBoxAvailable: boolean;
  mysteryBoxPrice: number;
  tournament: TournamentState;

  setLanguage: (lang: Language) => void;
  toggleSound: () => void;
  setTheme: (theme: Theme) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  syncUserFromTelegram: () => void;
  addGameResult: (result: Omit<GameResult, 'date' | 'timestamp'>) => void;
  fetchEntitlements: () => Promise<void>;
  buySkin: (skinId: string, cost: number) => boolean;
  equipSkin: (skinId: string) => void;

  buyBooster: (type: 'freezes' | 'hints' | 'shields', cost: number) => boolean;
  consumeBooster: (type: 'freezes' | 'hints' | 'shields') => boolean;

  claimDailyReward: (amount: number) => void;
  claimDailyLoginReward: () => { success: boolean; reward: { coins: number; gems: number; xp: number; tournamentTickets: number } };
  redeemPromocode: (code: string) => { success: boolean; message: string };

  refreshChallenges: () => void;
  claimChallengeReward: (challengeId: string) => void;
  watchAd: (reward: number) => void;
  fetchSocialTasks: () => Promise<void>;
  claimSocialTask: (taskId: string) => Promise<void>;
  addFec: (amount: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  claimLevelReward: (level: number) => void;
  decrementHp: () => boolean;
  restoreHp: (amount: number) => void;

  addFeedback: (feedback: Omit<Feedback, 'id' | 'date' | 'status'>) => void;
  updateFeedbackStatus: (id: string, status: 'read' | 'resolved') => void;
  replyToFeedback: (feedbackId: string, reply: string) => void;
  markNotificationRead: (id: string) => void;

  updateBrainStats: (gameId: string, score: number) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  purchaseTicket: (eventName: string, eventDate: string, price: number) => { success: boolean; ticketNumber?: number };
  verifyTicket: (ticketNumber: number) => boolean;
  getEventParticipants: () => EventParticipant[];
  updateTicketsEventDate: (newDateISO: string) => void;
  setPromotionEndISO: (newDateISO: string) => void;
  extendPromotionEnd: (days: number, hour?: number) => void;
  checkDailyQuestComplete: () => boolean;
  claimDailyQuestReward: () => void;
  logout: () => void;

  consumeEnergy: (amount: number) => boolean;
  addEnergy: (amount: number) => void;
  buyEnergyPack: () => boolean;
  getEnergyRegenRate: () => number;
  updateEnergyRegen: () => void;

  useStreakProtection: () => boolean;
  buyStreakProtection: () => boolean;

  openMysteryBox: () => MysteryBox | null;
  setMysteryBoxAvailable: (available: boolean) => void;

  updateWeeklyQuest: () => void;
  claimWeeklyQuestMilestone: (milestoneIndex: number) => boolean;
  joinTournament: (paymentMethod: TournamentPaymentMethod) => { success: boolean; message: string };
  claimWeeklyChallengeReward: () => boolean;

  saveAvatarImage: (imageData: string) => Promise<void>;
  loadAvatarImage: () => Promise<string | null>;
  isPremiumAvatar: (avatarId: string) => boolean;
  canUseAvatar: (avatarId: string) => boolean;
}

const tgUser = getTelegramUser();
export const initialUserRaw = tgUser || (import.meta.env.DEV ? MOCK_USER : {
  id: 0,
  first_name: 'Guest',
  last_name: '',
  username: '',
  photo_url: ''
});
export const generateGameId = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

export const generateDailyChallenges = (): Challenge[] => [
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

export const initialSocialTasks: SocialTask[] = [
  {
    id: 'yt_founding',
    platform: 'youtube',
    url: 'https://www.youtube.com/@founding.01',
    reward: 10,
    isClaimed: false
  },
  {
    id: 'ig_founding',
    platform: 'instagram',
    url: 'https://www.instagram.com/focus_game_clube?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
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

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initDataUnsafe?: {
        user?: {
          language_code?: string;
        };
      };
    };
  };
};

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'ru';
  
  const tg = (window as TelegramWindow).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user?.language_code) {
    const tgLang = tg.initDataUnsafe.user.language_code.toLowerCase();
    if (tgLang === 'ru') return 'ru';
    if (tgLang === 'kk' || tgLang === 'kz' || tgLang === 'ky') return 'kz';
    if (tgLang === 'en') return 'en';
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ru')) return 'ru';
    if (browserLang.startsWith('kk') || browserLang.startsWith('kz') || browserLang.startsWith('ky')) return 'kz';
  }
  
  return 'ru';
};

export const initialState = {
  language: getInitialLanguage(),
  soundEnabled: true,
  theme: 'blue' as Theme,
  brainStats: { focus: 20, memory: 20, logic: 20, speed: 20, flexibility: 20 },
  coins: 100,
  gems: 0,
  fecBalance: 0,
  skinInventory: ['default'],
  activeSkin: 'default',
  unclaimedLevelRewards: [],
  usedPromocodes: [],
  dailyGoalMinutes: 10,
  streak: 0,
  history: [],
  dailyRewardStreak: { count: 0, lastClaimDate: null, claimedDates: [] } as DailyRewardStreak,
  weeklyChallenge: {
    weekKey: null,
    dayProgress: {},
    completedDays: [],
    isClaimed: false,
    reward: { coins: 250 },
  } as WeeklyChallenge,
  weekendEvent: { weekendKey: null, isActive: false, multiplier: 1 } as WeekendEvent,
  tournamentTickets: 0,
  challenges: generateDailyChallenges(),
  lastChallengeDate: new Date().toISOString().split('T')[0],
  socialTasks: initialSocialTasks,
  feedbacks: [],
  notifications: [],
  plan: 'free' as 'free' | 'silver' | 'gold' | 'basic' | 'pro' | 'premium',
  planExpiry: null,
  hp: 100,
  maxHp: 100,
  
  tickets: [],
  eventParticipants: [],
  promotionEndISO: '2026-04-26T08:00:00.000Z',
  dailyQuest: {
    id: 'daily_quest_3games',
    gamesPlayed: [],
    isCompleted: false,
    isClaimed: false,
    lastResetDate: null
  },
  weeklyQuest: {
    id: 'weekly_quest_10games',
    gamesPlayed: 0,
    targetGames: 10,
    milestones: [
      { gamesRequired: 2, reward: { coins: 50, crystals: 0, energy: 0 }, isClaimed: false },
      { gamesRequired: 4, reward: { coins: 50, crystals: 2, energy: 0 }, isClaimed: false },
      { gamesRequired: 6, reward: { coins: 50, crystals: 0, energy: 10 }, isClaimed: false },
      { gamesRequired: 8, reward: { coins: 100, crystals: 0, energy: 0 }, isClaimed: false },
      { gamesRequired: 10, reward: { coins: 100, crystals: 5, energy: 20 }, isClaimed: false }
    ],
    lastResetDate: null
  },
  inventory: { freezes: 0, hints: 0, shields: 0 },
  energy: 100,
  maxEnergy: 100,
  lastEnergyRegenTime: Date.now(),
  streakProtection: 0,
  mysteryBoxAvailable: true,
  mysteryBoxPrice: 500,
  tournament: {
    weekKey: null,
    joinedAt: null,
    paymentMethod: null,
    games: [],
    score: 0,
    vipFreeEntryWeek: null
  }
};
