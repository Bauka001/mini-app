export interface ProfileAvatar {
  id: string;
  name: {
    en: string;
    ru: string;
    kz: string;
  };
  emoji?: string;
  imageUrl?: string;
  isPremium: boolean;
  previewClass?: string;
}

type DicebearStyle =
  | 'adventurer-neutral'
  | 'avataaars-neutral'
  | 'big-smile'
  | 'lorelei-neutral'
  | 'micah'
  | 'notionists-neutral'
  | 'open-peeps'
  | 'personas';

export const buildDicebearAvatar = (style: DicebearStyle, seed: string) =>
  `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

export const getDefaultAvatarUrl = (seed: string) => buildDicebearAvatar('adventurer-neutral', seed);

export const getProfileAvatarImage = (avatar: ProfileAvatar) => {
  if (avatar.imageUrl) {
    return avatar.imageUrl;
  }

  return getDefaultAvatarUrl(avatar.name.en || avatar.id || 'Player');
};

export const PROFILE_AVATARS: ProfileAvatar[] = [
  {
    id: 'default',
    name: {
      en: 'Classic',
      ru: 'Классика',
      kz: 'Классика'
    },
    emoji: '✨',
    imageUrl: buildDicebearAvatar('adventurer-neutral', 'classic-focus'),
    previewClass: 'bg-secondary text-white border border-gray-700',
    isPremium: false
  },
  {
    id: 'neon_blue',
    name: {
      en: 'Neon Blue',
      ru: 'Неоновый синий',
      kz: 'Неон көк'
    },
    emoji: '💙',
    imageUrl: buildDicebearAvatar('micah', 'neon-blue-focus'),
    previewClass: 'bg-blue-900/40 text-blue-100 border border-blue-500 shadow-blue-500/20',
    isPremium: false
  },
  {
    id: 'royal_purple',
    name: {
      en: 'Royal Purple',
      ru: 'Королевский пурпурный',
      kz: 'Патша күлгін'
    },
    emoji: '💜',
    imageUrl: buildDicebearAvatar('lorelei-neutral', 'royal-purple-focus'),
    previewClass: 'bg-purple-900/40 text-purple-100 border border-purple-500 shadow-purple-500/20',
    isPremium: false
  },
  {
    id: 'matrix',
    name: {
      en: 'Matrix',
      ru: 'Матрица',
      kz: 'Матрица'
    },
    emoji: '💚',
    imageUrl: buildDicebearAvatar('personas', 'matrix-focus'),
    previewClass: 'bg-green-900/40 text-green-400 border border-green-500',
    isPremium: false
  },
  {
    id: 'cyber_cat',
    name: {
      en: 'Cyber Cat',
      ru: 'Кибер-кот',
      kz: 'Кибер мысық'
    },
    imageUrl: buildDicebearAvatar('big-smile', 'cyber-cat-focus'),
    isPremium: false
  },
  {
    id: 'fire_dragon',
    name: {
      en: 'Fire Dragon',
      ru: 'Огненный дракон',
      kz: 'Отты айдаһар'
    },
    imageUrl: buildDicebearAvatar('adventurer-neutral', 'fire-dragon-focus'),
    isPremium: false
  },
  {
    id: 'galaxy',
    name: {
      en: 'Galaxy',
      ru: 'Галактика',
      kz: 'Галактика'
    },
    imageUrl: buildDicebearAvatar('personas', 'galaxy-focus'),
    isPremium: false
  },
  {
    id: 'ocean_pearl',
    name: {
      en: 'Ocean Pearl',
      ru: 'Океанская жемчужина',
      kz: 'Мұхит перлесі'
    },
    imageUrl: buildDicebearAvatar('open-peeps', 'ocean-pearl-focus'),
    isPremium: false
  },
  {
    id: 'midnight_coder',
    name: {
      en: 'Midnight Coder',
      ru: 'Ночной кодер',
      kz: 'Түнгі кодер'
    },
    imageUrl: buildDicebearAvatar('micah', 'midnight-coder-focus'),
    previewClass: 'bg-slate-900/40 border border-slate-500/40',
    isPremium: false
  },
  {
    id: 'sunset_vibe',
    name: {
      en: 'Sunset Vibe',
      ru: 'Закатный вайб',
      kz: 'Кешкі vibe'
    },
    imageUrl: buildDicebearAvatar('lorelei-neutral', 'sunset-vibe-focus'),
    previewClass: 'bg-rose-500/20 border border-orange-400/30',
    isPremium: false
  },
  {
    id: 'aqua_beats',
    name: {
      en: 'Aqua Beats',
      ru: 'Аква бит',
      kz: 'Аква бит'
    },
    imageUrl: buildDicebearAvatar('notionists-neutral', 'aqua-beats-focus'),
    previewClass: 'bg-cyan-500/20 border border-cyan-300/30',
    isPremium: false
  },
  {
    id: 'cloud_runner',
    name: {
      en: 'Cloud Runner',
      ru: 'Облачный раннер',
      kz: 'Бұлт runner'
    },
    imageUrl: buildDicebearAvatar('avataaars-neutral', 'cloud-runner-focus'),
    previewClass: 'bg-violet-500/20 border border-violet-300/30',
    isPremium: false
  },
  {
    id: 'golden_crown',
    name: {
      en: 'Golden Crown',
      ru: 'Золотая корона',
      kz: 'Алтын тәж'
    },
    imageUrl: buildDicebearAvatar('micah', 'golden-crown-focus'),
    isPremium: true
  },
  {
    id: 'phoenix_rise',
    name: {
      en: 'Phoenix Rise',
      ru: 'Восстание феникса',
      kz: 'Феникс көтерілуі'
    },
    imageUrl: buildDicebearAvatar('open-peeps', 'phoenix-rise-focus'),
    isPremium: true
  },
  {
    id: 'diamond_luxury',
    name: {
      en: 'Diamond Luxury',
      ru: 'Бриллиантовая роскошь',
      kz: 'Алмас luxurious'
    },
    imageUrl: buildDicebearAvatar('notionists-neutral', 'diamond-luxury-focus'),
    isPremium: true
  },
  {
    id: 'royal_dragon',
    name: {
      en: 'Royal Dragon',
      ru: 'Королевский дракон',
      kz: 'Патша айдаһары'
    },
    imageUrl: buildDicebearAvatar('avataaars-neutral', 'royal-dragon-focus'),
    isPremium: true
  },
  {
    id: 'rainbow_wonder',
    name: {
      en: 'Rainbow Wonder',
      ru: 'Радужное чудо',
      kz: 'Күнбағыс ғажайып'
    },
    imageUrl: buildDicebearAvatar('lorelei-neutral', 'rainbow-wonder-focus'),
    isPremium: true
  }
] as const;
