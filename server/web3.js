/**
 * Web3 module — TON wallet binding, $FOCUS jetton ledger, NFT trophies.
 *
 * Routes (all prefixed /api/web3/):
 *   POST /api/web3/wallet/bind          — bind TON wallet to user (initData + address [+ tonProof])
 *   POST /api/web3/wallet/unbind        — remove wallet link
 *   GET  /api/web3/wallet               — get current wallet binding
 *   GET  /api/web3/focus/balance        — $FOCUS jetton balance (DB-tracked)
 *   GET  /api/web3/focus/ledger         — recent ledger entries
 *   POST /api/web3/focus/claim          — request on-chain claim (creates pending claim row; signed off-chain by ops)
 *   POST /api/web3/focus/earn           — credit $FOCUS for in-app actions (daily workout, tournament finish)
 *   GET  /api/web3/nft/trophies         — list user's awarded trophies
 *   POST /api/web3/nft/trophies/claim   — mark trophy as claim-requested (real mint queued externally)
 *   GET  /api/web3/nft/catalog          — public catalog of available trophy types
 *
 * Design: every on-chain action (jetton transfer, NFT mint) is currently a stub
 * that records intent in DB. A separate worker can pick up `*_claim_requests`
 * tables and execute the real on-chain transfer once the jetton/NFT collection
 * contracts are deployed. The frontend treats DB balances as authoritative.
 */

const crypto = require('crypto');

// $FOCUS earn amounts for in-app actions (server-side authoritative)
const FOCUS_EARN_RULES = {
  daily_workout_complete: { delta: 10,  cooldownHours: 24 },
  tournament_top1:        { delta: 100, cooldownHours: 0 },
  tournament_top3:        { delta: 25,  cooldownHours: 0 },
  referral_wallet_bind:   { delta: 50,  cooldownHours: 0 },
  onboarding_wallet_bind: { delta: 25,  cooldownHours: 0 },
};

// NFT trophy catalog — what users can earn / claim
const NFT_TROPHY_CATALOG = {
  tournament_gold:    { rarity: 'legendary', label: 'Gold Trophy',    description: '1st place tournament',  imageUrl: '/nft/gold.png' },
  tournament_silver:  { rarity: 'epic',      label: 'Silver Trophy',  description: '2nd place tournament',  imageUrl: '/nft/silver.png' },
  tournament_bronze:  { rarity: 'rare',      label: 'Bronze Trophy',  description: '3rd place tournament',  imageUrl: '/nft/bronze.png' },
  brain_master:       { rarity: 'epic',      label: 'Brain Master',   description: 'Complete all 7 games at hard difficulty', imageUrl: '/nft/brain-master.png' },
  early_supporter:    { rarity: 'rare',      label: 'Early Supporter',description: 'Joined during beta',    imageUrl: '/nft/early-supporter.png' },
  focus_whale:        { rarity: 'legendary', label: 'Focus Whale',    description: 'Bought 500+ $FOCUS in Stars', imageUrl: '/nft/whale.png' },
};

// Very loose TON address validation: bounceable/non-bounceable base64url 48 chars OR raw 0:hex
function isPlausibleTonAddress(addr) {
  if (typeof addr !== 'string') return false;
  const s = addr.trim();
  if (/^[0-9a-zA-Z_-]{48}$/.test(s)) return true;
  if (/^0:[0-9a-fA-F]{64}$/.test(s)) return true;
  return false;
}

function registerWeb3(app, deps) {
  const { supabase, resolveRequestAccess, ensureSupabase, isMissingTableError } = deps;

  // === Wallet binding ===
  app.post('/api/web3/wallet/bind', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;

      const address = `${req.body?.address || ''}`.trim();
      const chain = `${req.body?.chain || 'mainnet'}`.trim();
      const publicKey = `${req.body?.publicKey || ''}`.trim();
      // tonProof is optional but recommended; we store it as evidence
      const tonProof = req.body?.tonProof || null;
      const walletInfo = req.body?.walletInfo || null;

      if (!isPlausibleTonAddress(address)) {
        return res.status(400).json({ error: 'Invalid TON address' });
      }

      const nowIso = new Date().toISOString();
      const userTelegramId = Number(access.identity.userId);

      // Upsert into user_wallet_links (one wallet per user, but history kept via separate table if needed)
      const { error } = await supabase
        .from('user_wallet_links')
        .upsert(
          {
            user_telegram_id: userTelegramId,
            address,
            chain,
            public_key: publicKey || null,
            ton_proof: tonProof,
            wallet_info: walletInfo,
            verified_at: tonProof ? nowIso : null,
            updated_at: nowIso,
          },
          { onConflict: 'user_telegram_id' }
        );
      if (error) throw error;

      // First-time onboarding reward (idempotent)
      const { data: existingReward } = await supabase
        .from('focus_token_ledger')
        .select('id')
        .eq('user_telegram_id', userTelegramId)
        .eq('reason', 'onboarding_wallet_bind')
        .limit(1)
        .maybeSingle();

      let onboardingReward = 0;
      if (!existingReward) {
        const rule = FOCUS_EARN_RULES.onboarding_wallet_bind;
        const { error: rewardError } = await supabase.from('focus_token_ledger').insert({
          user_telegram_id: userTelegramId,
          delta: rule.delta,
          reason: 'onboarding_wallet_bind',
          reference_id: address,
          metadata: { address },
          created_at: nowIso,
        });
        if (rewardError && !isMissingTableError(rewardError)) {
          console.warn('[web3] onboarding reward failed:', rewardError.message);
        } else {
          onboardingReward = rule.delta;
        }
      }

      return res.json({
        ok: true,
        address,
        chain,
        verified: Boolean(tonProof),
        onboardingReward,
      });
    } catch (error) {
      console.error('[web3] wallet/bind error:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'wallet_bind_error' });
    }
  });

  app.post('/api/web3/wallet/unbind', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;
      await supabase
        .from('user_wallet_links')
        .delete()
        .eq('user_telegram_id', access.identity.userId);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'wallet_unbind_error' });
    }
  });

  app.get('/api/web3/wallet', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;
      const { data, error } = await supabase
        .from('user_wallet_links')
        .select('address, chain, public_key, verified_at, updated_at')
        .eq('user_telegram_id', access.identity.userId)
        .maybeSingle();
      if (error && !isMissingTableError(error)) throw error;
      return res.json({ wallet: data || null });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'wallet_get_error' });
    }
  });

  // === $FOCUS balance & ledger ===
  app.get('/api/web3/focus/balance', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;

      const { data: rows, error } = await supabase
        .from('focus_token_ledger')
        .select('delta')
        .eq('user_telegram_id', access.identity.userId);
      if (error && !isMissingTableError(error)) throw error;

      const balance = (rows || []).reduce((sum, r) => sum + Number(r.delta || 0), 0);

      const { data: claimed } = await supabase
        .from('focus_claim_requests')
        .select('amount, status')
        .eq('user_telegram_id', access.identity.userId)
        .in('status', ['pending', 'processing']);
      const lockedInPendingClaims = (claimed || []).reduce((s, r) => s + Number(r.amount || 0), 0);

      // On-chain balance + explorer link (when jetton configured)
      let onChain = null;
      try {
        const jetton = require('./jetton');
        if (jetton.isConfigured()) {
          // Resolve user's TON wallet from user_wallet_links
          const { data: walletRow } = await supabase
            .from('user_wallet_links')
            .select('wallet_address')
            .eq('user_telegram_id', access.identity.userId)
            .order('created_at', { ascending: false })
            .limit(1).maybeSingle();
          if (walletRow?.wallet_address) {
            const r = await jetton.getOnChainBalance(walletRow.wallet_address);
            if (r.ok) {
              onChain = {
                network: jetton.NETWORK,
                balance: r.balance,
                jettonWallet: r.walletAddress || null,
                explorer: r.explorer || null,
              };
            }
          }
        }
      } catch { /* jetton module not installed — skip silently */ }

      return res.json({
        balance,
        available: Math.max(0, balance - lockedInPendingClaims),
        lockedInPendingClaims,
        onChain, // null when jetton not configured or user has no wallet bound
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'focus_balance_error' });
    }
  });

  app.get('/api/web3/focus/ledger', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;
      const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 25)));
      const { data, error } = await supabase
        .from('focus_token_ledger')
        .select('id, delta, reason, reference_id, metadata, created_at')
        .eq('user_telegram_id', access.identity.userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error && !isMissingTableError(error)) throw error;
      return res.json({ entries: data || [] });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'focus_ledger_error' });
    }
  });

  app.post('/api/web3/focus/earn', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;

      const reason = `${req.body?.reason || ''}`.trim();
      const rule = FOCUS_EARN_RULES[reason];
      if (!rule) return res.status(400).json({ error: 'Unknown earn reason' });

      const userTelegramId = Number(access.identity.userId);
      const referenceId = `${req.body?.referenceId || ''}`.trim() || null;
      const nowIso = new Date().toISOString();

      // Cooldown check
      if (rule.cooldownHours > 0) {
        const sinceIso = new Date(Date.now() - rule.cooldownHours * 3600 * 1000).toISOString();
        const { data: recent } = await supabase
          .from('focus_token_ledger')
          .select('id, created_at')
          .eq('user_telegram_id', userTelegramId)
          .eq('reason', reason)
          .gte('created_at', sinceIso)
          .limit(1);
        if (recent && recent.length) {
          return res.status(429).json({ error: 'cooldown_active', nextEligibleAt: new Date(Date.parse(recent[0].created_at) + rule.cooldownHours * 3600 * 1000).toISOString() });
        }
      }

      const { error } = await supabase.from('focus_token_ledger').insert({
        user_telegram_id: userTelegramId,
        delta: rule.delta,
        reason,
        reference_id: referenceId,
        metadata: req.body?.metadata || null,
        created_at: nowIso,
      });
      if (error) throw error;

      return res.json({ ok: true, credited: rule.delta, reason });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'focus_earn_error' });
    }
  });

  app.post('/api/web3/focus/claim', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;

      const userTelegramId = Number(access.identity.userId);
      const amount = Math.floor(Number(req.body?.amount || 0));
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Verify wallet binding
      const { data: wallet } = await supabase
        .from('user_wallet_links')
        .select('address, verified_at')
        .eq('user_telegram_id', userTelegramId)
        .maybeSingle();
      if (!wallet?.address) {
        return res.status(400).json({ error: 'wallet_not_bound' });
      }

      // Verify available balance
      const { data: rows } = await supabase
        .from('focus_token_ledger')
        .select('delta')
        .eq('user_telegram_id', userTelegramId);
      const balance = (rows || []).reduce((s, r) => s + Number(r.delta || 0), 0);

      const { data: pending } = await supabase
        .from('focus_claim_requests')
        .select('amount, status')
        .eq('user_telegram_id', userTelegramId)
        .in('status', ['pending', 'processing']);
      const locked = (pending || []).reduce((s, r) => s + Number(r.amount || 0), 0);

      if (balance - locked < amount) {
        return res.status(400).json({ error: 'insufficient_balance', balance, locked });
      }

      const claimId = crypto.randomUUID();
      const nowIso = new Date().toISOString();

      const { error } = await supabase.from('focus_claim_requests').insert({
        id: claimId,
        user_telegram_id: userTelegramId,
        wallet_address: wallet.address,
        amount,
        status: 'pending',
        created_at: nowIso,
      });
      if (error) throw error;

      return res.json({
        claimId,
        status: 'pending',
        amount,
        walletAddress: wallet.address,
        message: 'Claim queued. $FOCUS jetton transfer will execute once the jetton master contract is deployed.',
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'focus_claim_error' });
    }
  });

  // === NFT trophies ===
  app.get('/api/web3/nft/catalog', (_req, res) => {
    const catalog = Object.entries(NFT_TROPHY_CATALOG).map(([code, t]) => ({ code, ...t }));
    res.json({ catalog });
  });

  app.get('/api/web3/nft/trophies', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;
      const { data, error } = await supabase
        .from('nft_trophy_awards')
        .select('id, trophy_code, status, claim_tx, awarded_at, claimed_at, reference')
        .eq('user_telegram_id', access.identity.userId)
        .order('awarded_at', { ascending: false });
      if (error && !isMissingTableError(error)) throw error;

      const trophies = (data || []).map((row) => ({
        id: row.id,
        code: row.trophy_code,
        status: row.status,
        awardedAt: row.awarded_at,
        claimedAt: row.claimed_at,
        claimTx: row.claim_tx,
        reference: row.reference,
        meta: NFT_TROPHY_CATALOG[row.trophy_code] || null,
      }));
      return res.json({ trophies });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'nft_trophies_error' });
    }
  });

  app.post('/api/web3/nft/trophies/claim', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;

      const userTelegramId = Number(access.identity.userId);
      const trophyId = `${req.body?.trophyId || ''}`.trim();
      if (!trophyId) return res.status(400).json({ error: 'trophyId required' });

      const { data: wallet } = await supabase
        .from('user_wallet_links')
        .select('address')
        .eq('user_telegram_id', userTelegramId)
        .maybeSingle();
      if (!wallet?.address) return res.status(400).json({ error: 'wallet_not_bound' });

      const { data: trophy, error: getError } = await supabase
        .from('nft_trophy_awards')
        .select('id, status, trophy_code')
        .eq('id', trophyId)
        .eq('user_telegram_id', userTelegramId)
        .maybeSingle();
      if (getError) throw getError;
      if (!trophy) return res.status(404).json({ error: 'trophy_not_found' });
      if (trophy.status === 'claim_requested' || trophy.status === 'minted') {
        return res.status(400).json({ error: 'already_claimed_or_pending', status: trophy.status });
      }

      const { error } = await supabase
        .from('nft_trophy_awards')
        .update({
          status: 'claim_requested',
          claim_wallet: wallet.address,
          claim_requested_at: new Date().toISOString(),
        })
        .eq('id', trophyId);
      if (error) throw error;

      return res.json({
        ok: true,
        trophyId,
        status: 'claim_requested',
        message: 'NFT mint queued for your wallet. It will appear once the NFT collection is deployed.',
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'nft_claim_error' });
    }
  });

  // === Admin: award NFT trophy + credit $FOCUS (called by admin panel / tournament finalizer)
  app.post('/api/web3/admin/award-trophy', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res, { adminOnly: true });
      if (!access) return;

      const userTelegramId = Number(req.body?.userTelegramId);
      const trophyCode = `${req.body?.trophyCode || ''}`.trim();
      const reference = `${req.body?.reference || ''}`.trim() || null;
      if (!userTelegramId || !NFT_TROPHY_CATALOG[trophyCode]) {
        return res.status(400).json({ error: 'Invalid userTelegramId or trophyCode' });
      }
      const trophyId = crypto.randomUUID();
      const { error } = await supabase.from('nft_trophy_awards').insert({
        id: trophyId,
        user_telegram_id: userTelegramId,
        trophy_code: trophyCode,
        reference,
        status: 'awarded',
        awarded_at: new Date().toISOString(),
      });
      if (error) throw error;
      return res.json({ ok: true, trophyId });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'admin_award_error' });
    }
  });

  app.post('/api/web3/admin/credit-focus', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res, { adminOnly: true });
      if (!access) return;
      const userTelegramId = Number(req.body?.userTelegramId);
      const delta = Math.floor(Number(req.body?.delta || 0));
      const reason = `${req.body?.reason || 'admin_credit'}`.trim();
      if (!userTelegramId || !Number.isFinite(delta)) {
        return res.status(400).json({ error: 'Invalid userTelegramId or delta' });
      }
      const { error } = await supabase.from('focus_token_ledger').insert({
        user_telegram_id: userTelegramId,
        delta,
        reason,
        reference_id: `${req.body?.referenceId || ''}`.trim() || null,
        metadata: req.body?.metadata || null,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      return res.json({ ok: true, credited: delta });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'admin_credit_error' });
    }
  });

  console.log('[web3] routes mounted under /api/web3/* (FOCUS earn + claim + NFT trophies + admin)');
}

module.exports = registerWeb3;
module.exports.FOCUS_EARN_RULES = FOCUS_EARN_RULES;
module.exports.NFT_TROPHY_CATALOG = NFT_TROPHY_CATALOG;
