-- Atomic counter update for POST /games/submit.
--
-- The previous handler read users.coins/xp/level into JS, computed new
-- values, and wrote them back. Two concurrent submissions from the same
-- user could both read coins=100, both compute coins=150, both write 150
-- — the user lost 50 coins to the race. This RPC does the increment in
-- a single SQL statement so the row is locked for the duration and
-- concurrent calls serialize.
--
-- Caller passes p_coins and p_xp separately so the handler can decide the
-- mapping (today: xp = coins for game-submit; that is a server-side
-- decision, not a DB constraint).

CREATE OR REPLACE FUNCTION public.award_user(
  p_telegram_id BIGINT,
  p_coins BIGINT,
  p_xp BIGINT
) RETURNS TABLE (coins BIGINT, xp BIGINT, level BIGINT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
  SET
    coins = COALESCE(public.users.coins, 0) + p_coins,
    xp = COALESCE(public.users.xp, 0) + p_xp,
    level = FLOOR((COALESCE(public.users.xp, 0) + p_xp) / 1000.0)::BIGINT + 1
  WHERE public.users.telegram_id = p_telegram_id
  RETURNING public.users.coins, public.users.xp, public.users.level;
$$;

-- Lock down — only the backend's service-role key may call this. Never expose
-- to anon/authenticated.
REVOKE ALL ON FUNCTION public.award_user(BIGINT, BIGINT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_user(BIGINT, BIGINT, BIGINT) TO service_role;
