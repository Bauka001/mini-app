import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV, isMissingEnv } from './env';

const isConfigured = !isMissingEnv;

export const supabase: SupabaseClient = isConfigured
  ? createClient(ENV.VITE_SUPABASE_URL, ENV.VITE_SUPABASE_ANON_KEY)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

export const isSupabaseConfigured = isConfigured;

export interface DatabaseUser {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  coins: number;
  gems: number;
  xp: number;
  level: number;
  brain_stats: {
    focus: number;
    memory: number;
    logic: number;
    speed: number;
    flexibility: number;
  };
  skin_inventory: string[];
  active_skin: string;
  plan: 'free' | 'silver' | 'gold' | 'premium';
  plan_expiry: number | null;
  hp: number;
  max_hp: number;
  fec_balance: number;
  inventory: {
    freezes: number;
    hints: number;
    shields: number;
  };
  daily_goal_minutes: number;
  streak: number;
  daily_reward_streak: number;
  last_daily_reward_date: string | null;
  promotion_end_iso: string | null;
  daily_quest: {
    id: string;
    games_played: string[];
    is_completed: boolean;
    is_claimed: boolean;
    last_reset_date: string | null;
  };
  created_at: string;
  updated_at: string;
}

export const getUserByTelegramId = async (telegramId: number): Promise<DatabaseUser | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error);
    return null;
  }
  return data;
};

export const createUser = async (user: Omit<DatabaseUser, 'created_at' | 'updated_at'>): Promise<DatabaseUser | null> => {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  return data;
};

export const updateUser = async (
  telegramId: number,
  updates: Partial<Omit<DatabaseUser, 'id' | 'telegram_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId);

  if (error) {
    console.error('Error updating user:', error);
    return false;
  }
  return true;
};

export const subscribeToUserChanges = (
  telegramId: number,
  callback: (payload: DatabaseUser) => void
) => {
  return supabase
    .channel(`user-${telegramId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `telegram_id=eq.${telegramId}`,
      },
      (payload) => {
        callback(payload.new as DatabaseUser);
      }
    )
    .subscribe();
};

export const syncGameResult = async (
  telegramId: number,
  gameId: string,
  score: number,
  coinsEarned: number
): Promise<boolean> => {
  const { error } = await supabase.rpc('record_game_result', {
    p_telegram_id: telegramId,
    p_game_id: gameId,
    p_score: score,
    p_coins_earned: coinsEarned,
  });

  if (error) {
    console.error('Error syncing game result:', error);
    return false;
  }
  return true;
};

export const recordPurchase = async (
  telegramId: number,
  itemType: string,
  itemId: string,
  cost: number
): Promise<boolean> => {
  const { error } = await supabase.rpc('record_purchase', {
    p_telegram_id: telegramId,
    p_item_type: itemType,
    p_item_id: itemId,
    p_cost: cost,
  });

  if (error) {
    console.error('Error recording purchase:', error);
    return false;
  }
  return true;
};