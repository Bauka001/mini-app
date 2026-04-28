import { describe, expect, it } from 'vitest';
import { buildClaimDailyLoginRewardResult, rollMysteryBoxOutcome } from './economy';
import { buildJoinTournamentOutcome } from './tournament';
import type { UserState } from './useStore';

describe('buildClaimDailyLoginRewardResult', () => {
  it('preserves streak for premium users after a 2-day gap', () => {
    const result = buildClaimDailyLoginRewardResult(
      {
        dailyRewardStreak: {
          count: 6,
          lastClaimDate: '2026-04-22',
          claimedDates: ['2026-04-20', '2026-04-21', '2026-04-22'],
        },
        plan: 'premium',
        planExpiry: Date.now() + 86_400_000,
        coins: 100,
        tournamentTickets: 0,
      },
      '2026-04-24'
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected success');
    }

    expect(result.reward.streakPreservedByVip).toBe(true);
    expect(result.statePatch.dailyRewardStreak.count).toBe(7);
    expect(result.statePatch.coins).toBe(300);
  });

  it('returns an empty reward when already claimed today', () => {
    const result = buildClaimDailyLoginRewardResult(
      {
        dailyRewardStreak: {
          count: 2,
          lastClaimDate: '2026-04-24',
          claimedDates: ['2026-04-23', '2026-04-24'],
        },
        plan: 'free',
        planExpiry: null,
        coins: 50,
        tournamentTickets: 1,
      },
      '2026-04-24'
    );

    expect(result).toEqual({
      success: false,
      reward: { coins: 0, gems: 0, xp: 0, tournamentTickets: 0 },
    });
  });
});

describe('buildJoinTournamentOutcome', () => {
  const baseState = {
    plan: 'premium',
    tournamentTickets: 1,
    tournament: {
      weekKey: null,
      joinedAt: null,
      paymentMethod: null,
      games: [],
      score: 0,
      vipFreeEntryWeek: null,
    },
  } satisfies Pick<UserState, 'plan' | 'tournament' | 'tournamentTickets'>;

  it('spends one ticket on ticket entry', () => {
    const result = buildJoinTournamentOutcome(baseState, 'ticket', new Date('2026-04-24T12:00:00.000Z'));

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected success');
    }

    expect(result.statePatch).toMatchObject({
      tournamentTickets: 0,
      tournament: {
        paymentMethod: 'ticket',
        games: [],
        score: 0,
      },
    });
  });

  it('blocks repeated VIP free entry in the same week', () => {
    const result = buildJoinTournamentOutcome(
      {
        ...baseState,
        tournament: {
          ...baseState.tournament,
          vipFreeEntryWeek: '2026-04-24',
        },
      },
      'vip',
      new Date('2026-04-24T12:00:00.000Z')
    );

    expect(result).toEqual({
      success: false,
      message: 'Осы аптадағы VIP тегін кіру әлдеқашан қолданылған.',
    });
  });
});

describe('rollMysteryBoxOutcome', () => {
  const baseState = {
    mysteryBoxAvailable: true,
    coins: 1000,
    mysteryBoxPrice: 500,
    gems: 10,
    fecBalance: 1.5,
    inventory: {
      freezes: 0,
      hints: 2,
      shields: 0,
    },
  } satisfies Pick<
    UserState,
    'mysteryBoxAvailable' | 'coins' | 'mysteryBoxPrice' | 'gems' | 'fecBalance' | 'inventory'
  >;

  it('returns booster reward with deterministic state patch', () => {
    const result = rollMysteryBoxOutcome(baseState, 0.7, 0.1);

    expect(result.mysteryBox).toMatchObject({
      type: 'booster',
      amount: 3,
      boosterType: 'hints',
    });
    expect(result.statePatch).toEqual({
      coins: 500,
      inventory: {
        freezes: 0,
        hints: 5,
        shields: 0,
      },
    });
  });

  it('returns null when user cannot open the box', () => {
    const result = rollMysteryBoxOutcome(
      {
        ...baseState,
        coins: 100,
      },
      0.95,
      0.5
    );

    expect(result).toEqual({ mysteryBox: null });
  });
});
