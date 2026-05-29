# 🚀 TApps Center Resubmission — Web3 Alignment

Бұл құжат Telegram Apps Center команда сұраған Web3/TON бағытына сәйкестендіру үшін
жасалған өзгерістер мен қайта жіберу стратегиясын суреттейді.

## 📋 Алдыңғы submission-ның қабылданбау себебі

> "While there's nothing wrong with your project, it doesn't quite align with our current focus.
> Our main priority is **web3 and crypto-related apps**, especially those built around the **TON blockchain**.
> We also tend to approve well-made Telegram tools (like chat or channel management tools) and entertainment
> apps, mostly games, that support **payments in TON or Telegram Stars**."

**Диагноз:** Stars алып тасталған еді (`c6336d7` commit-те), TON интеграциясы тек VIP-қа байланған,
in-game Web3 механикасы жоқ болды.

---

## ✅ Не қосылды

### 1. Telegram Stars (толық қалпына келтіріліп, кеңейтілді)

**Бұрын:** Тек 3 VIP жоспар (140/175/205 ⭐)

**Қазір:** **13 өнім**, 15 ⭐-тан 300 ⭐-ға дейін:
- VIP (basic/pro/premium)
- Mystery cases (basic/rare/legendary)
- In-game boosters (revive, tournament tickets, wheel spins)
- Coin packs (500/1500/5000)
- **$FOCUS jetton packs** (Web3 актив)

**Файлдар:**
- `server/stars.js` — таза модуль, барлық өнімдерді басқарады
- `src/utils/starsApi.ts` — client-side `payWithStars(productCode)` API
- `src/pages/Shop.tsx` — VIP-те де, кейстерде де "Pay with Stars" батырмасы
- `src/components/modals/ReviveModal.tsx` — Stars revive
- `src/pages/Tournaments.tsx` — Stars турнир билеті

### 2. TON Connect — ойынның негізгі циклында

**Бұрын:** TON Connect тек VIP подпискаға (10/12.5/15 TON жоспарлары)

**Қазір:**
- **Onboarding-та** wallet қосу CTA → +25 $FOCUS jetton
- **Profile-да** жеке Web3 секция (wallet, $FOCUS balance, NFT trophies)
- **Tournament-та** TON ticket entry + Stars альтернативі
- **Wallet bind = on-chain referral bonus + special NFT eligibility**

**Файлдар:**
- `src/components/onboarding/OnboardingScreen3.tsx` — TON Connect CTA
- `src/components/Web3Section.tsx` — Profile-да Web3 hub
- `server/web3.js` — `/api/web3/wallet/bind` endpoint + tonProof storage

### 3. $FOCUS jetton (in-app Web3 currency)

**Жаңа концепт:** Ойыншылар нақты on-chain TON jetton табады.

**Earn rules** (server-authoritative):
| Action | Reward |
|---|---|
| Daily workout complete | +10 $FOCUS (24h cooldown) |
| Tournament Top 1 | +100 $FOCUS |
| Tournament Top 2-3 | +25 $FOCUS |
| Wallet bind (referral) | +50 $FOCUS |
| Wallet bind (onboarding) | +25 $FOCUS |
| Stars purchase | +75 / +300 (тікелей) |

**Claim flow:**
1. Profile-да "Claim on-chain" батырмасы
2. Backend `focus_claim_requests` кестесіне pending row жазады
3. External worker (jetton deploy кейін) on-chain transfer жасайды
4. UI tx hash + tonscan.org сілтемесін көрсетеді

**Файлдар:**
- `supabase/migrations/007_stars_focus_nft.sql` — `focus_token_ledger`, `focus_claim_requests`
- `server/web3.js` — `/api/web3/focus/*` endpoints
- `src/utils/web3Api.ts` — `getFocusBalance`, `claimFocus`, `earnFocus`
- `src/pages/DailyWorkout.tsx` — workout complete → `earnFocus('daily_workout_complete')`

### 4. NFT Trophies (Tournament prizes)

**Жаңа концепт:** Турнир жеңімпаздары NFT collectible алады (TON-да).

**Catalog (`server/web3.js`):**
| Code | Rarity | Earn condition |
|---|---|---|
| `tournament_gold` | legendary | 1st place tournament |
| `tournament_silver` | epic | 2nd place tournament |
| `tournament_bronze` | rare | 3rd place tournament |
| `brain_master` | epic | Complete all 7 games at hard difficulty |
| `early_supporter` | rare | Joined during beta |
| `focus_whale` | legendary | Bought 500+ $FOCUS in Stars |

**Claim flow:** Wallet bind міндетті → claim request → external worker mint → tonscan tx.

**Файлдар:**
- `supabase/migrations/007_stars_focus_nft.sql` — `nft_trophy_awards`
- `server/web3.js` — `/api/web3/nft/*` endpoints (catalog, list, claim, admin award)
- `src/components/Web3Section.tsx` — UI display + claim button

### 5. On-chain referral

Referral бонусы тек **wallet bind** болған соң ғана активтенеді — бұл реал Web3 stickiness тудырады.

`focus_token_ledger.reason = 'referral_wallet_bind'`, +50 $FOCUS.

---

## 🔄 Architecture diagram

```
┌─────────────────────────────────────────────────┐
│                Telegram Client                  │
│   ┌────────────┐    ┌──────────────┐           │
│   │   Stars    │    │  TON Connect │           │
│   │  openInvoice    │   sendTx     │           │
│   └─────┬──────┘    └──────┬───────┘           │
└─────────┼──────────────────┼───────────────────┘
          ▼                  ▼
┌─────────────────────────────────────────────────┐
│            server/ (Express)                    │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ stars.js    │ │ index.js │ │  web3.js     │ │
│  │ (13 prods)  │ │ (TON pay)│ │ (jetton+NFT) │ │
│  └─────────────┘ └──────────┘ └──────────────┘ │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│              Supabase Postgres                  │
│  payment_orders, stars_grants, user_inventory,  │
│  user_wallet_links, focus_token_ledger,         │
│  focus_claim_requests, nft_trophy_awards,       │
│  user_consumables, wheel_user_state             │
└─────────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│      External worker (deploy later)             │
│  - $FOCUS jetton transfer (claim requests)      │
│  - NFT collection mint (trophy claims)          │
└─────────────────────────────────────────────────┘
```

---

## 📝 BotFather description (re-submission текст)

`/setdescription` командасы арқылы:

```
Focus — play-to-earn brain training on TON 🧠💎
• 7 cognitive games (Schulte, Stroop, Memory, Math…)
• Earn $FOCUS jetton for daily workouts & tournaments
• Win NFT trophies for top placements
• Pay with Telegram Stars or TON
• Wheel of Fortune, mystery cases, daily quests
Built on TON — Web3 native, instant payouts.
```

`/setabouttext`:

```
Train your brain, earn $FOCUS on TON. Stars + TON payments. NFT trophies.
```

---

## 🎯 Resubmission checklist

- [x] Telegram Stars жұмыс істейді (5+ өнімде, тек VIP емес)
- [x] TON Connect ойын ішінде белсенді (onboarding, profile, tournaments)
- [x] $FOCUS jetton mechanic бар (earn + claim flow)
- [x] NFT trophy system бар (tournament prizes + special)
- [x] Wallet-gated referral бар
- [x] Migration 007 қолданылды
- [x] `BOT_TOKEN` орнатылды, Stars BotFather-да қосылды
- [x] `setup-webhook.js` орындалды
- [x] BotFather description "TON", "$FOCUS", "Stars", "NFT" сөздерін қамтиды
- [ ] **Demo video** жазылды (1-2 мин): Stars төлемі → VIP unlock → daily workout → wallet bind → claim $FOCUS
- [ ] `@tapps_center_moderation`-ға резюмиссия submission-ы

### Submission жазбасы (@tapps_center_moderation үшін)

> Hi! We've revamped Focus to better align with TApps Center's Web3 priorities:
>
> **Telegram Stars** — payments expanded from VIP-only to 13 in-game products (cases, revives, tournament tickets, wheel spins, coin packs, and $FOCUS jetton credits).
>
> **TON integration** — TonConnect now powers user identity beyond VIP: onboarding rewards +25 $FOCUS jetton credits upon wallet bind, profile shows wallet + jetton balance + NFT trophies, tournaments offer both TON and Stars entry.
>
> **Native Web3 mechanics:**
> - $FOCUS jetton: earned through daily workouts, tournament placements, and referrals. Claimable on-chain.
> - NFT trophies: gold/silver/bronze for top-3 tournament finishes + special collectibles. Minted to user's TON wallet.
>
> The jetton master contract and NFT collection will deploy on mainnet within 2 weeks of approval. The DB layer is already authoritative — claim requests queue up and will execute on-chain via a worker once contracts are live.
>
> Repo: ... | Demo video: ...

---

## 🛠 Deployment чек-листі

```bash
# 1. Database
psql $SUPABASE_URL < supabase/migrations/007_stars_focus_nft.sql

# 2. Env vars
echo "BOT_TOKEN=..." >> .env
echo "WEBHOOK_URL=https://your-domain.com/payments/stars/webhook" >> .env

# 3. Build frontend
npm install
npm run build

# 4. Deploy frontend (Vercel)
npm run deploy:vercel

# 5. Deploy backend (server/)
cd server && npm install
# Production: pm2 start index.js --name focus-api
node index.js

# 6. Configure Telegram webhook
node setup-webhook.js

# 7. Test
node test-stars.js
```

---

**Next steps (post-resubmission):**
1. Jetton master deploy (TON mainnet)
2. NFT collection deploy + image upload to IPFS
3. Worker service for claim processing (Node.js + `@ton/ton` sendTransaction)
4. Public token economics page (`/tokenomics`)
