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
  platform: 'instagram' | 'youtube' | 'telegram';
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

  dailyRewardStreak: number;
  lastDailyRewardDate: string | null;

  plan: 'free' | 'silver' | 'gold' | 'premium';

  tickets: Ticket[];
  eventParticipants: EventParticipant[];
  planExpiry: number | null;

  promotionEndISO: string | null;

  dailyQuest: DailyQuest;

  inventory: {
    freezes: number;
    hints: number;
    shields: number;
  };

  setLanguage: (lang: Language) => void;
  toggleSound: () => void;
  setTheme: (theme: Theme) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  syncUserFromTelegram: () => void;
  addGameResult: (result: Omit<GameResult, 'date' | 'timestamp'>) => void;
  upgradePlan: (plan: 'silver' | 'gold' | 'premium', days: number) => void;
  buySkin: (skinId: string, cost: number) => boolean;
  equipSkin: (skinId: string) => void;

  buyBooster: (type: 'freezes' | 'hints' | 'shields', cost: number) => boolean;
  consumeBooster: (type: 'freezes' | 'hints' | 'shields') => boolean;

  claimDailyReward: (amount: number) => void;
  redeemPromocode: (code: string) => { success: boolean; message: string };

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
    id: 'ig_bauka',
    platform: 'instagram',
    url: 'https://www.instagram.com/focus_game_clube/?utm_source=ig_web_button_share_sheet',
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

export const initialState = {
  language: 'ru' as Language,
  soundEnabled: true,
  theme: 'light' as Theme,
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
  lastDailyRewardDate: null,
  challenges: generateDailyChallenges(),
  lastChallengeDate: new Date().toISOString().split('T')[0],
  socialTasks: initialSocialTasks,
  feedbacks: [],
  notifications: [],
  plan: 'free' as 'free' | 'silver' | 'gold' | 'premium',
  planExpiry: null,
  hp: 100,
  maxHp: 100,
  dailyRewardStreak: 0,
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
  inventory: { freezes: 0, hints: 0, shields: 0 }
};

