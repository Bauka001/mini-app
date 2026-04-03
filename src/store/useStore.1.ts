import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getTelegramUser } from '../utils/telegram';
import { telegramStorage } from './storage';
import { UserState, initialUserRaw, generateGameId, initialState, generateDailyChallenges, initialSocialTasks, Ticket, EventParticipant, Notification } from './useStore';
import { getUserByTelegramId, createUser, updateUser, subscribeToUserChanges, isSupabaseConfigured, DatabaseUser } from '../utils/supabase';
import { issueTicketRecord, submitFeedbackEntry } from '../utils/adminApi';

let supabaseChannel: ReturnType<typeof subscribeToUserChanges> | null = null;

const mapDbUserToState = (dbUser: DatabaseUser) => ({
  coins: dbUser.coins,
  gems: dbUser.gems,
  xp: dbUser.xp,
  level: dbUser.level,
  brainStats: dbUser.brain_stats,
  skinInventory: dbUser.skin_inventory,
  activeSkin: dbUser.active_skin,
  plan: dbUser.plan,
  planExpiry: dbUser.plan_expiry,
  hp: dbUser.hp,
  maxHp: dbUser.max_hp,
  fecBalance: dbUser.fec_balance,
  inventory: dbUser.inventory,
  dailyGoalMinutes: dbUser.daily_goal_minutes,
  streak: dbUser.streak,
  dailyRewardStreak: dbUser.daily_reward_streak,
  lastDailyRewardDate: dbUser.last_daily_reward_date,
  promotionEndISO: dbUser.promotion_end_iso,
  dailyQuest: dbUser.daily_quest,
});

const mapStateToDbUser = (state: any, telegramId: number) => ({
  telegram_id: telegramId,
  first_name: state.user.firstName,
  last_name: state.user.lastName,
  username: state.user.username,
  photo_url: state.user.photoUrl,
  coins: state.coins,
  gems: state.gems,
  xp: state.xp,
  level: state.level,
  brain_stats: state.brainStats,
  skin_inventory: state.skinInventory,
  active_skin: state.activeSkin,
  plan: state.plan,
  plan_expiry: state.planExpiry,
  hp: state.hp,
  max_hp: state.maxHp,
  fec_balance: state.fecBalance,
  inventory: state.inventory,
  daily_goal_minutes: state.dailyGoalMinutes,
  streak: state.streak,
  daily_reward_streak: state.dailyRewardStreak,
  last_daily_reward_date: state.lastDailyRewardDate,
  promotion_end_iso: state.promotionEndISO,
  daily_quest: state.dailyQuest,
});

const syncUserToSupabase = async (state: any, telegramId: number) => {
  if (!isSupabaseConfigured) return;
  try {
    const dbData = mapStateToDbUser(state, telegramId);
    const existing = await getUserByTelegramId(telegramId);
    if (existing) {
      await updateUser(telegramId, dbData);
    } else {
      await createUser({ ...dbData, id: 0 } as any);
    }
  } catch (err) {
    console.error('[Supabase] Sync error:', err);
  }
};

const subscribeToSupabaseChanges = (telegramId: number, setState: (partial: any) => void) => {
  if (!isSupabaseConfigured) return;

  if (supabaseChannel) {
    supabaseChannel.unsubscribe();
  }

  supabaseChannel = subscribeToUserChanges(telegramId, (dbUser) => {
    const mapped = mapDbUserToState(dbUser);
    setState({
      coins: mapped.coins,
      gems: mapped.gems,
      xp: mapped.xp,
      level: mapped.level,
      brainStats: mapped.brainStats,
      skinInventory: mapped.skinInventory,
      activeSkin: mapped.activeSkin,
      plan: mapped.plan,
      planExpiry: mapped.planExpiry,
      hp: mapped.hp,
      maxHp: mapped.maxHp,
      fecBalance: mapped.fecBalance,
      inventory: mapped.inventory,
      dailyGoalMinutes: mapped.dailyGoalMinutes,
      streak: mapped.streak,
      dailyRewardStreak: mapped.dailyRewardStreak,
      lastDailyRewardDate: mapped.lastDailyRewardDate,
      promotionEndISO: mapped.promotionEndISO,
      dailyQuest: mapped.dailyQuest,
    });
  });
};

const loadUserFromSupabase = async (telegramId: number, setState: (partial: any) => void) => {
  if (!isSupabaseConfigured) return;
  try {
    const dbUser = await getUserByTelegramId(telegramId);
    if (dbUser) {
      const mapped = mapDbUserToState(dbUser);
      setState(mapped);
    }
  } catch (err) {
    console.error('[Supabase] Load error:', err);
  }
};

const persistFeedbackEntry = async (
  feedback: { userId: number; username: string; text: string; imageUrl?: string }
) => {
  try {
    await submitFeedbackEntry({
      userTelegramId: feedback.userId,
      username: feedback.username,
      text: feedback.text,
      imageUrl: feedback.imageUrl,
    });
  } catch (error) {
    console.error('[Admin API] Feedback sync error:', error);
  }
};

const persistTicket = async (ticket: Ticket, source: 'plan_upgrade' | 'ticket_purchase') => {
  try {
    await issueTicketRecord({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userTelegramId: ticket.userId,
      userName: ticket.userName,
      eventName: ticket.eventName,
      eventDate: ticket.eventDate,
      price: ticket.price,
      purchaseDate: ticket.purchaseDate,
      source,
    });
  } catch (error) {
    console.error('[Admin API] Ticket sync error:', error);
  }
};


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
              console.log('[Store] User switch detected, resetting state');
              if (isSupabaseConfigured) {
                loadUserFromSupabase(currentUser.id, set);
                subscribeToSupabaseChanges(currentUser.id, set);
              }
              return {
                ...initialState,
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
            }

            if (isSupabaseConfigured) {
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

      dailyRewardStreak: 0,
      lastDailyRewardDate: null,

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

        const updatedChallenges = state.challenges.map(ch => {
          if (ch.isClaimed) return ch;
          if (ch.type === 'play_count') return { ...ch, current: ch.current + 1 };
          if (ch.type === 'total_coins') return { ...ch, current: ch.current + result.coinsEarned };
          return ch;
        });

        const today = new Date().toISOString().split('T')[0];
        const needsReset = state.dailyQuest.lastResetDate !== today;
        const newGamesPlayed = needsReset
          ? [result.gameId]
          : [...state.dailyQuest.gamesPlayed, result.gameId];
        const uniqueGames = new Set(newGamesPlayed);
        const isNowComplete = uniqueGames.size >= 3;

        let finalDailyQuest = state.dailyQuest;
        if (needsReset) {
          finalDailyQuest = {
            id: 'daily_quest_3games',
            gamesPlayed: [result.gameId],
            isCompleted: uniqueGames.size >= 3,
            isClaimed: false,
            lastResetDate: today
          };
        } else {
          finalDailyQuest = {
            ...state.dailyQuest,
            gamesPlayed: [...state.dailyQuest.gamesPlayed, result.gameId],
            isCompleted: state.dailyQuest.isCompleted || isNowComplete
          };
        }

        const newState = {
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
          dailyQuest: finalDailyQuest
        };

        if (isSupabaseConfigured && state.user.id) {
          syncUserToSupabase(newState, state.user.id);
        }

        return newState;
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

        const newState = {
          plan,
          planExpiry: newExpiry,
          hp: state.maxHp,
          tickets: [...state.tickets, newTicket],
          eventParticipants: [...state.eventParticipants, newParticipant]
        };

        void persistTicket(newTicket, 'plan_upgrade');

        if (isSupabaseConfigured) {
          syncUserToSupabase(newState, state.user.id);
        }

        return newState;
      }),

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

      equipSkin: (skinId) => set({ activeSkin: skinId }),

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
          challenges: state.challenges.map(c => c.id === challengeId ? { ...c, isClaimed: true } : c
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
          socialTasks: state.socialTasks.map(t => t.id === taskId ? { ...t, isClaimed: true } : t
          )
        };
      }),

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
          message: `"${feedback.text.substring(0, 20)}..." хабарламаңызға жауап: ${reply}`,
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
      }),

      checkDailyQuestComplete: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        
        if (state.dailyQuest.lastResetDate !== today) {
          set({
            dailyQuest: {
              id: 'daily_quest_3games',
              gamesPlayed: [],
              isCompleted: false,
              isClaimed: false,
              lastResetDate: today
            }
          });
          return false;
        }
        
        const uniqueGames = new Set(state.dailyQuest.gamesPlayed);
        const isComplete = uniqueGames.size >= 3;
        
        if (isComplete && !state.dailyQuest.isCompleted) {
          set((s) => ({
            dailyQuest: { ...s.dailyQuest, isCompleted: true }
          }));
          return true;
        }
        
        return isComplete;
      },

      claimDailyQuestReward: () => set((state) => {
        if (!state.dailyQuest.isCompleted || state.dailyQuest.isClaimed) return state;
        
        const uniqueGames = new Set(state.dailyQuest.gamesPlayed);
        if (uniqueGames.size < 3) return state;
        
        return {
          coins: state.coins + 50,
          dailyQuest: { ...state.dailyQuest, isClaimed: true }
        };
      }),

      logout: () => set(() => {
        // Clear Telegram storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('focus-storage-v17');
        }

        // Reset to initial state
        return {
          language: 'ru',
          soundEnabled: true,
          theme: 'light',
          brainStats: { focus: 20, memory: 20, logic: 20, speed: 20, flexibility: 20 },
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
          lastDailyRewardDate: null,
          challenges: generateDailyChallenges(),
          lastChallengeDate: new Date().toISOString().split('T')[0],
          socialTasks: initialSocialTasks,
          feedbacks: [],
          notifications: [],
          plan: 'free',
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
      })
    }),
    {
      name: `focus-app-v30-prod`,
      storage: createJSONStorage(() => telegramStorage),
    }
  )
);
