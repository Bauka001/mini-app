import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getTelegramUser, MOCK_USER } from '../utils/telegram';
import { telegramStorage } from './storage';

export type Language = 'en' | 'ru' | 'kz';
export type Theme = 'dark' | 'light' | 'gold' | 'blue';

interface GameResult {
  gameId: string;
  score: string | number;
  date: string;
  timestamp: number;
  coinsEarned: number;
}

export type GuildRole = 'Leader' | 'Officer' | 'Member' | 'Newbie';

export interface GuildMember {
  id: string;
  name: string;
  score: number;
  role: GuildRole;
  contribution: number;
  joinedAt: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface GuildMessage {
  id: number;
  sender: string;
  senderId: string;
  text: string;
  timestamp: string;
  isBot?: boolean;
  reactions?: MessageReaction[];
  isPinned?: boolean;
  mentions?: string[];
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name?: string;
  }[];
}

export interface GuildQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  type: 'play_count' | 'total_coins' | 'total_score' | 'members_active';
  isClaimed: boolean;
  deadline: string;
}

export interface GuildTournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  participants: string[];
  leaderboard: Array<{ guildId: string; score: number; rank: number }>;
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
  treasury: number;
  quests: GuildQuest[];
  tournaments?: GuildTournament[];
  createdAt: string;
  rank?: number;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  reactions?: MessageReaction[];
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name?: string;
  }[];
}

export interface PrivateChat {
  userId: string;
  userName: string;
  userPhoto?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: PrivateMessage[];
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

interface UserState {
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

  currentGuild: Guild | null;
  allGuilds: Guild[];
  guildRankings: Guild[];

  privateChats: PrivateChat[];
  activePrivateChat: string | null;

  dailyGoalMinutes: number;
  streak: number;
  history: GameResult[];
  lastDailyGoalClaimDate: string | null;
  challenges: Challenge[];
  lastChallengeDate: string | null;

  socialTasks: SocialTask[];

  adminIds: number[];
  feedbacks: Feedback[];
  notifications: Notification[];

  dailyRewardStreak: number;
  lastDailyRewardDate: string | null;

  plan: 'free' | 'silver' | 'gold' | 'premium';

  tickets: Ticket[];
  eventParticipants: EventParticipant[];
  planExpiry: number | null;

  promotionEndISO: string | null;

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

  joinGuild: (guild: Guild) => void;
  leaveGuild: () => void;
  updateGuild: (guild: Guild) => void;
  updateBrainStats: (gameId: string, score: number) => void;

  createGuild: (name: string, emblem: string, description: string) => Guild;
  updateAllGuilds: (guilds: Guild[]) => void;
  updateGuildRankings: () => void;

  promoteMember: (memberId: string, newRole: GuildRole) => void;
  demoteMember: (memberId: string, newRole: GuildRole) => void;
  removeMember: (memberId: string) => void;

  addGuildMessage: (message: Omit<GuildMessage, 'id' | 'timestamp'>) => void;
  pinGuildMessage: (messageId: number) => void;
  unpinGuildMessage: (messageId: number) => void;
  addGuildMessageReaction: (messageId: number, emoji: string) => void;
  removeGuildMessageReaction: (messageId: number, emoji: string) => void;

  donateToTreasury: (amount: number) => void;
  claimGuildReward: (questId: string) => void;

  createPrivateChat: (userId: string, userName: string, userPhoto?: string) => void;
  sendPrivateMessage: (receiverId: string, text: string) => void;
  markPrivateChatAsRead: (userId: string) => void;
  deletePrivateMessage: (messageId: string) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  purchaseTicket: (eventName: string, eventDate: string, price: number) => { success: boolean; ticketNumber?: number };
  verifyTicket: (ticketNumber: number) => boolean;
  getEventParticipants: () => EventParticipant[];
  updateTicketsEventDate: (newDateISO: string) => void;
  setPromotionEndISO: (newDateISO: string) => void;
  extendPromotionEnd: (days: number, hour?: number) => void;
}

const tgUser = getTelegramUser();
const initialUserRaw = tgUser || (import.meta.env.DEV ? MOCK_USER : {
  id: 0,
  first_name: 'Guest',
  last_name: '',
  username: '',
  photo_url: ''
});
const ADMIN_IDS = [initialUserRaw.id, 123456789];

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

const mockGuilds: Guild[] = [
  {
    id: '1',
    name: 'Brain Masters',
    creatorId: '1',
    emblem: '🧠',
    description: 'The smartest players united!',
    members: [
      { id: '1', name: 'Alex', score: 1500, role: 'Leader', contribution: 500, joinedAt: '2024-01-01' },
      { id: '2', name: 'Maria', score: 1200, role: 'Officer', contribution: 300, joinedAt: '2024-01-05' },
      { id: '3', name: 'John', score: 800, role: 'Member', contribution: 200, joinedAt: '2024-01-10' },
    ],
    messages: [],
    totalScore: 3500,
    treasury: 5000,
    quests: [],
    createdAt: '2024-01-01',
    rank: 1
  },
  {
    id: '2',
    name: 'Focus Warriors',
    creatorId: '4',
    emblem: '⚔️',
    description: 'Focus leads to victory!',
    members: [
      { id: '4', name: 'Kate', score: 1300, role: 'Leader', contribution: 450, joinedAt: '2024-01-02' },
      { id: '5', name: 'Mike', score: 900, role: 'Member', contribution: 150, joinedAt: '2024-01-08' },
    ],
    messages: [],
    totalScore: 2200,
    treasury: 3000,
    quests: [],
    createdAt: '2024-01-02',
    rank: 2
  },
  {
    id: '3',
    name: 'Quick Thinkers',
    creatorId: '6',
    emblem: '⚡',
    description: 'Speed is our strength!',
    members: [
      { id: '6', name: 'Tom', score: 1100, role: 'Leader', contribution: 400, joinedAt: '2024-01-03' },
    ],
    messages: [],
    totalScore: 1100,
    treasury: 2000,
    quests: [],
    createdAt: '2024-01-03',
    rank: 3
  }
];

export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      language: 'ru',
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
        id: initialUserRaw.id,
        firstName: initialUserRaw.first_name,
        lastName: initialUserRaw.last_name,
        username: initialUserRaw.username,
        photoUrl: initialUserRaw.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initialUserRaw.first_name}`,
        guildId: null,
        level: 1,
        xp: 0,
        achievements: []
      },

      syncUserFromTelegram: () => {
        const currentUser = getTelegramUser();
        if (currentUser) {
          set((state) => {
            const isDifferentUser = state.user.id !== currentUser.id;
            if (isDifferentUser) {
              return {
                language: 'ru',
                soundEnabled: true,
                theme: 'light',
                brainStats: { focus: 20, memory: 20, logic: 20, speed: 20, flexibility: 20 },
                user: {
                  id: currentUser.id,
                  firstName: currentUser.first_name,
                  lastName: currentUser.last_name,
                  username: currentUser.username,
                  photoUrl: currentUser.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.first_name}`,
                  guildId: null,
                  level: 1,
                  xp: 0,
                  achievements: []
                },
                coins: 100,
                gems: 0,
                fecBalance: 0,
                skinInventory: ['default'],
                activeSkin: 'default',
                unclaimedLevelRewards: [],
                usedPromocodes: [],
                currentGuild: null,
                allGuilds: mockGuilds,
                guildRankings: [],
                privateChats: [],
                activePrivateChat: null,
                dailyGoalMinutes: 10,
                streak: 0,
                history: [],
                lastDailyRewardDate: null,
                challenges: generateDailyChallenges(),
                lastChallengeDate: new Date().toISOString().split('T')[0],
                socialTasks: initialSocialTasks,
                adminIds: ADMIN_IDS,
                feedbacks: [],
                notifications: [],
                plan: 'free',
                planExpiry: null,
                hp: 100,
                maxHp: 100,
                dailyRewardStreak: 0,
                tickets: [],
                eventParticipants: [],
       promotionEndISO: '2026-04-16T08:00:00.000Z',
                inventory: { freezes: 0, hints: 0, shields: 0 }
              };
            }
            return {
              user: {
                ...state.user,
                id: currentUser.id,
                firstName: currentUser.first_name,
                lastName: currentUser.last_name,
                username: currentUser.username,
                photoUrl: currentUser.photo_url || state.user.photoUrl
              }
            };
          });
        }
      },

      coins: 100,
      gems: 0,
      fecBalance: 0,
      skinInventory: ['default'],
      activeSkin: 'default',
      unclaimedLevelRewards: [],
      usedPromocodes: [],

      currentGuild: null,
      allGuilds: mockGuilds,
      guildRankings: [],

      privateChats: [],
      activePrivateChat: null,

      dailyGoalMinutes: 10,
      streak: 0,
      history: [],
      lastDailyGoalClaimDate: null,
      challenges: generateDailyChallenges(),
      lastChallengeDate: new Date().toISOString().split('T')[0],

      socialTasks: initialSocialTasks,

      adminIds: ADMIN_IDS,
      feedbacks: [],
      notifications: [],

      plan: 'free',
      planExpiry: null,
      hp: 100,
      maxHp: 100,

      dailyRewardStreak: 0,
      lastDailyRewardDate: null,

      tickets: [],
      eventParticipants: [],
                 promotionEndISO: '2026-04-16T08:00:00.000Z',

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

        const newStats = { ...state.brainStats };
        const increment = 1;

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

        let newUnclaimedRewards = [...(state.unclaimedLevelRewards || [])];
        if (newLevel > state.user.level) {
          for (let l = state.user.level + 1; l <= newLevel; l++) {
            if (!newUnclaimedRewards.includes(l)) {
              newUnclaimedRewards.push(l);
            }
          }
        }

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

        const updatedChallenges = state.challenges.map(ch => {
          if (ch.isClaimed) return ch;
          if (ch.type === 'play_count') return { ...ch, current: ch.current + 1 };
          if (ch.type === 'total_coins') return { ...ch, current: ch.current + result.coinsEarned };
          return ch;
        });

        let updatedGuild = state.currentGuild;
        if (state.currentGuild) {
          const guildMessages = [...state.currentGuild.messages];
          const scoreValue = typeof result.score === 'number' ? result.score : parseInt(result.score.toString().replace(/[^0-9]/g, '')) || 0;
          
          guildMessages.push({
            id: Date.now(),
            sender: 'System',
            senderId: 'system',
            text: `${state.user.firstName} жоғары нәтиже көрсетті: ${result.score} (+${result.coinsEarned} coins)!`,
            timestamp: new Date().toISOString(),
            isBot: true
          });

          const updatedMembers = state.currentGuild.members.map(m => {
            if (m.id === state.user.id.toString()) {
              return { ...m, score: m.score + scoreValue, contribution: m.contribution + result.coinsEarned };
            }
            return m;
          });

          updatedGuild = {
            ...state.currentGuild,
            messages: guildMessages,
            members: updatedMembers,
            totalScore: state.currentGuild.totalScore + scoreValue
          };
        }

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
          brainStats: newStats,
          currentGuild: updatedGuild
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

        const ticketNumber = Math.floor(Math.random() * 90000000) + 10000000;
        const newTicket: Ticket = {
          id: Date.now().toString(),
          ticketNumber,
          eventName: plan === 'gold' ? 'Gold Premium Event' : plan === 'silver' ? 'Silver Premium Event' : 'Premium Event',
          eventDate: new Date(newExpiry).toISOString(),
          price: 0,
          purchaseDate: new Date().toISOString(),
          userId: state.user.id,
          userName: state.user.firstName,
          isUsed: false
        };

        const newParticipant: EventParticipant = {
          ticketId: newTicket.id,
          ticketNumber,
          userId: state.user.id,
          userName: state.user.firstName,
          userPhoto: state.user.photoUrl,
          purchaseDate: new Date().toISOString(),
          isVerified: false
        };

        return {
          plan,
          planExpiry: newExpiry,
          hp: state.maxHp,
          tickets: [...state.tickets, newTicket],
          eventParticipants: [...state.eventParticipants, newParticipant]
        };
      }),

      buySkin: (skinId, cost) => {
        const { coins, skinInventory } = get();
        if (coins >= cost && !skinInventory.includes(skinId)) {
          set({
            coins: coins - cost,
            skinInventory: [...skinInventory, skinId]
          });
          return true;
        }
        return false;
      },

      equipSkin: (skinId) => set({ activeSkin: skinId }),

      inventory: {
        freezes: 0,
        hints: 0,
        shields: 0
      },

      buyBooster: (type, cost) => {
        const state = get();
        if (state.coins >= cost) {
          set({
            coins: state.coins - cost,
            inventory: {
              ...state.inventory,
              [type]: state.inventory[type] + 1
            }
          });
          return true;
        }
        return false;
      },

      consumeBooster: (type) => {
        const state = get();
        if (state.inventory[type] > 0) {
          set({
            inventory: {
              ...state.inventory,
              [type]: state.inventory[type] - 1
            }
          });
          return true;
        }
        return false;
      },

      redeemPromocode: (code) => {
        const { usedPromocodes, coins } = get();
        const normalizedCode = code.trim().toUpperCase();

        if (usedPromocodes.includes(normalizedCode)) {
          return { success: false, message: 'Promocode already used' };
        }

        if (normalizedCode === 'STARTUP') {
          set((state) => {
             const currentPlan = state.plan;
             const currentExpiry = state.planExpiry || Date.now();
             let newExpiry = currentExpiry;
             let newPlan = currentPlan;

             if (currentPlan === 'free') {
                 newPlan = 'silver';
                 newExpiry = Date.now() + (3 * 24 * 60 * 60 * 1000);
             } else {
                 newExpiry = currentExpiry + (3 * 24 * 60 * 60 * 1000);
             }

             return {
                 coins: coins + 500,
                 plan: newPlan,
                 planExpiry: newExpiry,
                 usedPromocodes: [...usedPromocodes, normalizedCode]
             };
          });
          return { success: true, message: 'Startup Bonus: 500 Coins + 3 Days Silver!' };
        }

        return { success: false, message: 'Invalid promocode' };
      },

      claimDailyLoginReward: () => {
        const { lastDailyRewardDate, dailyRewardStreak, coins, gems, user } = get();
        const today = new Date().toISOString().split('T')[0];

        if (lastDailyRewardDate === today) {
          return { success: false, reward: { coins: 0, gems: 0, xp: 0 } };
        }

        let newStreak = dailyRewardStreak;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (lastDailyRewardDate === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        const dayInCycle = ((newStreak - 1) % 7) + 1;

        let rewardCoins = 50 * dayInCycle;
        let rewardGems = dayInCycle === 7 ? 10 : (dayInCycle >= 3 ? 2 : 0);
        let rewardXp = 20 * dayInCycle;

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

      addFeedback: (feedback) => set((state) => ({
        feedbacks: [
          ...state.feedbacks,
          {
            ...feedback,
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            status: 'new'
          }
        ]
      })),

      updateFeedbackStatus: (id, status) => set((state) => ({
        feedbacks: state.feedbacks.map(f =>
          f.id === id ? { ...f, status } : f
        )
      })),

      replyToFeedback: (feedbackId, reply) => set((state) => {
        const feedback = state.feedbacks.find(f => f.id === feedbackId);
        if (!feedback) return state;

        const newNotification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Админ жауабы',
          message: `"${feedback.text.substring(0, 20)}..." хабарламаңызға жауап: ${reply}`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'success'
        };

        return {
          feedbacks: state.feedbacks.map(f =>
            f.id === feedbackId ? { ...f, status: 'resolved', adminReply: reply, replyDate: new Date().toISOString() } : f
          ),
          notifications: [newNotification, ...state.notifications]
        };
      }),

      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        )
      })),

      joinGuild: (guild) => set((state) => {
        const member: GuildMember = {
          id: state.user.id.toString(),
          name: `${state.user.firstName} ${state.user.lastName || ''}`.trim(),
          score: 0,
          role: 'Newbie',
          contribution: 0,
          joinedAt: new Date().toISOString()
        };

        const updatedGuild = {
          ...guild,
          members: [...guild.members, member]
        };

        return {
          currentGuild: updatedGuild,
          user: { ...state.user, guildId: guild.id },
          allGuilds: state.allGuilds.map(g =>
            g.id === guild.id ? updatedGuild : g
          )
        };
      }),

      leaveGuild: () => set((state) => {
        const notification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Гильдиадан шықтыңыз',
          message: 'Сіз гильдиадан сәтті шықтыңыз',
          date: new Date().toISOString(),
          isRead: false,
          type: 'guild'
        };

        return {
          currentGuild: null,
          user: { ...state.user, guildId: null },
          notifications: [notification, ...state.notifications]
        };
      }),

      updateGuild: (guild) => set({ currentGuild: guild }),
      updateBrainStats: (gameId, score) => set((state) => {
        const newStats = { ...state.brainStats };
        const increment = Math.min(5, Math.floor(score / 100));

        switch (gameId) {
          case 'schulte':
          case 'odd_one':
            newStats.focus = Math.min(100, newStats.focus + increment);
            newStats.speed = Math.min(100, newStats.speed + increment);
            break;
          case 'memory':
          case 'pairs':
            newStats.memory = Math.min(100, newStats.memory + increment);
            break;
          case 'math':
            newStats.logic = Math.min(100, newStats.logic + increment);
            break;
          case 'stroop':
            newStats.flexibility = Math.min(100, newStats.flexibility + increment);
            break;
        }

        return { brainStats: newStats };
      }),

      createGuild: (name, emblem, description) => {
        const state = get();
        const newGuild: Guild = {
          id: Date.now().toString(),
          name,
          emblem,
          description,
          creatorId: state.user.id.toString(),
          members: [{
            id: state.user.id.toString(),
            name: `${state.user.firstName} ${state.user.lastName || ''}`.trim(),
            score: 0,
            role: 'Leader',
            contribution: 0,
            joinedAt: new Date().toISOString()
          }],
          messages: [],
          totalScore: 0,
          treasury: 0,
          quests: [],
          createdAt: new Date().toISOString()
        };

        set({
          currentGuild: newGuild,
          user: { ...state.user, guildId: newGuild.id },
          allGuilds: [...state.allGuilds, newGuild]
        });

        return newGuild;
      },

      updateAllGuilds: (guilds) => set({ allGuilds: guilds }),

      updateGuildRankings: () => set((state) => ({
        guildRankings: [...state.allGuilds].sort((a, b) => b.totalScore - a.totalScore).map((guild, index) => ({
          ...guild,
          rank: index + 1
        }))
      })),

      promoteMember: (memberId, newRole) => set((state) => {
        if (!state.currentGuild) return state;
        
        return {
          currentGuild: {
            ...state.currentGuild,
            members: state.currentGuild.members.map(m =>
              m.id === memberId ? { ...m, role: newRole } : m
            )
          }
        };
      }),

      demoteMember: (memberId, newRole) => set((state) => {
        if (!state.currentGuild) return state;
        
        return {
          currentGuild: {
            ...state.currentGuild,
            members: state.currentGuild.members.map(m =>
              m.id === memberId ? { ...m, role: newRole } : m
            )
          }
        };
      }),

      removeMember: (memberId) => set((state) => {
        if (!state.currentGuild) return state;

        const notification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Мүше шығарылды',
          message: `Мүше шығарылды`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'guild'
        };

        return {
          currentGuild: {
            ...state.currentGuild,
            members: state.currentGuild.members.filter(m => m.id !== memberId)
          },
          notifications: [notification, ...state.notifications]
        };
      }),

      addGuildMessage: (message) => set((state) => {
        if (!state.currentGuild) return state;

        const mentions = message.text.match(/@(\w+)/g)?.map(m => m.substring(1)) || [];

        const newMessage: GuildMessage = {
          ...message,
          id: Date.now(),
          timestamp: new Date().toISOString(),
          reactions: [],
          mentions
        };

        const notifications: Notification[] = [];
        mentions.forEach(mention => {
          const mentionedMember = state.currentGuild!.members.find(m => m.name.toLowerCase() === mention.toLowerCase());
          if (mentionedMember) {
            notifications.push({
              id: Math.random().toString(36).substr(2, 9),
              title: `@Менштеу`,
              message: `${message.sender} сізді чатта атады`,
              date: new Date().toISOString(),
              isRead: false,
              type: 'mention'
            });
          }
        });

        return {
          currentGuild: {
            ...state.currentGuild,
            messages: [...state.currentGuild.messages, newMessage]
          },
          notifications: [...notifications, ...state.notifications]
        };
      }),

      pinGuildMessage: (messageId) => set((state) => {
        if (!state.currentGuild) return state;

        return {
          currentGuild: {
            ...state.currentGuild,
            messages: state.currentGuild.messages.map(m =>
              m.id === messageId ? { ...m, isPinned: true } : m
            )
          }
        };
      }),

      unpinGuildMessage: (messageId) => set((state) => {
        if (!state.currentGuild) return state;

        return {
          currentGuild: {
            ...state.currentGuild,
            messages: state.currentGuild.messages.map(m =>
              m.id === messageId ? { ...m, isPinned: false } : m
            )
          }
        };
      }),

      addGuildMessageReaction: (messageId, emoji) => set((state) => {
        if (!state.currentGuild) return state;

        return {
          currentGuild: {
            ...state.currentGuild,
            messages: state.currentGuild.messages.map(m => {
              if (m.id === messageId) {
                const existingReaction = m.reactions?.find(r => r.emoji === emoji);
                if (existingReaction) {
                  return {
                    ...m,
                    reactions: m.reactions?.filter(r => r.emoji !== emoji) || []
                  };
                } else {
                  return {
                    ...m,
                    reactions: [
                      ...(m.reactions || []),
                      {
                        emoji,
                        userId: state.user.id.toString(),
                        userName: state.user.firstName
                      }
                    ]
                  };
                };
              }
              return m;
            })
          }
        };
      }),

      removeGuildMessageReaction: (messageId, emoji) => set((state) => {
        if (!state.currentGuild) return state;

        return {
          currentGuild: {
            ...state.currentGuild,
            messages: state.currentGuild.messages.map(m =>
              m.id === messageId
                ? {
                    ...m,
                    reactions: m.reactions?.filter(r => r.emoji !== emoji) || []
                  }
                : m
            )
          }
        };
      }),

      donateToTreasury: (amount) => set((state) => {
        if (state.coins < amount || !state.currentGuild) return state;

        const notification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Қорға аударма',
          message: `Сіз гильдия қорына ${amount} монета аудардыңыз`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'guild'
        };

        return {
          coins: state.coins - amount,
          currentGuild: {
            ...state.currentGuild,
            treasury: state.currentGuild.treasury + amount
          },
          notifications: [notification, ...state.notifications]
        };
      }),

      claimGuildReward: (questId) => set((state) => {
        if (!state.currentGuild) return state;

        const quest = state.currentGuild.quests.find(q => q.id === questId);
        if (!quest || quest.isClaimed || quest.current < quest.target) return state;

        const notification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Тапсырма аяқталды',
          message: `Сіз ${quest.reward} монета алдыңыз`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'success'
        };

        return {
          coins: state.coins + quest.reward,
          currentGuild: {
            ...state.currentGuild,
            quests: state.currentGuild.quests.map(q =>
              q.id === questId ? { ...q, isClaimed: true } : q
            )
          },
          notifications: [notification, ...state.notifications]
        };
      }),

      createPrivateChat: (userId, userName, userPhoto) => set((state) => {
        const existingChat = state.privateChats.find(c => c.userId === userId);
        if (existingChat) return state;

        const newChat: PrivateChat = {
          userId,
          userName,
          userPhoto,
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          messages: []
        };

        return {
          privateChats: [newChat, ...state.privateChats]
        };
      }),

      sendPrivateMessage: (receiverId, text) => set((state) => {
        const chatIndex = state.privateChats.findIndex(c => c.userId === receiverId);
        if (chatIndex === -1) return state;

        const newMessage: PrivateMessage = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: state.user.id.toString(),
          senderName: state.user.firstName,
          receiverId,
          text,
          timestamp: new Date().toISOString(),
          isRead: false
        };

        const updatedChats = [...state.privateChats];
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: text,
          lastMessageTime: new Date().toISOString(),
          messages: [...updatedChats[chatIndex].messages, newMessage]
        };

        return {
          privateChats: updatedChats.sort((a, b) =>
            new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
          )
        };
      }),

      markPrivateChatAsRead: (userId) => set((state) => ({
        privateChats: state.privateChats.map(c =>
          c.userId === userId ? { ...c, unreadCount: 0 } : c
        )
      })),

      deletePrivateMessage: (messageId) => set((state) => ({
        privateChats: state.privateChats.map(chat => ({
          ...chat,
          messages: chat.messages.filter(m => m.id !== messageId)
        }))
      })),

      addNotification: (notification) => set((state) => ({
        notifications: [
          {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            isRead: false
          },
          ...state.notifications
        ]
      })),

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      })),

      clearNotifications: () => set({ notifications: [] }),

      purchaseTicket: (eventName, eventDate, price) => {
        const state = get();
        if (state.coins < price) {
          return { success: false };
        }

        const ticketNumber = Math.floor(Math.random() * 90000000) + 10000000;
        const newTicket: Ticket = {
          id: Date.now().toString(),
          ticketNumber,
          eventName,
          eventDate,
          price,
          purchaseDate: new Date().toISOString(),
          userId: state.user.id,
          userName: state.user.firstName,
          isUsed: false
        };

        const newParticipant: EventParticipant = {
          ticketId: newTicket.id,
          ticketNumber,
          userId: state.user.id,
          userName: state.user.firstName,
          userPhoto: state.user.photoUrl,
          purchaseDate: new Date().toISOString(),
          isVerified: false
        };

        set((state) => ({
          coins: state.coins - price,
          tickets: [...state.tickets, newTicket],
          eventParticipants: [...state.eventParticipants, newParticipant]
        }));

        return { success: true, ticketNumber };
      },

      verifyTicket: (ticketNumber) => {
        const state = get();
        const ticket = state.tickets.find(t => t.ticketNumber === ticketNumber);

        if (!ticket || ticket.isUsed) {
          return false;
        }

        set((state) => ({
          tickets: state.tickets.map(t =>
            t.ticketNumber === ticketNumber ? { ...t, isUsed: true } : t
          ),
          eventParticipants: state.eventParticipants.map(p =>
            p.ticketNumber === ticketNumber ? { ...p, isVerified: true } : p
          )
        }));

        return true;
      },

      getEventParticipants: () => {
        return get().eventParticipants;
      },

      updateTicketsEventDate: (newDateISO) => set((state) => {
        const allSame = state.tickets.every(t => t.eventDate === newDateISO);
        if (allSame) return state;
        return {
          tickets: state.tickets.map(t => ({ ...t, eventDate: newDateISO }))
        };
      }),

      setPromotionEndISO: (newDateISO) => set((state) => {
        if (state.promotionEndISO === newDateISO) return state;
        // Only set the promotion end; ticket dates can be synced separately
        return { promotionEndISO: newDateISO };
      }),

      extendPromotionEnd: (days, hour) => set((state) => {
        const base = state.promotionEndISO ? new Date(state.promotionEndISO) : new Date();
        const extended = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
        if (typeof hour === 'number') {
          extended.setHours(hour, 0, 0, 0);
        }
        const newISO = extended.toISOString();
        const ticketsAllSame = state.tickets.every(t => t.eventDate === newISO);
        return {
          promotionEndISO: newISO,
          tickets: ticketsAllSame ? state.tickets : state.tickets.map(t => ({ ...t, eventDate: newISO }))
        };
      })
    }),
    {
      name: `focus-storage-v17`,
      storage: createJSONStorage(() => telegramStorage),
    }
  )
);
