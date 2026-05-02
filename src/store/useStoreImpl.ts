import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getTelegramUser } from '../utils/telegram';
import { isSupabaseConfigured } from '../utils/supabase';
import { telegramStorage } from './storage';
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
import {
  getWeekendEvent,
  loadUserFromSupabase,
  persistFeedbackEntry,
  persistTicket,
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
import { fetchEntitlements as fetchEntitlementsApi } from '../utils/entitlementApi';
import {
  type EventParticipant,
  type Notification,
  type Ticket,
  type UserState,
  generateDailyChallenges,
  generateGameId,
  initialSocialTasks,
  initialState,
  initialUserRaw,
} from './useStore';

export { buildVipAnalyticsSnapshot, TELEGRAM_AVERAGE_BRAIN_PROFILE } from './analytics';


export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      language: initialState.language,
      soundEnabled: true,
      theme: 'blue',

      brainStats: normalizeBrainStats(DEFAULT_BRAIN_STATS),

      user: {
        id: initialUserRaw.id || 0,
        gameId: initialUserRaw.id ? generateGameId() : `G-${Math.floor(Math.random() * 1000000)}`,
        firstName: initialUserRaw.first_name || 'Guest',
        lastName: initialUserRaw.last_name || '',
        username: initialUserRaw.username || '',
        photoUrl: initialUserRaw.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initialUserRaw.first_name || 'Guest'}`,
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
                user: {
                  id: currentUser.id,
                  gameId: generateGameId(),
                  firstName: currentUser.first_name,
                  lastName: currentUser.last_name,
                  username: currentUser.username,
                  photoUrl: currentUser.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.first_name}`,
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

      tickets: [],
      eventParticipants: [],
      promotionEndISO: '2026-04-26T08:00:00.000Z',
      tournament: { ...initialState.tournament },

      dailyQuest: { ...DEFAULT_DAILY_QUEST },
      weeklyQuest: { ...DEFAULT_WEEKLY_QUEST },
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

      addGameResult: (result) => set((state) => {
        const now = new Date();
        const todayKey = toDateKey(now);
        const computedWeekendEvent = getWeekendEvent(now, state.user.id);
        const appliedCoinsEarned = Math.round((result.coinsEarned || 0) * (computedWeekendEvent.multiplier || 1));

        const xpGained = appliedCoinsEarned;
        const newXp = state.user.xp + xpGained;
        const newLevel = Math.floor(newXp / 1000) + 1;

        const newStats = applyBrainStatProgress(state.brainStats, result.gameId, 1);

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

        const finalDailyQuest = buildDailyQuestAfterGame(state.dailyQuest, result.gameId, todayKey);
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
          ...result,
          coinsEarned: appliedCoinsEarned,
          date: playedAt.split('T')[0],
          timestamp: playedAtTimestamp,
        };
        // Keep only the last 100 games to prevent localStorage overflow
        const updatedHistory = [...state.history, nextHistoryEntry].slice(-100);
        const nextTournament = buildTournamentStateAfterGame(state.tournament, result, playedAt);

        const shouldAddWorkoutNotification =
          Boolean(state.user.id) &&
          shouldShowFirstWorkoutNotification(state.user.id, result.gameId, playedAtTimestamp);

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
      }),

      fetchEntitlements: async () => {
        try {
          const response = await fetchEntitlementsApi();
          set({
            plan: response.plan,
            planExpiry: response.planExpiry,
          });
        } catch (error) {
          console.error('Failed to fetch entitlements:', error);
        }
      },

      buySkin: (skinId, cost) => {
        const { coins, skinInventory } = get();
        if (coins >= cost && !skinInventory.includes(skinId)) {
          const newState = {
            coins: coins - cost,
            skinInventory: [...skinInventory, skinId]
          };
          set(newState);
          if (isSupabaseConfigured) {
            syncUserToSupabase(newState, get().user.id);
          }
          return true;
        }
        return false;
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

        set(outcome.statePatch);
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

      claimChallengeReward: (challengeId) => set((state) => {
        const challenge = state.challenges.find(c => c.id === challengeId);
        if (!challenge || challenge.isClaimed || challenge.current < challenge.target) return state;

        return {
          coins: state.coins + challenge.reward,
          challenges: state.challenges.map(c => c.id === challengeId ? { ...c, isClaimed: true } : c
          )
        };
      }),

      watchAd: (reward) => set((state) => ({
        coins: state.coins + reward
      })),

      claimDailyReward: (amount) => set((state) => ({ coins: state.coins + amount })),

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

        let rewardToGive = task.reward;

        try {
          if (isSupabaseConfigured) {
            const { reward } = await claimSocialTaskApi(taskId);
            rewardToGive = reward;
          }
          
          const newState = {
            gems: (get().gems || 0) + rewardToGive,
            socialTasks: get().socialTasks.map(t => t.id === taskId ? { ...t, isClaimed: true } : t)
          };
          
          set(newState);
          
          if (isSupabaseConfigured && state.user.id) {
            syncUserToSupabase({ ...get(), ...newState }, state.user.id);
          }
        } catch (error) {
          console.error('Failed to claim social task:', error);
          // Fallback if API fails (e.g. database not configured properly)
          const newState = {
            gems: (get().gems || 0) + rewardToGive,
            socialTasks: get().socialTasks.map(t => t.id === taskId ? { ...t, isClaimed: true } : t)
          };
          set(newState);
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
        const newState = {
          unclaimedLevelRewards: get().unclaimedLevelRewards.filter(l => l !== level),
          coins: get().coins + 100,
          gems: (get().gems || 0) + 5
        };
        set(newState);
        if (isSupabaseConfigured) {
          syncUserToSupabase(newState, get().user.id);
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

        void persistTicket(newTicket, 'ticket_purchase');

        return { success: true, ticketNumber };
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
          language: initialState.language,
          soundEnabled: true,
          theme: 'light',
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
          hp: 100,
          maxHp: 100,
          dailyRewardStreak: { count: 0, lastClaimDate: null, claimedDates: [] },
          weeklyChallenge: { weekKey: null, dayProgress: {}, completedDays: [], isClaimed: false, reward: { coins: 250 } },
          weekendEvent: { weekendKey: null, isActive: false, multiplier: 1 },
          tournamentTickets: 0,
          tickets: [],
          eventParticipants: [],
          promotionEndISO: '2026-04-26T08:00:00.000Z',
          tournament: { ...initialState.tournament },
          dailyQuest: { ...DEFAULT_DAILY_QUEST },
          inventory: { freezes: 0, hints: 0, shields: 0 },
          weeklyQuest: { ...DEFAULT_WEEKLY_QUEST },
          energy: 100,
          maxEnergy: 100,
          lastEnergyRegenTime: Date.now(),
          streakProtection: 0,
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

      openMysteryBox: () => {
        const state = get();
        const outcome = rollMysteryBoxOutcome(state, Math.random(), Math.random());
        if (!outcome.mysteryBox) return null;

        if (outcome.statePatch) {
          set(outcome.statePatch);
        }

        return outcome.mysteryBox;
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
      storage: createJSONStorage(() => telegramStorage),
      merge: (persistedState, currentState) => {
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
        };
      },
    }
  )
);
