import type { TFunction } from 'i18next';
import type { CaseDefinition, CaseId, MysteryBox } from '../../store/useStore';
import { CASE_DEFINITIONS, buildReward, pickByProbability, type CaseRollState } from '../../store/cases';

type RewardPresentation = {
  icon: string;
  title: string;
  label: string;
  description: string;
  rarity: string;
  accentClass: string;
  glowClass: string;
  imageUrl?: string;
  stateMessage?: string;
};

type CaseTheme = {
  frameClass: string;
  glowClass: string;
  chipClass: string;
};

type ReelItem = RewardPresentation & { id: string };

const skinNameKeys: Record<string, string> = {
  default: 'skin_classic',
  neon_blue: 'skin_neon',
  royal_purple: 'skin_purple',
  matrix: 'skin_matrix',
  premium_gold: 'skin_premium_gold',
};

const boosterNameKeys: Record<NonNullable<MysteryBox['boosterType']>, string> = {
  freezes: 'shop_case_booster_freezes',
  hints: 'shop_case_booster_hints',
  shields: 'shop_case_booster_shields',
};

const rarityKeys: Record<MysteryBox['type'], string> = {
  coins: 'shop_case_rarity_common',
  crystals: 'shop_case_rarity_rare',
  booster: 'shop_case_rarity_rare',
  fec: 'shop_case_rarity_epic',
  skin: 'shop_case_rarity_legendary',
  raffle_ticket: 'shop_case_rarity_legendary',
  iphone_17: 'shop_case_rarity_mythic',
};

const rarityStyles: Record<MysteryBox['type'], Pick<RewardPresentation, 'accentClass' | 'glowClass'>> = {
  coins: {
    accentClass: 'from-amber-300 via-yellow-300 to-orange-400',
    glowClass: 'shadow-[0_0_36px_rgba(251,191,36,0.35)]',
  },
  crystals: {
    accentClass: 'from-cyan-300 via-sky-300 to-blue-400',
    glowClass: 'shadow-[0_0_36px_rgba(56,189,248,0.32)]',
  },
  booster: {
    accentClass: 'from-pink-300 via-rose-300 to-red-400',
    glowClass: 'shadow-[0_0_36px_rgba(251,113,133,0.32)]',
  },
  fec: {
    accentClass: 'from-emerald-300 via-teal-300 to-cyan-400',
    glowClass: 'shadow-[0_0_36px_rgba(45,212,191,0.32)]',
  },
  skin: {
    accentClass: 'from-fuchsia-300 via-violet-300 to-purple-400',
    glowClass: 'shadow-[0_0_42px_rgba(192,132,252,0.42)]',
  },
  raffle_ticket: {
    accentClass: 'from-amber-200 via-yellow-300 to-orange-400',
    glowClass: 'shadow-[0_0_48px_rgba(251,191,36,0.5)]',
  },
  iphone_17: {
    accentClass: 'from-sky-200 via-cyan-200 to-white',
    glowClass: 'shadow-[0_0_52px_rgba(125,211,252,0.55)]',
  },
};

export const getCaseTheme = (caseId: CaseId): CaseTheme => {
  switch (caseId) {
    case 'basic_case':
      return {
        frameClass: 'border-cyan-400/20 bg-[linear-gradient(160deg,rgba(17,24,39,0.98),rgba(8,47,73,0.92))]',
        glowClass: 'shadow-[0_0_40px_rgba(34,211,238,0.14)]',
        chipClass: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100',
      };
    case 'rare_case':
      return {
        frameClass: 'border-violet-400/20 bg-[linear-gradient(160deg,rgba(24,24,38,0.98),rgba(59,7,100,0.92))]',
        glowClass: 'shadow-[0_0_44px_rgba(168,85,247,0.16)]',
        chipClass: 'border-violet-300/20 bg-violet-400/10 text-violet-100',
      };
    case 'legendary_case':
      return {
        frameClass: 'border-amber-300/20 bg-[linear-gradient(160deg,rgba(28,25,23,0.98),rgba(120,53,15,0.9))]',
        glowClass: 'shadow-[0_0_48px_rgba(251,191,36,0.18)]',
        chipClass: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
      };
  }
};

export const getCaseIcon = (caseId: CaseId): string => {
  switch (caseId) {
    case 'basic_case': return '📦';
    case 'rare_case': return '💼';
    case 'legendary_case': return '🧰';
    default: return '🎁';
  }
};

export const formatCasePrice = (caseDefinition: CaseDefinition, t: TFunction) => {
  if (caseDefinition.priceCurrency === 'gems') {
    return t('shop_case_price_crystals', { price: caseDefinition.price });
  }

  return t('shop_case_price_coins', { price: caseDefinition.price });
};

export const getRewardTypeLabel = (
  rewardType: MysteryBox['type'],
  t: TFunction,
  boosterType?: MysteryBox['boosterType']
) => {
  if (rewardType === 'booster' && boosterType) {
    return t(boosterNameKeys[boosterType]);
  }

  const rewardTypeKeys: Record<MysteryBox['type'], string> = {
    coins: 'shop_case_reward_type_coins',
    crystals: 'shop_case_reward_type_crystals',
    fec: 'shop_case_reward_type_fec',
    skin: 'shop_case_reward_type_skin',
    booster: 'shop_case_reward_type_booster',
    raffle_ticket: 'shop_case_reward_type_raffle_ticket',
    iphone_17: 'shop_case_reward_type_iphone_17',
  };

  return t(rewardTypeKeys[rewardType]);
};

export const getRewardPresentation = (
  reward: MysteryBox,
  t: TFunction
): RewardPresentation => {
  if (reward.type === 'coins') {
    return {
      icon: '🪙',
      title: `+${reward.amount}`,
      label: `${reward.amount} ${t('shop_case_reward_type_coins')}`,
      description: t('shop_case_reward_coins_desc'),
      rarity: t(rarityKeys[reward.type]),
      ...rarityStyles[reward.type],
    };
  }

  if (reward.type === 'crystals') {
    return {
      icon: '💎',
      title: `+${reward.amount}`,
      label: `${reward.amount} ${t('shop_case_reward_type_crystals')}`,
      description: t('shop_case_reward_crystals_desc'),
      rarity: t(rarityKeys[reward.type]),
      ...rarityStyles[reward.type],
    };
  }

  if (reward.type === 'fec') {
    return {
      icon: '✨',
      title: `+${reward.amount}`,
      label: `+${reward.amount} FEC`,
      description: t('shop_case_reward_fec_desc'),
      rarity: t(rarityKeys[reward.type]),
      ...rarityStyles[reward.type],
    };
  }

  if (reward.type === 'booster') {
    const boosterLabel = getRewardTypeLabel('booster', t, reward.boosterType);

    return {
      icon: '🧠',
      title: `+${reward.amount}`,
      label: `+${reward.amount} ${boosterLabel}`,
      description: t('shop_case_reward_booster_desc', { booster: boosterLabel }),
      rarity: t(rarityKeys[reward.type]),
      ...rarityStyles[reward.type],
    };
  }

  if (reward.type === 'raffle_ticket') {
    return {
      icon: '🎟️',
      title: t('shop_case_reward_raffle_ticket_title'),
      label: t('shop_case_reward_type_raffle_ticket'),
      description: t('shop_case_reward_raffle_ticket_desc'),
      rarity: t(rarityKeys[reward.type]),
      imageUrl: reward.prizeImageUrl,
      stateMessage: t('shop_case_reward_raffle_ticket_state'),
      ...rarityStyles[reward.type],
    };
  }

  if (reward.type === 'iphone_17') {
    return {
      icon: '📱',
      title: reward.prizeTitle || 'iPhone 17',
      label: t('shop_case_reward_type_iphone_17'),
      description: t('shop_case_reward_iphone_17_desc'),
      rarity: t(rarityKeys[reward.type]),
      imageUrl: reward.prizeImageUrl,
      stateMessage: t('shop_case_reward_iphone_17_state'),
      ...rarityStyles[reward.type],
    };
  }

  const skinName = t(skinNameKeys[reward.skinId || 'default']);

  return {
    icon: '🎨',
    title: skinName,
    label: skinName,
    description: t('shop_case_reward_skin_desc'),
    rarity: t(rarityKeys[reward.type]),
    ...rarityStyles[reward.type],
  };
};

export const getCaseProbabilityLabel = (rewardType: MysteryBox['type'], t: TFunction) => {
  return getRewardTypeLabel(rewardType, t);
};

export const buildCaseOpeningReel = (
  caseId: CaseId,
  reward: MysteryBox,
  t: TFunction,
  targetIndex = 40
): ReelItem[] => {
  const caseDef = CASE_DEFINITIONS[caseId];
  const dummyState: CaseRollState = {
    coins: 0,
    gems: 0,
    fecBalance: 0,
    inventory: { freezes: 0, hints: 0, shields: 0 },
    skinInventory: [],
    freeMysteryBoxes: 0,
    premiumGiftMysteryBoxes: 0,
    user: {
      id: 0,
      gameId: 'preview',
      firstName: 'Preview',
      lastName: '',
      username: '',
      photoUrl: '',
      level: 1,
      xp: 0,
      achievements: [],
    },
    tickets: [],
    eventParticipants: [],
    promotionEndISO: null,
  };

  return Array.from({ length: targetIndex + 10 }, (_, index) => {
    let reelReward: MysteryBox;

    if (index === targetIndex) {
      reelReward = reward;
    } else {
      // Use true case probabilities to generate filler items
      const randomType = pickByProbability(caseDef.probabilities, Math.random());
      reelReward = buildReward(caseId, randomType, Math.random(), Math.random(), dummyState);
    }

    return {
      ...getRewardPresentation(reelReward, t),
      id: `${reelReward.type}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    };
  });
};

export const getCaseBadges = (caseDefinition: CaseDefinition, t: TFunction) => {
  return caseDefinition.previewRewardTypes.map((rewardType) => ({
    id: `${caseDefinition.id}-${rewardType}`,
    label: getCaseProbabilityLabel(rewardType, t),
  }));
};

export const getCasePreviewRewards = (caseDefinition: CaseDefinition, t: TFunction) => {
  const previewRewards: Record<MysteryBox['type'], MysteryBox> = {
    coins: {
      id: `${caseDefinition.id}-preview-coins`,
      type: 'coins',
      amount: caseDefinition.id === 'basic_case' ? 180 : caseDefinition.id === 'rare_case' ? 360 : 720,
    },
    crystals: {
      id: `${caseDefinition.id}-preview-crystals`,
      type: 'crystals',
      amount: caseDefinition.id === 'basic_case' ? 6 : caseDefinition.id === 'rare_case' ? 14 : 28,
    },
    fec: {
      id: `${caseDefinition.id}-preview-fec`,
      type: 'fec',
      amount: caseDefinition.id === 'basic_case' ? 0.55 : caseDefinition.id === 'rare_case' ? 1.4 : 3.2,
    },
    skin: {
      id: `${caseDefinition.id}-preview-skin`,
      type: 'skin',
      amount: 1,
      skinId:
        caseDefinition.id === 'basic_case'
          ? 'neon_blue'
          : caseDefinition.id === 'rare_case'
            ? 'royal_purple'
            : 'premium_gold',
    },
    booster: {
      id: `${caseDefinition.id}-preview-booster`,
      type: 'booster',
      amount: caseDefinition.id === 'basic_case' ? 1 : caseDefinition.id === 'rare_case' ? 2 : 3,
      boosterType: caseDefinition.id === 'legendary_case' ? 'shields' : 'hints',
    },
    raffle_ticket: {
      id: `${caseDefinition.id}-preview-raffle-ticket`,
      type: 'raffle_ticket',
      amount: 1,
      prizeTitle: 'Champions League Pass',
      prizeImageUrl: '/mustang.jpg',
      eventName: 'Brain Champions League — Bonus Entry',
      eventDate: new Date().toISOString(),
      ticketNumber: 12345678,
    },
    iphone_17: {
      id: `${caseDefinition.id}-preview-iphone-17`,
      type: 'iphone_17',
      amount: 1,
      prizeTitle: 'iPhone 17',
      prizeImageUrl: '/iphone-17-prize.svg',
    },
  };

  return caseDefinition.previewRewardTypes.map((rewardType) => ({
    id: `${caseDefinition.id}-${rewardType}`,
    ...getRewardPresentation(previewRewards[rewardType], t),
  }));
};
