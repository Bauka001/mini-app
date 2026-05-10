# Telegram Stars Интеграциясын Орнату

## 📋 Шолу

Бұл нұсқаулық Telegram Stars төлем жүйесін Mini App-ке қосу үшін қажетті қадамдарды қамтиды.

## 🚀 Жылдам бастау

### 1-қадам: Telegram Bot Token алу

1. [@BotFather](https://t.me/BotFather) ботты ашыңыз
2. `/newbot` командасын жіберіңіз
3. Боттың аты мен username енгізіңіз
4. Көрсетілген **BOT TOKEN** көшіріңіз
5. Токенді `.env` файлында `BOT_TOKEN` переменныене орнатыңыз

```env
BOT_TOKEN=your_telegram_bot_token_here
```

### 2-қадам: BotFather-де Stars қосу

1. @BotFather → сіздің ботты таңдаңыз → **Payments** → **Stars**
2. Stars қызметі белсендірілгенін тексеріңіз
3. Payments бөлігінде керекті конфигурацияларды тексеріңіз

### 3-қадам: Серверді қосу

```bash
npm run dev
```

Сервер `http://localhost:3001` адресінде қосылады.

### 4-қадам: Тестілеу

```bash
npm run test-stars
```

Бұл команда:
- Боттың байланысын тексеретіні
- Webhook конфигурациясын көрсететіні
- Тест инвойсын құратыны
- Транзакцияларды көрсететіні

## 🔗 Webhook орнату (Өндіріс үшін)

### Өндіріс сервері болғанда:

1. Серверге SSL сертификаты орнатыңыз
2. Домейн алыңыз (мысалы: `your-domain.com`)
3. `.env` файлында webhook URL орнатыңыз:

```env
WEBHOOK_URL=https://your-domain.com/payments/stars/webhook
```

4. Webhook орнату командасын орындаңыз:

```bash
npm run setup-webhook
```

### Жергілікті тестілеу:

Жергілікті тестілеу кезінде webhook орнату міндетті емес - клиент поллинг арқылы статус тексеретін болады.

## 🧪 Тестілеу процессі

### Frontend тестілеу:

1. **Shop бетін ашыңыз**:
   - Mini App-те Shop бөлігіне өтіңіз
   - "VIP" табын таңдаңыз

2. **План таңдаңыз**:
   - Basic (140 Stars)
   - Pro (175 Stars)  
   - Premium (205 Stars)

3. **Stars төлемін таңдаңыз**:
   - "Stars" әдісін таңдаңыз
   - "Төлеу" батырмасын басыңыңыз

4. **Төлем аяқтау**:
   - Telegram инвойсы ашылады
   - Төлемді аяқтаңыз
   - VIP автоматты беріледі

### Сервер жағында тестілеу:

```bash
node test-stars.js
```

Бұл команда келесілерді тексереді:
- ✅ Боттың байланысы
- ✅ Webhook конфигурациясы
- ✅ Инвойс құру
- ✅ Транзакциялар

## 💰 Балансты бақылау

### BotFather арқылы:

1. @BotFather → сіздің бот → **Payments** → **Stars**
2. **Баланс** және **Транзакциялар** тарихын көресіз

### Bot API арқылы:

```javascript
// Stars транзакцияларын алу
const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getStarTransactions`);
const data = await response.json();
console.log('Stars балансі:', data.result);
```

## 🛠️ Troubleshooting

### "BOT_TOKEN is not configured" қатесі:

**Шешу:** `.env` файлында `BOT_TOKEN` орнатылмаған

```env
BOT_TOKEN=your_actual_token_here
```

### "Failed to set up webhook" қатесі:

**Шешу:**
1. Webhook URL дұрыс екенін тексеріңіз
2. SSL сертификаты бар-жоғын тексеріңіз
3. Domain DNS конфигурациясын тексеріңіз

### "Invoice creation failed" қатесі:

**Шешу:**
1. BotFather-де Stars қосылуын тексеріңіз
2. Bot API токенінің жарамдылығын тексеріңіз
3. Боттың permissions-ін тексеріңіз

### VIP бермейді:

**Шешу:**
1. Supabase конфигурациясын тексеріңіз
2. Payment статусын `payment_orders` таблицасында тексеріңіз
3. Webhook немесе поллинг істеп тұрғанын тексеріңіз

## 📊 Деректер құрылымы

### Supabase таблицалары:

**payment_orders:**
- Stars төлемдерінің деректері
- Статустар: `created` → `pending` → `paid`

**user_entitlements:**
- VIP құқықтары
- Басталу және аяқталу уақыттары
- Төлем деректері

**user_social_tasks:**
- "free_tournament_entry" билеттері
- Premium қолданушыларға автоматты беріледі

## 🔄 Ақша шығару (Withdrawal)

### BotFather арқылы:

1. @BotFather → сіздің бот → **Payments** → **Stars**
2. **Withdraw** опциясын таңдаңыз
3. Telegram Stars шығару нұсқауларын орындаңыз
4. Банк шотыңызға аудару аласыз

### Кез-келген криптобиржа арқылы:

- Stars-ты шығарып, кез-келген криптобиржа арқылы ала аласыз

## 🎯 Қолайлы кеңестер

- **Әрқашан тестілеумен бастаңыз** - өндіріске дейін барлық функцияларды тексеріңіз
- **Балансты күнделікті тексеріңіз** - BotFather арқылы Stars балансын бақылап отырыңыз
- **Webhook логтарын сақтаңыз** - мәселелерді табуға көмектеседі
- **SSL сертификаты** - өндіріс webhook-ы үшін міндетті

## 📞 Көмек

Telegram Bot API документациясы: https://core.telegram.org/bots/api

Mini App Stars документациясы: https://core.telegram.org/bots/payments#stars

---

**Жасалған:** Telegram Stars интеграциясы толық іске қосылды 🎉

**Келесі қадамдар:**
1. ✅ Ботты конфигурациялаңыз
2. ✅ Тестілеуді орындаңыз  
3. ✅ Өндіріске шығыңыз
4. 💰 Stars балансын бақылап отырыңыз
