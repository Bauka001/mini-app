import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getTelegramUser, hapticFeedback, hasTelegramStartParam } from '../utils/telegram';
import { detectInitialLanguage } from '../utils/detectLanguage';
import { telegramStorage } from './storage';
import {
  type EventParticipant,
  type MysteryBox,
  type Notification,
  type Ticket,
  type TournamentState,
  type UserState,
  generateDailyChallenges,
  generateGameId,
  initialSocialTasks,
  initialState,
  initialUserRaw,
} from './useStore';
import { getUserByTelegramId, createUser, updateUser, subscribeToUserChanges, isSupabaseConfigured, DatabaseUser } from '../utils/supabase';
import {
  CanonicalUser,
  getUserMe,
  grantAdReward,
  grantChallengeReward,
  grantLevelReward,
  grantSocialReward,
  issueTicketRecord,
  joinTournamentRecord,
  openMysteryBoxOnServer,
  purchaseSkin,
  submitFeedbackEntry,
  submitGameResult,
  syncUserToServer,
} from '../utils/adminApi';
import { calculateBrainScoreMetrics } from '../utils/brainScore';
import {
  DEFAULT_BRAIN_STATS,
  applyBrainStatProgress,
  normalizeBrainStats,
  toDateKey,
} from './analytics';
import {
  buildClaimDailyLoginRewardResult,
  buildDailyQuestAfterGame,
  buildWeeklyChallengeAfterGame,
  buildWeeklyQuestAfterGame,
  DEFAULT_DAILY_QUEST,
  DEFAULT_WEEKLY_QUEST,
  getWeekKeyMonday,
  normalizeDailyQuest,
  normalizeWeeklyQuest,
  rollMysteryBoxOutcome,
} from './economy';
import { rollCaseOutcome } from './cases';
import {
  getWeekendEvent,
  loadUserFromSupabase,
  persistFeedbackEntry,
  shouldShowFirstWorkoutNotification,
  subscribeToSupabaseChanges,
  syncUserToSupabase,
} from './persistence';
import {
  buildJoinTournamentOutcome,
  buildTournamentStateAfterGame,
  normalizeTournamentState,
} from './tournament';
import { fetchSocialTasksApi, claimSocialTaskApi } from '../utils/api';
import { fetchEntitlements as fetchEntitlementsApi, type EntitlementsResponse } from '../utils/entitlementApi';
import { AvatarStorage } from '../utils/avatarStorage';
import { getDefaultAvatarUrl, PROFILE_AVATARS } from '../constants/avatars';

export { buildVipAnalyticsSnapshot, TELEGRAM_AVERAGE_BRAIN_PROFILE } from './analytics';

const CLAIMED_PLAN_REWARD_HISTORY_LIMIT = 64;
const PREMIUM_PLAN_REWARD_KEY_PREFIX = 'premium-once-v1';
const PRO_WEEKLY_TICKET_KEY_PREFIX = 'pro-weekly-ticket-v1';
const PREMIUM_RAFFLE_EVENT_NAME = 'Brain Champions League';
const PREMIUM_PLAN_REWARD = {
  coins: 10_000,
  gems: 10_000,
  premiumGiftMysteryBoxes: 10,
} as const;

const trimClaimedPlanRewardKeys = (keys: string[]) =>
  Array.from(new Set(keys)).slice(-CLAIMED_PLAN_REWARD_HISTORY_LIMIT);

const buildPremiumRaffleTicket = (
  state: Pick<UserState, 'user' | 'promotionEndISO'>,
  now: Date
): { ticket: Ticket; participant: EventParticipant } => {
  const ticketNumber = Math.floor(Math.random() * 90000000) + 10000000;
  const ticketId = `premium-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const purchaseDate = now.toISOString();
  const eventDate = state.promotionEndISO || now.toISOString();
  const userName = state.user.firstName || 'Premium User';

  const ticket: Ticket = {
    id: ticketId,
    ticketNumber,
    eventName: PREMIUM_RAFFLE_EVENT_NAME,
    eventDate,
    price: 0,
    purchaseDate,
    userId: state.user.id,
    userName,
    isUsed: false,
  };

  return {
    ticket,
    participant: {
      ticketId,
      ticketNumber,
      userId: state.user.id,
      userName,
      userPhoto: state.user.photoUrl,
      purchaseDate,
      isVerified: false,
    },
  };
};

const buildPlanRewardPatch = (
  state: UserState,
  response: EntitlementsResponse,
  now = new Date()
): {
  statePatch: Partial<UserState>;
  grantedTicket?: Ticket;
} | null => {
  const nowTs = now.getTime();
  const hasActivePaidPlan = response.plan !== 'free' && (!response.planExpiry || response.planExpiry > nowTs);
  if (!hasActivePaidPlan) {
    return null;
  }

  let nextCoins = state.coins;
  let nextGems = state.gems;
  let nextFreeMysteryBoxes = state.freeMysteryBoxes;
  let nextPremiumGiftMysteryBoxes = state.premiumGiftMysteryBoxes;
  let nextTournamentTickets = state.tournamentTickets;
  let nextTickets = state.tickets;
  let nextEventParticipants = state.eventParticipants;
  let nextNotifications = state.notifications;
  let nextClaimedRewardKeys = [...(state.claimedPlanRewardKeys || [])];
  let grantedTicket: Ticket | undefined;

  const entitlementSeed =
    response.activeEntitlement?.sourcePaymentOrderId ||
    response.activeEntitlement?.startsAt ||
    String(response.planExpiry || response.plan);

  const pushNotification = (message: string) => {
    const notification: Notification = {
      id: Math.random().toString(36).slice(2, 11),
      title: 'Plan rewards',
      message,
      date: now.toISOString(),
      isRead: false,
      type: 'success',
    };
    nextNotifications = [notification, ...nextNotifications];
  };

  if (response.plan === 'premium') {
    const premiumClaimKey = `${PREMIUM_PLAN_REWARD_KEY_PREFIX}:${entitlementSeed}`;
    if (!nextClaimedRewardKeys.includes(premiumClaimKey)) {
      nextCoins += PREMIUM_PLAN_REWARD.coins;
      nextGems += PREMIUM_PLAN_REWARD.gems;
      nextPremiumGiftMysteryBoxes += PREMIUM_PLAN_REWARD.premiumGiftMysteryBoxes;

      const { ticket, participant } = buildPremiumRaffleTicket(state, now);
      grantedTicket = ticket;
      nextTickets = [...nextTickets, ticket];
      nextEventParticipants = [...nextEventParticipants, participant];
      nextClaimedRewardKeys.push(premiumClaimKey);

      pushNotification('Premium бонустары берілді: +10000 crystals, +10000 coins, +10 cases және raffle ticket.');
    }
  }

  if (response.plan === 'pro') {
    const currentWeekKey = getWeekKeyMonday(now);
    const weeklyTicketClaimKey = `${PRO_WEEKLY_TICKET_KEY_PREFIX}:${currentWeekKey}`;
    if (!nextClaimedRewardKeys.includes(weeklyTicketClaimKey)) {
      nextTournamentTickets += 1;
      nextClaimedRewardKeys.push(weeklyTicketClaimKey);
      pushNotification('Pro бонусы берілді: осы аптаға 1 tournament ticket қосылды.');
    }
  }

  const claimKeysChanged = nextClaimedRewardKeys.length !== (state.claimedPlanRewardKeys || []).length;
  const notificationsChanged = nextNotifications.length !== state.notifications.length;

  if (
    !claimKeysChanged &&
    !notificationsChanged &&
    nextCoins === state.coins &&
    nextGems === state.gems &&
    nextFreeMysteryBoxes === state.freeMysteryBoxes &&
    nextPremiumGiftMysteryBoxes === state.premiumGiftMysteryBoxes &&
    nextTournamentTickets === state.tournamentTickets &&
    nextTickets === state.tickets &&
    nextEventParticipants === state.eventParticipants
  ) {
    return null;
  }

  return {
    grantedTicket,
    statePatch: {
      coins: nextCoins,
      gems: nextGems,
      freeMysteryBoxes: nextFreeMysteryBoxes,
      premiumGiftMysteryBoxes: nextPremiumGiftMysteryBoxes,
      tournamentTickets: nextTournamentTickets,
      tickets: nextTickets,
      eventParticipants: nextEventParticipants,
      notifications: nextNotifications,
      claimedPlanRewardKeys: trimClaimedPlanRewardKeys(nextClaimedRewardKeys),
    },
  };
};

const isLegendaryJackpotReward = (reward: MysteryBox) =>
  reward.type === 'raffle_ticket' || reward.type === 'iphone_17';

const buildCaseRewardAdminMessage = (state: UserState, reward: MysteryBox) => {
  const prizeName = reward.prizeTitle || (reward.type === 'raffle_ticket' ? 'Champions League Pass' : 'iPhone 17');
  const userLabel = state.user.username ? `@${state.user.username}` : state.user.firstName || 'player';
  const ticketPart = reward.ticketNumber ? ` Ticket #${reward.ticketNumber}.` : '';
  return `[LEGENDARY CASE JACKPOT] ${userLabel} (ID: ${state.user.id}) won ${prizeName}. Drop chance: 1%.${ticketPart}`;
};

const persistTicket = async (
  ticket: Ticket,
  source: 'plan_upgrade' | 'ticket_purchase' | 'case_reward',
  targetPlan?: 'silver' | 'gold' | 'premium'
): Promise<{
  ticketId: string;
  ticketNumber: number;
  plan: { plan: string; planExpiry: number | null } | null;
} | null> => {
  try {
    const response = await issueTicketRecord({
      userTelegramId: ticket.userId,
      userName: ticket.userName,
      eventName: ticket.eventName,
      eventDate: ticket.eventDate,
      price: ticket.price,
      purchaseDate: ticket.purchaseDate,
      source,
      targetPlan,
    });
    return {
      ticketId: response.ticketId,
      ticketNumber: response.ticketNumber,
      plan: response.plan ?? null,
    };
  } catch (error) {
    console.error('[Admin API] Ticket sync error:', error);
    return null;
  }
};

const buildCaseRewardTicket = (state: UserState, reward: MysteryBox): Ticket | null => {
  if (reward.type !== 'raffle_ticket' || !reward.ticketNumber || !reward.eventName || !reward.eventDate) {
    return null;
  }

  return {
    id: reward.id,
    ticketNumber: reward.ticketNumber,
    eventName: reward.eventName,
    eventDate: reward.eventDate,
    price: 0,
    purchaseDate: new Date().toISOString(),
    userId: state.user.id,
    userName: state.user.firstName,
    isUsed: false,
  };
};


export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      language: detectInitialLanguage(),
      soundEnabled: true,
      theme: 'blue',

      brainStats: normalizeBrainStats(DEFAULT_BRAIN_STATS),

      user: {
        id: initialUserRaw.id || 0,
        gameId: initialUserRaw.id ? generateGameId() : `G-${Math.floor(Math.random() * 1000000)}`,
        firstName: initialUserRaw.first_name || 'Guest',
        lastName: initialUserRaw.last_name || '',
        username: initialUserRaw.username || '',
        photoUrl: initialUserRaw.photo_url || getDefaultAvatarUrl(initialUserRaw.first_name || 'Guest'),
        level: 1,
        xp: 0,
        achievements: []
      },

      syncUserFromTelegram: () => {
        const currentUser = getTelegramUser();
        if (currentUser) {
          set((state) => {
            const isDifferentUser = state.user.id !== 0 && state.user.id !== currentUser.id;

            if (isDifferentUser) {
              if (isSupabaseConfigured) {
                loadUserFromSupabase(currentUser.id, set);
                subscribeToSupabaseChanges(currentUser.id, set);
              }
              return {
                ...initialState,
                brainStats: normalizeBrainStats(initialState.brainStats, []),
                freeMysteryBoxes: 5,
                premiumGiftMysteryBoxes: 0,
                user: {
                  id: currentUser.id,
                  gameId: generateGameId(),
                  firstName: currentUser.first_name,
                  lastName: currentUser.last_name,
                  username: currentUser.username,
                  photoUrl: currentUser.photo_url || getDefaultAvatarUrl(currentUser.first_name || 'Guest'),
                  level: 1,
                  xp: 0,
                  achievements: []
                }
              };
            } else {
              // We don't need to refetch and resubscribe if the user hasn't changed.
              // It's already subscribed. Just update Telegram specific info if needed.
              if (isSupabaseConfigured && state.user.id === 0) {
                // Initial load
                loadUserFromSupabase(currentUser.id, set);
                subscribeToSupabaseChanges(currentUser.id, set);
              }

              return {
                user: {
                  ...state.user,
                  id: currentUser.id,
                  gameId: state.user.id === 0 ? generateGameId() : state.user.gameId,
                  firstName: currentUser.first_name,
                  lastName: currentUser.last_name,
                  username: currentUser.username,
                  photoUrl: currentUser.photo_url || state.user.photoUrl
                }
              };
            }
          });
        }
      },

      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

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
      lastDailyGoalClaimDate: null,
      challenges: generateDailyChallenges(),
      lastChallengeDate: new Date().toISOString().split('T')[0],

      socialTasks: initialSocialTasks,

      feedbacks: [],
      notifications: [],

      plan: 'free',
      planExpiry: null,
      hp: 100,
      maxHp: 100,

      dailyRewardStreak: { count: 0, lastClaimDate: null, claimedDates: [] },
      weeklyChallenge: { weekKey: null, dayProgress: {}, completedDays: [], isClaimed: false, reward: { coins: 250 } },
      weekendEvent: { weekendKey: null, isActive: false, multiplier: 1 },
      tournamentTickets: 0,
      freeMysteryBoxes: 5,
      premiumGiftMysteryBoxes: 0,
      claimedPlanRewardKeys: [],

      tickets: [],
      eventParticipants: [],
      promotionEndISO: '2026-07-06T08:00:00.000Z',
      tournament: { ...initialState.tournament },

      dailyQuest: { ...DEFAULT_DAILY_QUEST },
      weeklyQuest: { ...DEFAULT_WEEKLY_QUEST },
      energy: 100,
      maxEnergy: 100,
      lastEnergyRegenTime: Date.now(),
      streakProtection: 0,
      mysteryBoxAvailable: true,
      mysteryBoxPrice: 500,
      claimDailyReward: (amount) =>
        set((state) => ({ coins: state.coins + (Number(amount) || 0) })),

      claimWeeklyChallengeReward: () => {
        const state = get();
        const challenge = state.weeklyChallenge;

        if (!challenge?.weekKey) return false;
        if (challenge.isClaimed) return false;
        if ((challenge.completedDays || []).length < 7) return false;

        const rewardCoins = challenge.reward?.coins ?? 0;
        const notification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Weekly challenge',
          message: `${rewardCoins} coins алдыңыз!`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'success',
        };

        const newState = {
          coins: state.coins + rewardCoins,
          weeklyChallenge: { ...challenge, isClaimed: true },
          notifications: [notification, ...state.notifications],
        };

        set(newState);
        if (isSupabaseConfigured && state.user.id) {
          syncUserToSupabase({ ...state, ...newState }, state.user.id);
        }
        return true;
      },
      updateUserProfile: (data) => set((state) => {
        const newState = {
          user: { ...state.user, ...data }
        };

        if (isSupabaseConfigured && state.user.id) {
          syncUserToSupabase({ ...state, ...newState }, state.user.id);
        }

        return newState;
      }),

      saveAvatarImage: async (imageData: string) => {
        const state = get();
        if (state.user.id) {
          await AvatarStorage.saveAvatar(state.user.id, imageData);
        }
      },

      loadAvatarImage: async () => {
        const state = get();
        if (state.user.id) {
          const savedAvatar = await AvatarStorage.getAvatar(state.user.id);
          if (savedAvatar && !state.user.photoUrl) {
            set((currentState) => ({
              user: { ...currentState.user, photoUrl: savedAvatar }
            }));
          }
          return savedAvatar;
        }
        return null;
      },

      isPremiumAvatar: (avatarId: string) => {
        const avatar = PROFILE_AVATARS.find(a => a.id === avatarId);
        return avatar?.isPremium || false;
      },

      canUseAvatar: (avatarId: string) => {
        const state = get();
        const avatar = PROFILE_AVATARS.find(a => a.id === avatarId);
        if (!avatar) return false;
        if (!avatar.isPremium) return true;

        const isPremium = state.plan === 'premium' || state.plan === 'pro' || state.plan === 'gold' || state.plan === 'silver';
        const isNotExpired = !state.planExpiry || Date.now() < state.planExpiry;
        return isPremium && isNotExpired;
      },

      addGameResult: (result) => {
        // Sanitize input. Anyone can call addGameResult, so clamp the credit a single
        // submission can grant. Real games award well under this cap.
        const MAX_COINS_PER_SUBMISSION = 200;
        const MIN_RESUBMIT_GAP_MS = 1500;
        const rawCoins = Number(result?.coinsEarned);
        const sanitizedCoins = Number.isFinite(rawCoins)
          ? Math.max(0, Math.min(MAX_COINS_PER_SUBMISSION, Math.floor(rawCoins)))
          : 0;
        const rawScoreNum = Number(result?.score);
        const sanitizedScore: string | number = Number.isFinite(rawScoreNum)
          ? rawScoreNum
          : typeof result?.score === 'string'
            ? result.score
            : 0;
        const gameId = String(result?.gameId || '').slice(0, 64);
        if (!gameId) return;

        // Reject double-submits for the same gameId within the throttle window.
        const preState = get();
        const lastForGame = [...preState.history].reverse().find((entry) => entry.gameId === gameId);
        if (lastForGame && Date.now() - (lastForGame.timestamp || 0) < MIN_RESUBMIT_GAP_MS) {
          return;
        }

        const userIdForSubmit = preState.user.id;
        const sanitizedResult = { ...result, gameId, score: sanitizedScore, coinsEarned: sanitizedCoins };

        set((state) => {
        const now = new Date();
        const todayKey = toDateKey(now);
        const computedWeekendEvent = getWeekendEvent(now, state.user.id);
        const appliedCoinsEarned = Math.round((sanitizedResult.coinsEarned || 0) * (computedWeekendEvent.multiplier || 1));

        const xpGained = appliedCoinsEarned;
        const newXp = state.user.xp + xpGained;
        const newLevel = Math.floor(newXp / 1000) + 1;

        const newStats = applyBrainStatProgress(state.brainStats, sanitizedResult.gameId, 1);

        const newUnclaimedRewards = [...(state.unclaimedLevelRewards || [])];
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

        const premiumSkinId = 'premium_gold';
        const unlockedPremiumSkin = gameCount >= 100 && !state.skinInventory.includes(premiumSkinId);
        if (gameCount >= 100 && !newAchievements.includes('first_100_games')) {
          newAchievements.push('first_100_games');
        }

        const updatedChallenges = state.challenges.map(ch => {
          if (ch.isClaimed) return ch;
          if (ch.type === 'play_count') return { ...ch, current: ch.current + 1 };
          if (ch.type === 'total_coins') return { ...ch, current: ch.current + appliedCoinsEarned };
          return ch;
        });

        const finalDailyQuest = buildDailyQuestAfterGame(state.dailyQuest, sanitizedResult.gameId, todayKey);
        const currentWeekKey = getWeekKeyMonday(now);
        const nextWeeklyChallenge = buildWeeklyChallengeAfterGame(
          state.weeklyChallenge,
          todayKey,
          currentWeekKey
        );

        const energyCost = 5 + Math.floor(Math.random() * 5);
        const newEnergy = Math.max(0, state.energy - energyCost);

        const finalWeeklyQuest = buildWeeklyQuestAfterGame(state.weeklyQuest, now);

        const playedAt = new Date().toISOString();
        const playedAtTimestamp = Date.now();
        const nextHistoryEntry = {
          ...sanitizedResult,
          coinsEarned: appliedCoinsEarned,
          date: playedAt.split('T')[0],
          timestamp: playedAtTimestamp,
        };
        // Keep only the last 100 games to prevent localStorage overflow
        const updatedHistory = [...state.history, nextHistoryEntry].slice(-100);
        const nextTournament = buildTournamentStateAfterGame(state.tournament, sanitizedResult, playedAt);

        const shouldAddWorkoutNotification =
          Boolean(state.user.id) &&
          shouldShowFirstWorkoutNotification(state.user.id, gameId, playedAtTimestamp);

        const onboardingNotification: Notification | null = shouldAddWorkoutNotification
          ? {
              id: Math.random().toString(36).substr(2, 9),
              title: 'Great start',
              message: 'Your memory speed is high!',
              date: new Date().toISOString(),
              isRead: false,
              type: 'success',
            }
          : null;

        const weekendEventJustActivated =
          computedWeekendEvent.isActive &&
          (state.weekendEvent?.weekendKey !== computedWeekendEvent.weekendKey || !state.weekendEvent.isActive);
        const weekendEventNotification: Notification | null = weekendEventJustActivated
          ? {
              id: Math.random().toString(36).substr(2, 9),
              title: 'Weekend event',
              message: 'Double coins белсенді: ойыннан түсетін coins x2',
              date: new Date().toISOString(),
              isRead: false,
              type: 'info',
            }
          : null;

        const achievementNotification: Notification | null = unlockedPremiumSkin
          ? {
              id: Math.random().toString(36).substr(2, 9),
              title: 'Achievement',
              message: 'First 100 games: Premium skin ашылды!',
              date: new Date().toISOString(),
              isRead: false,
              type: 'success',
            }
          : null;

        const newState = {
          coins: state.coins + appliedCoinsEarned,
          history: updatedHistory,
          user: {
            ...state.user,
            xp: newXp,
            level: newLevel,
            achievements: newAchievements
          },
          challenges: updatedChallenges,
          unclaimedLevelRewards: newUnclaimedRewards,
          brainStats: normalizeBrainStats(newStats, updatedHistory),
          dailyQuest: finalDailyQuest,
          weeklyChallenge: nextWeeklyChallenge,
          weekendEvent: computedWeekendEvent,
          energy: newEnergy,
          lastEnergyRegenTime: Date.now(),
          weeklyQuest: finalWeeklyQuest,
          skinInventory: unlockedPremiumSkin
            ? [...state.skinInventory, premiumSkinId]
            : state.skinInventory,
          notifications: [
            ...(achievementNotification ? [achievementNotification] : []),
            ...(weekendEventNotification ? [weekendEventNotification] : []),
            ...(onboardingNotification ? [onboardingNotification] : []),
            ...state.notifications,
          ],
          tournament: nextTournament
        };

        if (isSupabaseConfigured && state.user.id) {
          syncUserToSupabase(newState, state.user.id);
        }

        return newState;
        });

        // Server-side validation & authoritative coin/xp/level credit. The local
        // state above is optimistic; reconcile it with the server's response so
        // a tampered local state can't outpace the canonical balance.
        if (isSupabaseConfigured && userIdForSubmit) {
          void submitGameResult({
            gameId,
            score: sanitizedScore,
            coinsEarned: sanitizedCoins,
          })
            .then((response) => {
              if (response?.reason === 'rate_limited') {
                // Server treated this as a duplicate; refund the optimistic credit.
                set((state) => ({
                  coins: Math.max(0, state.coins - sanitizedCoins),
                  user: {
                    ...state.user,
                    xp: Math.max(0, state.user.xp - sanitizedCoins),
                  },
                }));
                return;
              }
              if (typeof response?.coins === 'number') {
                set((state) => ({
                  coins: response.coins!,
                  user: {
                    ...state.user,
                    xp: typeof response.xp === 'number' ? response.xp : state.user.xp,
                    level: typeof response.level === 'number' ? response.level : state.user.level,
                  },
                }));
              }
            })
            .catch((err) => {
              console.error('[Game Submit] sync error:', err);
            });
        }
      },

      upgradePlan: (plan, days) => {
        const state = get();
        const currentPlan = state.plan;
        const currentExpiry = state.planExpiry || Date.now();
        const newExpiry =
          plan !== currentPlan
            ? Date.now() + days * 24 * 60 * 60 * 1000
            : currentExpiry + days * 24 * 60 * 60 * 1000;

        const localId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const eventName = plan === 'premium' ? 'VIP Tournament Access' : 'VIP Access Event';
        const optimisticTicket: Ticket = {
          id: localId,
          ticketNumber: 0, // placeholder until server issues canonical number
          eventName,
          eventDate: new Date(newExpiry).toISOString(),
          price: 0,
          purchaseDate: new Date().toISOString(),
          userId: state.user.id,
          userName: state.user.firstName,
          isUsed: false,
        };

        const optimisticParticipant: EventParticipant = {
          ticketId: localId,
          ticketNumber: 0,
          userId: state.user.id,
          userName: state.user.firstName,
          userPhoto: state.user.photoUrl,
          purchaseDate: optimisticTicket.purchaseDate,
          isVerified: false,
        };

        const newState = {
          plan,
          planExpiry: newExpiry,
          hp: state.maxHp,
          tickets: [...state.tickets, optimisticTicket],
          eventParticipants: [...state.eventParticipants, optimisticParticipant],
        };

        set(newState);

        if (isSupabaseConfigured) {
          syncUserToSupabase(newState, state.user.id);
        }

        // Reconcile with server-issued ticket id + number, and adopt the
        // server-canonical plan/plan_expiry. The server is now the only writer
        // for those fields — local optimistic values get overwritten here.
        void persistTicket(optimisticTicket, 'plan_upgrade', plan).then((issued) => {
          set((current) => {
            if (!issued) {
              // Server failed: drop the optimistic ticket and revert plan to what it was.
              return {
                plan: currentPlan,
                planExpiry: state.planExpiry,
                tickets: current.tickets.filter((t) => t.id !== localId),
                eventParticipants: current.eventParticipants.filter((p) => p.ticketId !== localId),
              };
            }
            const patch: any = {
              tickets: current.tickets.map((t) =>
                t.id === localId ? { ...t, id: issued.ticketId, ticketNumber: issued.ticketNumber } : t
              ),
              eventParticipants: current.eventParticipants.map((p) =>
                p.ticketId === localId
                  ? { ...p, ticketId: issued.ticketId, ticketNumber: issued.ticketNumber }
                  : p
              ),
            };
            if (issued.plan?.plan) {
              patch.plan = issued.plan.plan;
              patch.planExpiry = issued.plan.planExpiry ?? null;
            }
            return patch;
          });
        });
      },

      fetchEntitlements: async () => {
        try {
          const response = await fetchEntitlementsApi();
          let grantedTicket: Ticket | undefined;

          set((state) => {
            const rewardPatch = buildPlanRewardPatch(state, response);
            grantedTicket = rewardPatch?.grantedTicket;

            return {
              plan: response.plan,
              planExpiry: response.planExpiry,
              subscriptionDay: response.subscriptionDay,
              ...(rewardPatch?.statePatch || {}),
            };
          });

          if (grantedTicket) {
            void persistTicket(grantedTicket, 'plan_upgrade');
          }

          if (isSupabaseConfigured && get().user.id) {
            syncUserToSupabase(get(), get().user.id);
          }
        } catch (error) {
          console.error('Failed to fetch entitlements:', error);
        }
      },

      buySkin: (skinId, cost) => {
        const { coins, skinInventory } = get();
        // Local pre-check is just for UX (don't even attempt if obviously
        // underfunded). The server is authoritative on price + balance.
        if (coins < cost || skinInventory.includes(skinId)) {
          return false;
        }

        const optimisticCoins = coins - cost;
        const optimisticInventory = [...skinInventory, skinId];
        set({ coins: optimisticCoins, skinInventory: optimisticInventory });

        // Server-validated purchase: server looks up the canonical price
        // (client `cost` is ignored), checks balance against the DB row,
        // and either commits or rejects. We reconcile the local state
        // with whatever the server says.
        if (isSupabaseConfigured) {
          void purchaseSkin(skinId)
            .then((response) => {
              set({
                coins: response.coins,
                skinInventory: response.skinInventory,
              });
            })
            .catch((err) => {
              console.error('[Skins] purchase rejected:', err);
              // Revert the optimistic update so the user sees the real state.
              set((current) => ({
                coins: current.coins + cost,
                skinInventory: current.skinInventory.filter((s) => s !== skinId),
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Purchase rejected',
                    message: err instanceof Error ? err.message : 'Skin purchase failed',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }
        return true;
      },

      equipSkin: (skinId) => {
        const state = get();
        const newState = { activeSkin: skinId };
        set(newState);

        if (isSupabaseConfigured && state.user.id) {
          syncUserToSupabase({ ...state, ...newState }, state.user.id);
        }
      },

      inventory: {
        freezes: 0,
        hints: 0,
        shields: 0
      },

      buyBooster: (type, cost) => {
        const state = get();
        if (state.coins >= cost) {
          const newState = {
            coins: state.coins - cost,
            inventory: {
              ...state.inventory,
              [type]: state.inventory[type] + 1
            }
          };
          set(newState);
          if (isSupabaseConfigured) {
            syncUserToSupabase(newState, get().user.id);
          }
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
          if (!hasTelegramStartParam('startup')) {
            return { success: false, message: 'Promocode is available only from a special link' };
          }

          set({
            coins: coins + 500,
            usedPromocodes: [...usedPromocodes, normalizedCode]
          });
          return { success: true, message: 'Startup Bonus: 500 Coins!' };
        }

        return { success: false, message: 'Invalid promocode' };
      },

      claimDailyLoginReward: () => {
        const { user, ...state } = get();
        const today = new Date().toISOString().split('T')[0];
        const result = buildClaimDailyLoginRewardResult(state, today);
        if (!result.success) {
          return result;
        }

        set(result.statePatch);

        if (isSupabaseConfigured && user.id) {
          syncUserToSupabase({ ...get(), ...result.statePatch }, user.id);
        }

        return { success: true, reward: result.reward };
      },

      joinTournament: (paymentMethod) => {
        const state = get();
        const outcome = buildJoinTournamentOutcome(state, paymentMethod);
        if (!outcome.success) {
          return outcome;
        }

        const previousTournament = state.tournament;
        const previousTickets = state.tournamentTickets;
        set(outcome.statePatch);

        // Server-side gate: VIP-tier check + once-per-week dedup happen in the
        // backend with service-role auth. If the server rejects, revert the
        // optimistic local join and surface the reason. Ticket-based entries
        // are validated locally only (no server endpoint for ticket join).
        if (isSupabaseConfigured && state.user.id && paymentMethod !== 'ticket') {
          void joinTournamentRecord(paymentMethod as 'vip' | 'ton' | 'free')
            .catch((err) => {
              console.error('[Tournaments] Join rejected by server:', err);
              const message = err instanceof Error ? err.message : 'Tournament join rejected';
              set((current) => ({
                tournament: previousTournament,
                tournamentTickets: previousTickets,
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Tournament join rejected',
                    message,
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }

        return { success: true, message: outcome.message };
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

      claimChallengeReward: (challengeId) => {
        const state = get();
        const challenge = state.challenges.find(c => c.id === challengeId);
        if (!challenge || challenge.isClaimed || challenge.current < challenge.target) return;

        const localReward = challenge.reward;
        // Optimistic UI: flip claimed state, credit coins. Server has final
        // say — caps the reward at MAX_CHALLENGE_REWARD_COINS (200) and dedups
        // per-day-per-challengeId. We reconcile on success / revert on
        // rejection (most common: 409 already_claimed when the user spams
        // the button or replays a previous day's id).
        set({
          coins: state.coins + localReward,
          challenges: state.challenges.map(c =>
            c.id === challengeId ? { ...c, isClaimed: true } : c
          ),
        });

        if (isSupabaseConfigured) {
          void grantChallengeReward(challengeId, localReward)
            .then((response) => {
              if (typeof response.coins === 'number') {
                set({ coins: response.coins });
              }
            })
            .catch((err) => {
              console.error('[Rewards] challenge reward rejected:', err);
              set((current) => ({
                coins: Math.max(0, current.coins - localReward),
                challenges: current.challenges.map(c =>
                  c.id === challengeId ? { ...c, isClaimed: false } : c
                ),
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Challenge reward declined',
                    message: err instanceof Error ? err.message : 'Reward unavailable',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }
      },

      watchAd: (reward) => {
        // Optimistic local credit so the UI gives instant feedback. The server
        // is authoritative on the actual amount and the daily cap (5/day,
        // 10c each) — we reconcile from the response. The `reward` arg is now
        // ignored on the wire; it stays in the signature for callers' UI use.
        set((state) => ({ coins: state.coins + reward }));

        if (isSupabaseConfigured) {
          void grantAdReward()
            .then((response) => {
              if (typeof response.coins === 'number') {
                set({ coins: response.coins });
              }
            })
            .catch((err) => {
              // Roll back optimistic credit and surface the reason. Common
              // case: daily cap (HTTP 429) — we revert the visible amount.
              set((current) => ({
                coins: Math.max(0, current.coins - reward),
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Reward declined',
                    message: err instanceof Error ? err.message : 'Ad reward unavailable',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }
      },

      fetchSocialTasks: async () => {
        try {
          const { tasks } = await fetchSocialTasksApi();
          if (tasks && tasks.length > 0) {
            set({ socialTasks: tasks });
          } else {
            set({ socialTasks: initialSocialTasks });
          }
        } catch (error) {
          console.error('Failed to fetch social tasks:', error);
          set({ socialTasks: initialSocialTasks });
        }
      },

      claimSocialTask: async (taskId) => {
        const state = get();
        const task = state.socialTasks.find(t => t.id === taskId);
        if (!task || task.isClaimed) return;

        const localReward = task.reward;
        // Optimistic local update so the UI flips to "claimed" instantly. The
        // server is authoritative on the gem amount (it ignores task.reward
        // and uses its own catalog) and on whether this task was already
        // claimed by this user. We reconcile from the response.
        set({
          gems: (state.gems || 0) + localReward,
          socialTasks: state.socialTasks.map(t =>
            t.id === taskId ? { ...t, isClaimed: true } : t
          ),
        });

        try {
          if (isSupabaseConfigured) {
            // Try new claim endpoint first (upstream payment-system flow),
            // then fall back to legacy /rewards/social grant (HEAD flow).
            try {
              const { reward } = await claimSocialTaskApi(taskId);
              set((current) => ({ gems: (current.gems || 0) - localReward + reward }));
            } catch {
              const response = await grantSocialReward(taskId);
              if (typeof response.gems === 'number') {
                set({ gems: response.gems });
              }
            }

            if (state.user.id) {
              syncUserToSupabase({ ...get() }, state.user.id);
            }
          }
        } catch (err) {
          console.error('[Rewards] social reward rejected:', err);
          // Revert: undo the optimistic gem credit and put the task back
          // to unclaimed so the user can retry. 409 already_claimed will
          // also revert here, which is correct: the server says they
          // shouldn't have any pending state for this task.
          set((current) => ({
            gems: Math.max(0, (current.gems || 0) - localReward),
            socialTasks: current.socialTasks.map(t =>
              t.id === taskId ? { ...t, isClaimed: false } : t
            ),
            notifications: [
              {
                id: Math.random().toString(36).slice(2, 11),
                title: 'Social reward declined',
                message: err instanceof Error ? err.message : 'Reward unavailable',
                date: new Date().toISOString(),
                isRead: false,
                type: 'error',
              },
              ...current.notifications,
            ],
          }));
        }
      },

      addCoins: (amount) => {
        const newState = { coins: (get().coins || 0) + amount };
        set(newState);
        if (isSupabaseConfigured) {
          syncUserToSupabase(newState, get().user.id);
        }
      },

      addFec: (amount) => set((state) => ({
        fecBalance: (state.fecBalance || 0) + amount
      })),

      spendCoins: (amount) => {
        const { coins } = get();
        if (coins >= amount) {
          const newState = { coins: coins - amount };
          set(newState);
          if (isSupabaseConfigured) {
            syncUserToSupabase(newState, get().user.id);
          }
          return true;
        }
        return false;
      },
      claimLevelReward: (level) => {
        const previous = get();
        // Optimistic update: drop from unclaimed list and add the canonical
        // 100c + 5g locally. Server validates user.level >= claimedLevel and
        // dedups via coin_transactions metadata; on rejection we revert.
        set({
          unclaimedLevelRewards: previous.unclaimedLevelRewards.filter(l => l !== level),
          coins: previous.coins + 100,
          gems: (previous.gems || 0) + 5,
        });

        if (isSupabaseConfigured) {
          void grantLevelReward(level)
            .then((response) => {
              if (typeof response.coins === 'number' && typeof response.gems === 'number') {
                set({ coins: response.coins, gems: response.gems });
              }
            })
            .catch((err) => {
              console.error('[Rewards] level reward rejected:', err);
              // Revert: put the level back in unclaimed and undo the credit.
              set((current) => ({
                unclaimedLevelRewards: current.unclaimedLevelRewards.includes(level)
                  ? current.unclaimedLevelRewards
                  : [...current.unclaimedLevelRewards, level],
                coins: Math.max(0, current.coins - 100),
                gems: Math.max(0, (current.gems || 0) - 5),
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Level reward declined',
                    message: err instanceof Error ? err.message : 'Reward unavailable',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }
      },
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

      addFeedback: (feedback) => {
        const nextFeedback = {
          ...feedback,
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          status: 'new' as const
        };

        set((state) => ({
          feedbacks: [
            ...state.feedbacks,
            nextFeedback
          ]
        }));

        void persistFeedbackEntry(feedback);
      },

      updateFeedbackStatus: (id, status) => set((state) => ({
        feedbacks: state.feedbacks.map(f => f.id === id ? { ...f, status } : f
        )
      })),

      replyToFeedback: (feedbackId, reply) => set((state) => {
        const feedback = state.feedbacks.find(f => f.id === feedbackId);
        if (!feedback) return state;

        const newNotification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Админ жауабы',
          message: `"${feedback.text.substring(0, 20)}..." хабарламаңызға жауаб: ${reply}`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'success'
        };

        return {
          feedbacks: state.feedbacks.map(f => f.id === feedbackId ? { ...f, status: 'resolved', adminReply: reply, replyDate: new Date().toISOString() } : f
          ),
          notifications: [newNotification, ...state.notifications]
        };
      }),

      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n
        )
      })),
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
            newStats.logic = Math.min(100, newStats.logic + increment);
            break;
          case 'math':
          case 'code_breaker':
            newStats.logic = Math.min(100, newStats.logic + increment);
            break;
          case 'stroop':
            newStats.flexibility = Math.min(100, newStats.flexibility + increment);
            break;
        }

        return { brainStats: normalizeBrainStats(newStats, state.history) };
      }),

      addNotification: (notification) => {
        const t = notification.type;
        if (t === 'success' || t === 'warning' || t === 'error') {
          hapticFeedback.notification(t);
        } else {
          hapticFeedback.impact('light');
        }
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: Math.random().toString(36).substr(2, 9),
              date: new Date().toISOString(),
              isRead: false,
            },
            ...state.notifications,
          ],
        }));
      },

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      })),

      clearNotifications: () => set({ notifications: [] }),

      purchaseTicket: (eventName, eventDate, price) => {
        const state = get();
        if (state.coins < price) {
          return { success: false };
        }

        const localId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const optimisticTicket: Ticket = {
          id: localId,
          ticketNumber: 0,
          eventName,
          eventDate,
          price,
          purchaseDate: new Date().toISOString(),
          userId: state.user.id,
          userName: state.user.firstName,
          isUsed: false,
        };

        const optimisticParticipant: EventParticipant = {
          ticketId: localId,
          ticketNumber: 0,
          userId: state.user.id,
          userName: state.user.firstName,
          userPhoto: state.user.photoUrl,
          purchaseDate: optimisticTicket.purchaseDate,
          isVerified: false,
        };

        set((s) => ({
          coins: s.coins - price,
          tickets: [...s.tickets, optimisticTicket],
          eventParticipants: [...s.eventParticipants, optimisticParticipant],
        }));

        void persistTicket(optimisticTicket, 'ticket_purchase').then((issued) => {
          set((current) => {
            if (!issued) {
              // Refund and remove optimistic entries on server failure.
              return {
                coins: current.coins + price,
                tickets: current.tickets.filter((t) => t.id !== localId),
                eventParticipants: current.eventParticipants.filter((p) => p.ticketId !== localId),
              };
            }
            return {
              tickets: current.tickets.map((t) =>
                t.id === localId ? { ...t, id: issued.ticketId, ticketNumber: issued.ticketNumber } : t
              ),
              eventParticipants: current.eventParticipants.map((p) =>
                p.ticketId === localId
                  ? { ...p, ticketId: issued.ticketId, ticketNumber: issued.ticketNumber }
                  : p
              ),
            };
          });
        });

        return { success: true };
      },

      verifyTicket: (ticketNumber) => {
        const state = get();
        const ticket = state.tickets.find(t => t.ticketNumber === ticketNumber);

        if (!ticket || ticket.isUsed) {
          return false;
        }

        set((state) => ({
          tickets: state.tickets.map(t => t.ticketNumber === ticketNumber ? { ...t, isUsed: true } : t
          ),
          eventParticipants: state.eventParticipants.map(p => p.ticketNumber === ticketNumber ? { ...p, isVerified: true } : p
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
      }),

      checkDailyQuestComplete: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        
        const safeDailyQuest = normalizeDailyQuest(state.dailyQuest);

        if (safeDailyQuest.lastResetDate !== today) {
          set({
            dailyQuest: {
              ...DEFAULT_DAILY_QUEST,
              lastResetDate: today
            }
          });
          return false;
        }
        
        const uniqueGames = new Set(safeDailyQuest.gamesPlayed);
        const isComplete = uniqueGames.size >= 3;
        
        if (isComplete && !safeDailyQuest.isCompleted) {
          set((s) => ({
            dailyQuest: { ...normalizeDailyQuest(s.dailyQuest), isCompleted: true }
          }));
          return true;
        }
        
        return isComplete;
      },

      claimDailyQuestReward: () => set((state) => {
        const safeDailyQuest = normalizeDailyQuest(state.dailyQuest);
        if (!safeDailyQuest.isCompleted || safeDailyQuest.isClaimed) return state;
        
        const uniqueGames = new Set(safeDailyQuest.gamesPlayed);
        if (uniqueGames.size < 3) return state;
        
        return {
          coins: state.coins + 50,
          dailyQuest: { ...safeDailyQuest, isClaimed: true }
        };
      }),

      logout: () => set(() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('focus-storage-v17');
        }

        return {
          language: detectInitialLanguage(),
          soundEnabled: true,
          theme: 'blue',
          brainStats: normalizeBrainStats(DEFAULT_BRAIN_STATS, []),
          user: {
            id: 0,
            firstName: 'Guest',
            lastName: '',
            username: '',
            photoUrl: '',
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
          dailyGoalMinutes: 10,
          streak: 0,
          history: [],
          challenges: generateDailyChallenges(),
          lastChallengeDate: new Date().toISOString().split('T')[0],
          socialTasks: initialSocialTasks,
          feedbacks: [],
          notifications: [],
          plan: 'free',
          planExpiry: null,
          claimedPlanRewardKeys: [],
          hp: 100,
          maxHp: 100,
          dailyRewardStreak: { count: 0, lastClaimDate: null, claimedDates: [] },
          weeklyChallenge: { weekKey: null, dayProgress: {}, completedDays: [], isClaimed: false, reward: { coins: 250 } },
          weekendEvent: { weekendKey: null, isActive: false, multiplier: 1 },
          tournamentTickets: 0,
          tickets: [],
          eventParticipants: [],
          promotionEndISO: '2026-07-06T08:00:00.000Z',
          tournament: { ...initialState.tournament },
          dailyQuest: { ...DEFAULT_DAILY_QUEST },
          inventory: { freezes: 0, hints: 0, shields: 0 },
          weeklyQuest: { ...DEFAULT_WEEKLY_QUEST },
          energy: 100,
          maxEnergy: 100,
          lastEnergyRegenTime: Date.now(),
          streakProtection: 0,
          freeMysteryBoxes: 5,
          premiumGiftMysteryBoxes: 0,
          mysteryBoxAvailable: true,
          mysteryBoxPrice: 500
        };
      }),

      consumeEnergy: (amount) => {
        const state = get();
        if (state.energy < amount) return false;
        set({ energy: state.energy - amount, lastEnergyRegenTime: Date.now() });
        return true;
      },

      addEnergy: (amount) => set((state) => ({
        energy: Math.min(state.maxEnergy, state.energy + amount),
        lastEnergyRegenTime: Date.now()
      })),

      buyEnergyPack: () => {
        const state = get();
        if (state.coins < 100) return false;
        set((s) => ({
          coins: s.coins - 100,
          energy: Math.min(s.maxEnergy, s.energy + 20)
        }));
        return true;
      },

      getEnergyRegenRate: () => {
        const plan = get().plan;
        return plan === 'premium' ? 2 : 1;
      },

      updateEnergyRegen: () => {
        const state = get();
        if (state.energy >= state.maxEnergy) return;

        const regenRate = state.getEnergyRegenRate();
        const now = Date.now();
        const elapsed = (now - (state.lastEnergyRegenTime || now)) / 1000;
        const regenPerSecond = regenRate / 300;

        const regenAmount = Math.floor(elapsed * regenPerSecond);
        if (regenAmount > 0) {
          set((s) => ({
            energy: Math.min(s.maxEnergy, s.energy + regenAmount),
            lastEnergyRegenTime: now
          }));
        }
      },

      useStreakProtection: () => {
        const state = get();
        if (state.streakProtection <= 0) return false;
        set((s) => ({
          streakProtection: s.streakProtection - 1,
          dailyRewardStreak: s.dailyRewardStreak
        }));
        return true;
      },

      buyStreakProtection: () => {
        const state = get();
        if (state.coins < 200) return false;
        if (state.streakProtection >= 3) return false;
        set((s) => ({
          coins: s.coins - 200,
          streakProtection: s.streakProtection + 1
        }));
        return true;
      },

      openCase: (caseId) => {
        const state = get();
        const outcome = rollCaseOutcome(state, caseId, Math.random(), Math.random(), Math.random());

        if (!outcome.success || !outcome.reward) {
          return outcome;
        }

        if (outcome.statePatch) {
          set(outcome.statePatch);
          const nextState = { ...state, ...outcome.statePatch };
          if (isSupabaseConfigured) {
            syncUserToSupabase(nextState, state.user.id);
          }

          if (caseId === 'legendary_case' && isLegendaryJackpotReward(outcome.reward)) {
            void persistFeedbackEntry({
              userId: state.user.id,
              username: state.user.username || state.user.firstName || 'legendary_case',
              text: buildCaseRewardAdminMessage(state, outcome.reward),
              imageUrl: outcome.reward.prizeImageUrl,
            });
          }

          const rewardTicket = buildCaseRewardTicket(nextState, outcome.reward);
          if (rewardTicket) {
            void persistTicket(rewardTicket, 'case_reward');
          }
        }

        return outcome;
      },

      openMysteryBox: async () => {
        const state = get();
        if (!state.mysteryBoxAvailable || state.coins < state.mysteryBoxPrice) {
          return null;
        }

        // Server is the only roller of the dice. The client never touches
        // Math.random for this — closes the "re-roll until you like the
        // result" exploit. Local state is updated from the server response,
        // not predicted ahead of time.
        if (!isSupabaseConfigured) {
          // No backend in dev — keep something working but don't pretend.
          console.warn('[MysteryBox] Supabase not configured; skipping open');
          return null;
        }

        try {
          const response = await openMysteryBoxOnServer();
          set({
            coins: response.coins,
            gems: response.gems,
            fecBalance: response.fecBalance,
            inventory: response.inventory,
            skinInventory: response.skinInventory,
            mysteryBoxAvailable: false,
          });

          // Map server reward back to the existing client-facing MysteryBox
          // type so the modal renders unchanged.
          const reward = response.reward;
          return {
            id: Date.now().toString(),
            type: reward.type,
            amount: reward.amount,
            ...(reward.type === 'skin' ? { skinId: reward.skinId } : {}),
            ...(reward.type === 'booster' ? { boosterType: reward.boosterType } : {}),
          } as any;
        } catch (err) {
          console.error('[MysteryBox] open rejected:', err);
          set((current) => ({
            notifications: [
              {
                id: Math.random().toString(36).slice(2, 11),
                title: 'Mystery box unavailable',
                message: err instanceof Error ? err.message : 'Try again later',
                date: new Date().toISOString(),
                isRead: false,
                type: 'error',
              },
              ...current.notifications,
            ],
          }));
          return null;
        }
      },

      setMysteryBoxAvailable: (available) => set({ mysteryBoxAvailable: available }),

      updateWeeklyQuest: () => {
        const state = get();
        const now = new Date();
        const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
        const safeWeeklyQuest = normalizeWeeklyQuest(state.weeklyQuest);
        const lastResetWeek = safeWeeklyQuest.lastResetDate 
          ? Math.floor(new Date(safeWeeklyQuest.lastResetDate).getTime() / (7 * 24 * 60 * 60 * 1000))
          : -1;

        if (weekNumber !== lastResetWeek) {
          set({
            weeklyQuest: {
              ...DEFAULT_WEEKLY_QUEST,
              lastResetDate: new Date().toISOString()
            }
          });
        }
      },

      claimWeeklyQuestMilestone: (milestoneIndex) => {
        const state = get();
        const safeWeeklyQuest = normalizeWeeklyQuest(state.weeklyQuest);
        const milestone = safeWeeklyQuest.milestones[milestoneIndex];
        
        if (!milestone || milestone.isClaimed || safeWeeklyQuest.gamesPlayed < milestone.gamesRequired) {
          return false;
        }

        set((s) => {
          const currentWeeklyQuest = normalizeWeeklyQuest(s.weeklyQuest);
          const newMilestones = [...currentWeeklyQuest.milestones];
          newMilestones[milestoneIndex] = { ...newMilestones[milestoneIndex], isClaimed: true };

          return {
            coins: s.coins + milestone.reward.coins,
            gems: s.gems + milestone.reward.crystals,
            energy: Math.min(s.maxEnergy, s.energy + milestone.reward.energy),
            weeklyQuest: { ...currentWeeklyQuest, milestones: newMilestones }
          };
        });

        return true;
      },
    }),
    {
      name: `focus-app-v31-prod`,
      version: 2,
      // v2: retire the editorial 'claude' theme. Everyone lands on the blue
      // (navy) theme — the dark, car-banner home the product uses. Existing
      // users persisted with theme:'claude' are migrated to 'blue'; every
      // other field is preserved.
      migrate: (persistedState: unknown, version: number) => {
        if (persistedState && typeof persistedState === 'object') {
          const s = persistedState as { theme?: string };
          if (version < 2 && s.theme === 'claude') {
            return { ...(persistedState as object), theme: 'blue' };
          }
          if (version < 1) {
            return { ...(persistedState as object), theme: 'blue' };
          }
        }
        return persistedState as object;
      },
      storage: createJSONStorage(() => telegramStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UserState> | undefined;
        const hasPersistedState = Boolean(persisted && typeof persisted === 'object');
        const mergedState: UserState = {
          ...currentState,
          ...(persistedState as object),
        };

        return {
          ...mergedState,
          brainStats: normalizeBrainStats(mergedState.brainStats, mergedState.history || []),
          dailyQuest: normalizeDailyQuest(mergedState.dailyQuest),
          weeklyQuest: normalizeWeeklyQuest(mergedState.weeklyQuest),
          tournament: normalizeTournamentState(mergedState.tournament),
          socialTasks: mergedState.socialTasks || [],
          freeMysteryBoxes:
            typeof persisted?.freeMysteryBoxes === 'number'
              ? Math.max(persisted.freeMysteryBoxes, 0)
              : hasPersistedState
                ? currentState.freeMysteryBoxes
                : currentState.freeMysteryBoxes,
          premiumGiftMysteryBoxes:
            typeof persisted?.premiumGiftMysteryBoxes === 'number'
              ? Math.max(persisted.premiumGiftMysteryBoxes, 0)
              : hasPersistedState
                ? currentState.premiumGiftMysteryBoxes
                : currentState.premiumGiftMysteryBoxes,
        };
      },
    }
  )
);
