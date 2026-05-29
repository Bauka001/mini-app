# 🌟 Telegram Stars Integration — Setup Guide

Бұл нұсқаулық Focus Mini App-те Telegram Stars төлемдерін іске қосуға арналған.

---

## 0. Не өзгерді (v2.1)

| Бұрын | Қазір |
|---|---|
| Stars тек VIP жоспарларға (basic/pro/premium) | **15 ⭐ → 300 ⭐** аралығында **13 өнім**: VIP, кейстер, revive, турнир билеттері, wheel spins, coin packs, $FOCUS jetton |
| Stars коды `server/index.js`-те (өшірілген) | Жеке модуль `server/stars.js` — таза, кеңейтілетін |
| Тек 1 endpoint (`/payments/stars/create`) | `/payments/stars/products`, `/payments/stars/create`, `/payments/stars/webhook`, `/payments/stars/:id/status` |

---

## 1. BotFather-да дайындық

### 1.1 Бот жасау (егер әлі жоқ болса)

1. [@BotFather](https://t.me/BotFather) ашыңыз
2. `/newbot` → атау + username
3. Берілген **token**-ды көшіріп алыңыз

### 1.2 Stars қызметін қосу

1. `/mybots` → ботты таңдау
2. **Payments** → **Stars** → **Connect**
3. Қажетті деректерді растаңыз
4. **Balance** көрсетіліп тұрса — Stars дайын

### 1.3 Web App URL орнату

1. `/mybots` → ботты таңдау
2. **Bot Settings** → **Menu Button** немесе **Configure Mini App**
3. URL: `https://your-domain.com` (немесе Vercel сілтемесі)

---

## 2. .env файлы

`.env` файлына міндетті айнымалылар:

```env
# Bot
BOT_TOKEN=123456789:AAEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
WEBHOOK_URL=https://your-domain.com/payments/stars/webhook

# Supabase (бұрыннан болуы керек)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# TON wallet (VIP TON төлемдеріне)
TON_WALLET_ADDRESS=EQDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TONCENTER_API_KEY=...

# Admin
ADMIN_PANEL_LOGIN=admin
ADMIN_PANEL_PASSWORD=strong-password
ADMIN_PANEL_OWNER_TG_ID=5357445431
```

---

## 3. Supabase миграцияны қолдану

Supabase SQL Editor-да ретімен орындаңыз:

```
supabase/migrations/006_admin_panel_v2.sql   (бұрыннан)
supabase/migrations/007_stars_focus_nft.sql  (ЖАҢА)
```

`007_stars_focus_nft.sql` мынаны жасайды:
- `stars_grants` — Stars төлемдерінің audit log-ы
- `user_inventory` — кейстер инвентары
- `user_consumables` — revive, ticket
- `user_wallet_links` — TON wallet привязка
- `focus_token_ledger` — $FOCUS jetton balance/transactions
- `focus_claim_requests` — on-chain claim очереді
- `nft_trophy_awards` — NFT жүлделері
- `plan_prices` — Stars (XTR) + TON екеуінде VIP жоспарлар
- `focus_balances`, `stars_revenue_daily` view-лары

---

## 4. Backend іске қосу

```bash
cd server
npm install
node index.js
```

Күтілетін лог:
```
Server running on port 3001
[admin-v2] routes mounted under /api/admin-v2/*
[stars] routes mounted (BOT_TOKEN configured)
[web3] routes mounted under /api/web3/* (FOCUS earn + claim + NFT trophies + admin)
```

Егер `BOT_TOKEN MISSING` десе — `.env`-ті тексеріңіз.

---

## 5. Webhook орнату

Жергілікті тестілеу үшін `ngrok` керек:

```bash
ngrok http 3001
# Берген HTTPS URL-ді .env-ге жазыңыз:
# WEBHOOK_URL=https://abcd-1234.ngrok-free.app/payments/stars/webhook
```

Содан кейін:

```bash
node setup-webhook.js
```

Өндірісте — нақты домейн. Webhook соны Telegram-ға `setWebhook` арқылы хабарлайды.

---

## 6. Тестілеу

### 6.1 Backend test

```bash
node test-stars.js
```

Тексереді:
- ✅ Bot reachability (`getMe`)
- ✅ Webhook info (`getWebhookInfo`)
- ✅ Invoice creation (`createInvoiceLink`)
- ✅ Recent Stars transactions

### 6.2 Frontend test

1. Mini app-ті ашыңыз (`https://t.me/focusgameapp_bot`)
2. **Shop → VIP** → "Pay with Stars" батырмасы
3. Telegram Stars инвойсы ашылады
4. Төлемді растаңыз → backend logging:
   ```
   [Stars] pre_checkout_query ok
   [Stars] successful_payment processed: order=xxx product=vip_basic
   ```
5. VIP активтенді

### 6.3 Барлық өнімдерді тестілеу

```bash
curl http://localhost:3001/payments/stars/products
```

Тізімде 13 өнім болуы керек:
- `vip_basic`, `vip_pro`, `vip_premium`
- `case_basic`, `case_rare`, `case_legendary`
- `revive`, `tournament_ticket`, `wheel_spin`
- `coins_500`, `coins_1500`, `coins_5000`
- `focus_100`, `focus_500`

---

## 7. Stars өнімдер каталогы

| Code | Kind | Stars | Не береді |
|---|---|---|---|
| `vip_basic` | VIP | 140 ⭐ | 365 күн BASIC жоспар |
| `vip_pro` | VIP | 175 ⭐ | 365 күн PRO жоспар |
| `vip_premium` | VIP | 205 ⭐ | 365 күн PREMIUM жоспар |
| `case_basic` | Case | 25 ⭐ | 1 Basic mystery box |
| `case_rare` | Case | 50 ⭐ | 1 Rare mystery box |
| `case_legendary` | Case | 100 ⭐ | 1 Legendary mystery box |
| `revive` | Revive | 15 ⭐ | 1 in-game revive |
| `tournament_ticket` | Ticket | 50 ⭐ | 1 turnir билеті |
| `wheel_spin` | WheelSpin | 20 ⭐ | 1 қосымша Wheel of Fortune айналдыру |
| `coins_500` | Coins | 50 ⭐ | 500 in-game coin |
| `coins_1500` | Coins | 100 ⭐ | 1500 in-game coin (best value) |
| `coins_5000` | Coins | 250 ⭐ | 5000 in-game coin |
| `focus_100` | Focus | 75 ⭐ | 100 $FOCUS jetton (claim on-chain) |
| `focus_500` | Focus | 300 ⭐ | 500 $FOCUS jetton |

---

## 8. Stars-ты қайта шығару (withdraw)

1. @BotFather → Bot → Payments → Stars → **Withdraw**
2. Telegram TON-ға аударады, ары қарай криптобиржалармен жалғастыруға болады

---

## 9. Troubleshooting

### "BOT_TOKEN is not configured"
→ `.env`-ке `BOT_TOKEN=...` қосыңыз, серверді қайта қосыңыз

### "createInvoiceLink failed: STARS_PAYMENT_DISABLED"
→ BotFather-да Stars қосылмаған. /mybots → Payments → Stars

### "Webhook не работает"
→ `node setup-webhook.js` қайта орындаңыз; HTTPS міндетті; локалда `ngrok` керек

### "successful_payment received, but no grant"
→ `payment_orders` кестесінен `status` тексеріңіз; `pending_grant` болса — `provider_payload.grantError` қараңыз

### "stars_grants table does not exist"
→ Migration 007 қолданбаған. Supabase SQL Editor → 007_stars_focus_nft.sql

---

## 10. Architecture overview

```
Telegram client
    ↓ openInvoice()
Telegram Stars
    ↓ pre_checkout_query → webhook → answerPreCheckoutQuery(ok)
    ↓ successful_payment → webhook → grant flow
Backend (server/stars.js)
    ↓ kind-specific grant
Supabase
    ├─ payment_orders (status=paid)
    ├─ stars_grants (audit)
    ├─ user_entitlements (if kind=vip)
    ├─ user_inventory (if kind=case)
    ├─ user_consumables (if kind=revive|ticket)
    ├─ wheel_user_state (if kind=wheel_spin)
    ├─ users.coins (if kind=coins)
    └─ focus_token_ledger (if kind=focus)
```

---

**Last updated:** Stars integration v2.1 — adds non-VIP products + Web3 layer.
