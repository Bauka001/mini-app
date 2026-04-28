# Focus App — Конверсия көтеру плейбугі

**Мақсат:** `free user → paying user` конверсиясын 1-2% → 4-7% көтеру
**Фокус:** өнімнің ішіндегі (in-app) өзгерістер, маркетинг емес
**Тоқыма:** код қазірдің өзінде 80% monetization инфрасы бар — оны дұрыс *тригерлеу* керек

---

## Неліктен қазір адамдар сатып алмайды (hypotheses)

Проектте шопта барлығы бар: `coins, gems, skins, freezes, hints, shields, energy, tickets, subscription plans`. Бірақ **төлем үшін «нақты сәт» (trigger moment) жоқ**. Әдетте 4 проблема болады:

1. **Paywall «дұрыс емес жерде»** — пайдаланушы бос уақытта шопқа кірмейді; ол тек «керек болғанда» төлейді.
2. **Free version тым өте жеткілікті** — егер бәрін тегін алуға болса, неге төлейсің?
3. **Free version тым қиын** — пайдаланушы 3 ойыннан кейін кетеді, төлеуге дейін жетпейді.
4. **Психологиялық anchor жоқ** — Gold $4.99, бірақ «неге осы баға?» деген контекст жоқ (басқа жоспармен салыстыру, лимит уақыт, «popular»).

---

## 1. ONBOARDING — алғашқы 90 секунд

Бірінші рет кірген пайдаланушы **кез келген төлем модалын көрмеуі керек**. Сатудың алтын ережесі: «Value before Ask».

### Қазір (codebase-те)
- `AuthGuard` → main screen → ойын таңдау → ойнау
- Paywall `ShopPage`-де болса да — пайдаланушы ешқашан ашпайды

### Өзгерту керек
1. **First-run tutorial** (3 минут):
   - Ойынға дейін: «1 минут — миыңды тексер» → көзді жабу үшін **Brain Age** тесті (3 ойын мини-версия)
   - Нәтижеде: «Сенің ми жасың — 28 (орташа 35). Сен топ-25%-дасың» → social proof + identity hook
   - Бұл **ерекше экран** болуы керек, ойынмен бірдей емес

2. **Streak carrot** (3-ші ойыннан кейін):
   - «Ертең да ойнасаң 2x coins + 1 gem — бұл streak реward»
   - Ертеңгі күнге конкретті сыйлық көрсету

3. **Paywall-ды 3 ойын БҰРЫН көрсетпеу**:
   - Код өзгерту: `AuthGuard`-ға `sessionsPlayed` counter қосу
   - ShopPage-ге `sessionsPlayed < 3` болса redirect «play first» экранына

### Нақты код қосымшасы
```ts
// src/store/useStore.ts UserState-ке:
sessionsPlayed: number;  // +1 every game end
firstSeenAt: number;
hasSeenFirstPaywall: boolean;

// ShopPage entry guard:
if (sessionsPlayed < 3) return <PlayFirstScreen />;
```

---

## 2. PAYWALL TIMING — «дұрыс сәт»

Пайдаланушы **5 нақты сәтте** ғана сатып алуы керек. Әр сәтте нақты UI көрсетіңіз:

### 2.1 Game Over — ReviveModal (ең жоғары конверсия)
Қазір: `ReviveModal` бар, тегін revive үшін revive батырмасы
**Өзгерту:**
- «Continue = 10 💎» нұсқасы (коинмен емес, gem-мен, төлем friction)
- Алғашқы рет тегін → екіншіден бастап 10 gems
- Егер streak >3 — «Don't break your streak» урgency
- Альтернатива: «Unlimited revives with Gold $4.99» inline карта

```tsx
// ReviveModal: қосымша slot
<div className="bg-gradient-to-r from-amber-400 to-yellow-500 p-3 rounded-xl">
  <p className="text-black text-xs">Gold ойыншылар шексіз revive алады</p>
  <button>Get Gold — $4.99/mo</button>
</div>
```

### 2.2 HP = 0 — Energy paywall
Қазір: HP regen уақытпен
**Өзгерту:**
- HP=0 болғанда модаль ашу: «Wait 4h OR refill now (1 gem / watch ad / get Gold)»
- Gold → unlimited HP
- Бұл ЕҢ күшті trigger — пайдаланушы ынталы

### 2.3 Streak запас — Day 7+
`streakProtection` бар код ішінде. Қолдан:
- Day 6 ескертпе: «Tomorrow your streak expires — get Streak Shield $0.99»
- Day 29 ескертпе: «30-day legend! Lock forever with Lifetime $49.99»
- Бұл **жоспарсыз** sale момент — loss aversion

### 2.4 Tournament entry
Қазір: турнирде ticket керек
**Өзгерту:**
- Daily tournament leaderboard homepage-те: «You're rank #47 of 823»
- «Top 10 win 100 TON. Buy ticket?»
- `pay-to-enter` — казино психологиясы, жоғары conversion

### 2.5 Мықты нәтиже — flex moment
- Пайдаланушы өз рекордын жаңартты → «Share with Gold badge» ұсынысы
- «Your brain is in top 5%! Unlock Premium profile»
- Identity payment (эго trigger)

---

## 3. БАҒА ПСИХОЛОГИЯСЫ — UI өзгерістер

### 3.1 Anchor price (қазір жоқ)
Shop-та Premium plan ЕҢ жоғарғы көрсетілсін:

```
┌─────────────────────────────────┐
│  🔥 PREMIUM — $9.99/mo          │  ← anchor (басым)
│  Барлығы кіреді                 │
├─────────────────────────────────┤
│  ⭐ GOLD — $4.99/mo   POPULAR   │  ← нақты сатылатын
│  «Most players choose this»     │
├─────────────────────────────────┤
│     SILVER — $2.99/mo           │  ← «too cheap» (decoy)
│     Минимум лимит                │
└─────────────────────────────────┘
```

Premium — anchor, Silver — decoy, Gold — real product. Бұл «Economist magazine trick» — Gold сатылымы 50%+ өседі.

### 3.2 Loss framing
Қазір: «Get Gold — unlimited games»
Өзгерту: «Free план — 3 ойын/күн. **Сен бүгін 1 ойынды жоғалтып жатырсың** — Gold алсаң, бұл лимит жоқ.»

### 3.3 Bundle savings (explicit math)
```
Coins 500  →  $0.99
Coins 5500 (10% бонус)  →  $9.99 ← normal
Coins 15000 (30% бонус + Gold week)  →  $24.99 ← **SAVE $12**
```
Нақты $$$-де savings көрсетіңіз. «30% bonus» абстракт, «save $12» нақты.

### 3.4 Лимитті уақыт
`promotionEndISO` бар код ішінде! Қолданыңыз:
- Banner homepage top: «⏰ Starter Pack 50% off — 14:23:12»
- Countdown live — urgency
- Әр 3-4 күн сайын жаңа offer rotate

### 3.5 First-time buyer special
- Пайдаланушы ешқашан төлемеген → «First purchase — 50% off any plan»
- `hasEverPaid: boolean` store-ға қосу
- Триггер: 7-ші күнде немесе 10-шы ойыннан кейін

---

## 4. FREE PLAN ЛИМИТТЕРІН ДҰРЫС ОРНАТУ

**Проблема:** Егер free тым өте жеткілікті → ешкім төлемейді. Егер тым шектеулі → адамдар кетеді.

### Ағымдағы free план неге жеткілікті (болжам)
Код: `plan: 'free'` + HP/energy лимиттер бар, бірақ «аз қинамайды».

### Ұсынылатын free лимиттер
| Feature | Free | Silver | Gold | Premium |
|---------|------|--------|------|---------|
| Games/day | **3** | 10 | ∞ | ∞ |
| HP max | 5 | 7 | 10 | 10 |
| HP regen | 30min | 15min | 5min | 0 (instant) |
| Daily quest | basic | basic | premium | premium |
| Tournament | watch | 1 ticket | 5 tickets | ∞ |
| Skins | basic | +Silver | +Gold | +NFT |
| Revive | 1 tegin | 2 tegin | 5 tegin | ∞ |
| Ads | 3/session | 1/session | жоқ | жоқ |
| Brain Age detail | basic | basic | full | full+export |
| Leaderboard | top 100 | top 100 | top 10 focus | VIP list |

### Psychological triggers
1. **«3 games/day limit»** — пайдаланушы 3-ші ойыннан кейін «жалғастыру үшін төлеу» қысымы
2. **«HP 30min regen»** — кету friction, немесе төлеу/watch ad
3. **Tournament-тен бас тарту free пайдаланушыға** — массалық FOMO
4. **Skin лимит** — free пайдаланушы ескі skin, paying пайдаланушы көз тартатын skin

---

## 5. SHOP КАТАЛОГЫНА НАҚТЫ ӨЗГЕРІСТЕР

### 5.1 Bundles ең басында
Қазір shop: скин → coin → gem → subscription
Ұсыныс: **Bundles → Subscription → Boosters → Skins** (ROI retrospective-те bundle ең жоғары conversion)

### 5.2 «Starter Bundle» ($1.99) — бір рет
- 7 күн Gold + 500 gems + 3 shield + exclusive skin
- Value $12+, бағасы $1.99
- **Бір рет ғана** — sense of exclusivity
- Trigger: 3-ші ойыннан кейін popup

### 5.3 Daily Deal ротациясы
Әр 24 сағатта жаңа «today only» offer:
- Mon: 1 gem = $0.10 (normal $0.15)
- Tue: Skin X 50% off
- Wed: Gold 3 days free trial
- Thu: Bundle offer
- Fri: Tournament double prize pool
- Sat/Sun: Weekend bonus (қазір бар — `weekendEvent`!)

Codebase-те `weekendEvent` бар — qolданылмай жатыр? Қолдану керек.

### 5.4 Social gift
- «Gift Gold to a friend» — $4.99
- Сіз де 50% off аласыз
- Viral mechanic + revenue

### 5.5 TON-specific offers
- «Connect wallet → get exclusive NFT skin»
- «Pay 1 TON = get $10 worth of gems»
- Crypto аудитория үшін crypto-native payment

---

## 6. UI/UX — «MONETIZATION SURFACE» арттыру

### 6.1 Shop badge HomePage-де
- Shop icon-ға **қызыл dot notification** қосу: «1 new offer»
- Әр кіру сайын ойыншы shop-қа назар аударады
- A/B test: шопқа кіру +40%

### 6.2 «You might like» карточкалары
- Ойын соңында: «Continue playing with +1 HP for 1 gem»
- Main screen free user-ге: «Unlock 4 more games with Gold» card
- Homepage top: daily deal banner

### 6.3 Progress bar near paywall
- «Ви играли 9 дней подряд. Еще 5 дней до Legend Status» → Legend status Gold-та ғана

### 6.4 Leaderboard — conversion driver
- Top-10 leaderboard көрсету → «You: rank #247. Top players all have Gold ⭐»
- Пайдаланушы «себе улучшить» ынталы
- Gold badge leaderboard-та visible

### 6.5 Achievements as paywall
- 80% achievement тегін
- 20% Gold-та ғана («Legend Brain», «100-day streak») — completion OCD triggeri

---

## 7. RETENTION = REVENUE

Әр сатып алу — retained user-ден келеді. Retention арттыру = revenue арттыру.

### 7.1 Push notifications (Telegram bot)
Код: Telegram bot бар. Notification schedule:
- **Day 2, 09:00**: «Кеше сен 4-ші деңгейге дейін жеттің. Бүгін 5-ке шығасың ба?»
- **Day 7, 20:00**: «7 days streak! Бір жұма — аптаның шапиғы!»
- **Day 14, ... **: HP full notification
- **Streak алдында (-2h)**: «Streak еkі сағат ішінде аяқталады»

### 7.2 Comeback bonus
- 3 күн кейін оралғанда: «Welcome back! +100 coins + 2 HP»
- 7 күн кейін: **exclusive «we missed you» skin**

### 7.3 Streak протекция автоматты ұсынысы
- Day 6, 7, 13, 14, 29, 30-де жиі: «Streak shield 0.99» offer
- Loss aversion — 30-day streak жоғалтпайды адамдар

### 7.4 Daily ritual
- Morning: daily quest popup
- Evening (Telegram push): «Brain rest reminder — 3 minutes»
- Бірен ритуалды инсталляциялаңыз → long-term user

---

## 8. SOCIAL & VIRALITY — төлем accelerator

### 8.1 Leaderboard real-time
- «Ерлан сіздің рекордыңызды бұзды!» notification
- Competitive instincts → қайта ойнау → monetization trigger

### 8.2 Referral program
Қазір: `socialTasks` бар
**Күшейту:**
- 1 дос → 3 күн Gold тегін (both)
- 3 дос → 1 апта Gold + 500 gems
- 10 дос → 1 ай Premium
- Code: referralCode + deep link
- Telegram share API

### 8.3 Guild/community (ұзақ мерзімді)
Код-та `guilds` terminology бар. Group гейміфикация:
- Guild tournament
- Guild weekly goal
- Group subscription discount («5+ guild members get 20% off»)

---

## 9. A/B ТЕСТТЕР (priority order)

$1000 бюджет жоқ — бірақ код бар. Әр тест 3-7 күн, 1000+ sessions керек.

1. **Paywall timing**: 3rd game vs. 5th game vs. 7th day — қай жерде conversion жоғары
2. **ReviveModal with-Gold-upsell vs without** — reviveModal-да Gold upsell
3. **Starter Bundle $1.99 vs $2.99** — price elasticity тест
4. **Free limit 3 games/day vs 5 games/day** — churn vs conversion
5. **Ads-as-revive vs pay-as-revive** — қайсы тиімді
6. **Shop home position top vs нижний** — awareness тест
7. **Streak protection $0.99 one-time vs included in Gold** — feature placement
8. **Tournament free entry vs 1-ticket** — participation
9. **Daily deal rotation vs static offers** — urgency эффектісі
10. **Onboarding B1 with brain age test vs direct play** — retention difference

### A/B тестінің техникасы
Код-та flag қолдану:
```ts
const variant = userId % 2 === 0 ? 'A' : 'B';
```
Немесе GrowthBook, Unleash, PostHog еркіне.

---

## 10. RED FLAGS (жасамау керек)

❌ **Нельзя:** барлық ойынды paywall-ға қою — пайдаланушы кетеді
❌ **Нельзя:** popup тым жиі — спам болады, trust жоғалады
❌ **Нельзя:** жалған urgency (таймер 24h, бірақ реалти never ends)
❌ **Нельзя:** dark pattern (unsubscribe қиын) — Telegram мини-апп-тар үшін ban risk
❌ **Нельзя:** Gold/Premium арасындағы айырма жоқ → пайдаланушы Silver алады
❌ **Нельзя:** TON token-ды «сатып алу шарты» ету — audience бөлінеді

---

## 11. 30-КҮНДІК QUICK WINS ПЛАНЫ

### 1-апта (implementation)
- [ ] ReviveModal-ға Gold upsell slot қосу (1 күн)
- [ ] `sessionsPlayed` counter store-ға қосу (2 сағат)
- [ ] Onboarding Brain Age test — 3 ойыннан шағын версия (2 күн)
- [ ] Starter Bundle $1.99 shop-та (1 күн)
- [ ] Anchor pricing — Premium $9.99 жоғары top (1 сағат)
- [ ] Loss framing shop copy-да (30 мин)

### 2-апта (trigger moments)
- [ ] HP=0 модальге revive UI (1 күн)
- [ ] Streak protection auto-offer day 6 (1 күн)
- [ ] Homepage daily deal banner (1 күн)
- [ ] Telegram push notifications schedule setup (3 күн)

### 3-апта (retention)
- [ ] Comeback bonus 3/7-күн (1 күн)
- [ ] Referral program expansion (2 күн)
- [ ] Leaderboard Gold badge + rank notification (2 күн)

### 4-апта (measure)
- [ ] Analytics setup — conversion funnel tracking (GA4, Mixpanel)
- [ ] A/B test framework — бірінші тесті іске қосу
- [ ] Бір айдағы conversion rate өлшеу → baseline

---

## 12. НАҚТЫ МЕТРИКАЛАР (30 күн кейін)

| Метрика | Baseline (болжам) | Мақсат (30 күн) |
|---------|-------------------|-----------------|
| Day-1 retention | 30-40% | 50%+ |
| Day-7 retention | 8-12% | 18-22% |
| Free → Paid conversion | 1-2% | 3-5% |
| ARPU | $1.50 | $3.00 |
| Average session length | 4 мин | 6 мин |
| Sessions/user/week | 3 | 5 |
| Paying user retention | 40% | 60% |

---

## 13. ҚОРЫТЫНДЫ

**Ең маңызды үш өзгеріс (80/20 rule):**

1. **ReviveModal-ға Gold upsell** — code-та 1 күнде іске асуы мүмкін, conversion +20-40%
2. **Starter Bundle $1.99** — first-purchase friction жояды, 5-10% free→paid lift
3. **3-games/day free limit** — scarcity қосады, upgrade pressure

Калғандар — optimization. Егер бұл үшеуі 30 күнде іске асса және метрикалар көтерілсе — бюджет артады, өзгертулер өсіп кетеді.

**Бастау үшін бір сөйлем:** «Revive модалді open-source қарап шық, Gold upsell slot қос, бүгін deploy ет.» Бұл кодтық 50-жол өзгеріс, ең жоғары ROI.
