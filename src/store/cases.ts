import type {
  CaseDefinition,
  CaseId,
  CaseOpenResult,
  MysteryBox,
  UserState,
} from './useStore';

export type CaseRollState = Pick<
  UserState,
  | 'coins'
  | 'gems'
  | 'fecBalance'
  | 'inventory'
  | 'skinInventory'
  | 'freeMysteryBoxes'
  | 'premiumGiftMysteryBoxes'
  | 'user'
  | 'tickets'
  | 'eventParticipants'
  | 'promotionEndISO'
>;

type CaseRollOutcome = CaseOpenResult & {
  statePatch?: Partial<UserState>;
};

const roundTo = (value: number, digits = 2) => {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
};

const randomInt = (min: number, max: number, seed: number) => {
  return Math.floor(min + seed * (max - min + 1));
};

const randomFloat = (min: number, max: number, seed: number) => {
  return roundTo(min + seed * (max - min), 2);
};

export const pickByProbability = (
  probabilities: CaseDefinition['probabilities'],
  randomValue: number
): MysteryBox['type'] => {
  let cursor = 0;

  for (const entry of probabilities) {
    cursor += entry.probability;
    if (randomValue <= cursor) {
      return entry.type;
    }
  }

  return probabilities[probabilities.length - 1]?.type ?? 'coins';
};

const buildCasePriceMeta = (caseId: CaseId, state: CaseRollState) => {
  const definition = CASE_DEFINITIONS[caseId];
  const freeOpenSource =
    state.premiumGiftMysteryBoxes > 0
      ? 'premium_gift'
      : state.freeMysteryBoxes > 0
        ? 'starter'
        : null;
  const usedFreeOpen = freeOpenSource !== null;

  return {
    definition,
    usedFreeOpen,
    freeOpenSource,
    effectivePrice: usedFreeOpen ? 0 : definition.price,
    effectiveCurrency: usedFreeOpen ? definition.priceCurrency : definition.priceCurrency,
  };
};

const CASE_SKIN_POOLS: Record<CaseId, string[]> = {
  basic_case: ['neon_blue', 'royal_purple'],
  rare_case: ['royal_purple', 'matrix', 'premium_gold'],
  legendary_case: ['matrix', 'premium_gold'],
};

const CASE_BOOSTER_POOLS: Record<CaseId, Array<NonNullable<MysteryBox['boosterType']>>> = {
  basic_case: ['hints', 'freezes'],
  rare_case: ['hints', 'freezes', 'shields'],
  legendary_case: ['hints', 'freezes', 'shields'],
};

const DUPLICATE_SKIN_FALLBACK_COINS: Record<CaseId, number> = {
  basic_case: 220,
  rare_case: 520,
  legendary_case: 1100,
};

const CAR_RAFFLE_EVENT_NAME = 'Legendary Car Raffle';
const CAR_RAFFLE_TICKET_IMAGE_URL = '/mustang.jpg';
const IPHONE_17_IMAGE_URL = '/iphone-17-prize.svg';

const createTicketNumber = () => Math.floor(Math.random() * 90000000) + 10000000;

// Probability balance is explicit so the UI can surface exact drop rates to players.
export const CASE_DEFINITIONS: Record<CaseId, CaseDefinition> = {
  basic_case: {
    id: 'basic_case',
    titleKey: 'shop_case_basic_title',
    subtitleKey: 'shop_case_basic_subtitle',
    descriptionKey: 'shop_case_basic_desc',
    price: 500,
    priceCurrency: 'coins',
    probabilities: [
      { type: 'coins', probability: 0.45 },
      { type: 'crystals', probability: 0.25 },
      { type: 'booster', probability: 0.15 },
      { type: 'fec', probability: 0.12 },
      { type: 'skin', probability: 0.03 },
    ],
    previewRewardTypes: ['coins', 'crystals', 'booster', 'fec', 'skin'],
  },
  rare_case: {
    id: 'rare_case',
    titleKey: 'shop_case_rare_title',
    subtitleKey: 'shop_case_rare_subtitle',
    descriptionKey: 'shop_case_rare_desc',
    price: 50,
    priceCurrency: 'gems',
    probabilities: [
      { type: 'coins', probability: 0.28 },
      { type: 'crystals', probability: 0.24 },
      { type: 'booster', probability: 0.18 },
      { type: 'fec', probability: 0.2 },
      { type: 'skin', probability: 0.1 },
    ],
    previewRewardTypes: ['coins', 'crystals', 'booster', 'fec', 'skin'],
  },
  legendary_case: {
    id: 'legendary_case',
    titleKey: 'shop_case_legendary_title',
    subtitleKey: 'shop_case_legendary_subtitle',
    descriptionKey: 'shop_case_legendary_desc',
    price: 100,
    priceCurrency: 'gems',
    probabilities: [
      { type: 'coins', probability: 0.17 },
      { type: 'crystals', probability: 0.19 },
      { type: 'booster', probability: 0.17 },
      { type: 'fec', probability: 0.25 },
      { type: 'skin', probability: 0.2 },
      { type: 'raffle_ticket', probability: 0.01 },
      { type: 'iphone_17', probability: 0.01 },
    ],
    previewRewardTypes: ['coins', 'crystals', 'booster', 'fec', 'skin', 'raffle_ticket', 'iphone_17'],
  },
};

export const CASE_LIST = Object.values(CASE_DEFINITIONS);

export const buildReward = (
  caseId: CaseId,
  rewardType: MysteryBox['type'],
  amountSeed: number,
  variantSeed: number,
  state: CaseRollState
): MysteryBox => {
  if (rewardType === 'coins') {
    const amountByCase: Record<CaseId, [number, number]> = {
      basic_case: [120, 260],
      rare_case: [260, 520],
      legendary_case: [520, 1200],
    };
    const [min, max] = amountByCase[caseId];

    return {
      id: `${caseId}-coins-${Date.now()}`,
      type: 'coins',
      amount: randomInt(min, max, amountSeed),
    };
  }

  if (rewardType === 'crystals') {
    const amountByCase: Record<CaseId, [number, number]> = {
      basic_case: [3, 8],
      rare_case: [8, 16],
      legendary_case: [16, 36],
    };
    const [min, max] = amountByCase[caseId];

    return {
      id: `${caseId}-crystals-${Date.now()}`,
      type: 'crystals',
      amount: randomInt(min, max, amountSeed),
    };
  }

  if (rewardType === 'fec') {
    const amountByCase: Record<CaseId, [number, number]> = {
      basic_case: [0.3, 0.85],
      rare_case: [0.95, 1.9],
      legendary_case: [2.1, 4.6],
    };
    const [min, max] = amountByCase[caseId];

    return {
      id: `${caseId}-fec-${Date.now()}`,
      type: 'fec',
      amount: randomFloat(min, max, amountSeed),
    };
  }

  if (rewardType === 'booster') {
    const amountByCase: Record<CaseId, [number, number]> = {
      basic_case: [1, 2],
      rare_case: [2, 3],
      legendary_case: [3, 5],
    };
    const pool = CASE_BOOSTER_POOLS[caseId];
    const boosterType = pool[Math.min(pool.length - 1, Math.floor(variantSeed * pool.length))];
    const [min, max] = amountByCase[caseId];

    return {
      id: `${caseId}-booster-${Date.now()}`,
      type: 'booster',
      amount: randomInt(min, max, amountSeed),
      boosterType,
    };
  }

  if (rewardType === 'raffle_ticket') {
    return {
      id: `${caseId}-raffle-ticket-${Date.now()}`,
      type: 'raffle_ticket',
      amount: 1,
      prizeTitle: 'Car Raffle Ticket',
      prizeImageUrl: CAR_RAFFLE_TICKET_IMAGE_URL,
      eventName: CAR_RAFFLE_EVENT_NAME,
      eventDate: state.promotionEndISO || new Date().toISOString(),
      ticketNumber: createTicketNumber(),
    };
  }

  if (rewardType === 'iphone_17') {
    return {
      id: `${caseId}-iphone-17-${Date.now()}`,
      type: 'iphone_17',
      amount: 1,
      prizeTitle: 'iPhone 17',
      prizeImageUrl: IPHONE_17_IMAGE_URL,
    };
  }

  const skinPool = CASE_SKIN_POOLS[caseId];
  const skinId = skinPool[Math.min(skinPool.length - 1, Math.floor(variantSeed * skinPool.length))];

  if (state.skinInventory.includes(skinId)) {
    return {
      id: `${caseId}-duplicate-skin-${Date.now()}`,
      type: 'coins',
      amount: DUPLICATE_SKIN_FALLBACK_COINS[caseId],
    };
  }

  return {
    id: `${caseId}-skin-${Date.now()}`,
    type: 'skin',
    amount: 1,
    skinId,
  };
};

const buildStatePatch = (
  state: CaseRollState,
  reward: MysteryBox,
  effectivePrice: number,
  effectiveCurrency: 'coins' | 'gems',
  usedFreeOpen: boolean,
  freeOpenSource: 'premium_gift' | 'starter' | null
): Partial<UserState> => {
  const baseCoins = effectiveCurrency === 'coins' ? state.coins - effectivePrice : state.coins;
  const baseGems = effectiveCurrency === 'gems' ? state.gems - effectivePrice : state.gems;
  const nextFreeMysteryBoxes =
    usedFreeOpen && freeOpenSource === 'starter'
      ? Math.max(0, state.freeMysteryBoxes - 1)
      : state.freeMysteryBoxes;
  const nextPremiumGiftMysteryBoxes =
    usedFreeOpen && freeOpenSource === 'premium_gift'
      ? Math.max(0, state.premiumGiftMysteryBoxes - 1)
      : state.premiumGiftMysteryBoxes;

  if (reward.type === 'coins') {
    return {
      coins: baseCoins + reward.amount,
      gems: baseGems,
      freeMysteryBoxes: nextFreeMysteryBoxes,
      premiumGiftMysteryBoxes: nextPremiumGiftMysteryBoxes,
    };
  }

  if (reward.type === 'crystals') {
    return {
      coins: baseCoins,
      gems: baseGems + reward.amount,
      freeMysteryBoxes: nextFreeMysteryBoxes,
      premiumGiftMysteryBoxes: nextPremiumGiftMysteryBoxes,
    };
  }

  if (reward.type === 'fec') {
    return {
      coins: baseCoins,
      gems: baseGems,
      fecBalance: roundTo(state.fecBalance + reward.amount, 2),
      freeMysteryBoxes: nextFreeMysteryBoxes,
      premiumGiftMysteryBoxes: nextPremiumGiftMysteryBoxes,
    };
  }

  if (reward.type === 'booster' && reward.boosterType) {
    return {
      coins: baseCoins,
      gems: baseGems,
      freeMysteryBoxes: nextFreeMysteryBoxes,
      premiumGiftMysteryBoxes: nextPremiumGiftMysteryBoxes,
      inventory: {
        ...state.inventory,
        [reward.boosterType]: state.inventory[reward.boosterType] + reward.amount,
      },
    };
  }

  if (reward.type === 'raffle_ticket' && reward.ticketNumber && reward.eventName && reward.eventDate) {
    return {
      coins: baseCoins,
      gems: baseGems,
      freeMysteryBoxes: nextFreeMysteryBoxes,
      premiumGiftMysteryBoxes: nextPremiumGiftMysteryBoxes,
      tickets: [
        ...state.tickets,
        {
          id: reward.id,
          ticketNumber: reward.ticketNumber,
          eventName: reward.eventName,
          eventDate: reward.eventDate,
          price: 0,
          purchaseDate: new Date().toISOString(),
          userId: state.user.id,
          userName: state.user.firstName,
          isUsed: false,
        },
      ],
      eventParticipants: [
        ...state.eventParticipants,
        {
          ticketId: reward.id,
          ticketNumber: reward.ticketNumber,
          userId: state.user.id,
          userName: state.user.firstName,
          userPhoto: state.user.photoUrl,
          purchaseDate: new Date().toISOString(),
          isVerified: false,
        },
      ],
    };
  }

  if (reward.type === 'iphone_17') {
    return {
      coins: baseCoins,
      gems: baseGems,
      freeMysteryBoxes: nextFreeMysteryBoxes,
      premiumGiftMysteryBoxes: nextPremiumGiftMysteryBoxes,
    };
  }

  return {
    coins: baseCoins,
    gems: baseGems,
    freeMysteryBoxes: nextFreeMysteryBoxes,
    premiumGiftMysteryBoxes: nextPremiumGiftMysteryBoxes,
    skinInventory: state.skinInventory.includes(reward.skinId || '')
      ? state.skinInventory
      : [...state.skinInventory, reward.skinId as string],
  };
};

export const rollCaseOutcome = (
  state: CaseRollState,
  caseId: CaseId,
  rewardSeed: number,
  amountSeed: number,
  variantSeed: number
): CaseRollOutcome => {
  const { definition, effectivePrice, effectiveCurrency, usedFreeOpen, freeOpenSource } = buildCasePriceMeta(caseId, state);

  if (effectivePrice > 0 && effectiveCurrency === 'coins' && state.coins < effectivePrice) {
    return {
      success: false,
      reward: null,
      error: 'not_enough_coins',
      caseId,
    };
  }

  if (effectivePrice > 0 && effectiveCurrency === 'gems' && state.gems < effectivePrice) {
    return {
      success: false,
      reward: null,
      error: 'not_enough_crystals',
      caseId,
    };
  }

  const rewardType = pickByProbability(definition.probabilities, rewardSeed);
  const reward = buildReward(caseId, rewardType, amountSeed, variantSeed, state);

  return {
    success: true,
    reward,
    caseId,
    spentCoins: effectiveCurrency === 'coins' ? effectivePrice : 0,
    spentGems: effectiveCurrency === 'gems' ? effectivePrice : 0,
    usedFreeOpen,
    statePatch: buildStatePatch(state, reward, effectivePrice, effectiveCurrency, usedFreeOpen, freeOpenSource),
  };
};
