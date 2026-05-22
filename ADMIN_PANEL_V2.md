# 🛠 Admin Panel V2 — браузер арқылы кіретін жаңа админ панель

Бұл — Focus қосымшасының бұрынғы Telegram Mini App ішіндегі әкімшілік
бөліміне балама. Енді браузерден тікелей кіріп, промокодтар жасап,
акция күнін ұзартып, қосымша туралы ақпарат алуға болады.

## Не жасалды

* **Жаңа SQL миграция** — `supabase/migrations/006_admin_panel_v2.sql`
  (`promo_codes`, `promo_code_redemptions`, `admin_sessions`, `app_settings`, `admin_app_overview`)
* **Backend модулі** — `server/admin-v2.js` (барлық `/api/admin-v2/*` маршруттары:
  логин, статистика, промокодтар CRUD, акция күнін орнату, қолданушылар тізімі).
  `server/index.js` оны автоматты талап етіп (`require('./admin-v2')`) Express
  қосымшаға тіркейді.
* **Браузер UI** — `public/admin.html` (бір файлдан тұратын SPA, бөлек build керек емес)
* **Static route** — `GET /admin` және `GET /admin.html` сол HTML-ді береді

## 1. SQL миграцияны қолдану

Supabase SQL Editor-да `supabase/migrations/006_admin_panel_v2.sql`
файлын ашып, орындаңыз. Бұл келесі объектілерді қосады:

| Объект | Не үшін |
|---|---|
| `app_settings` | Жаһандық параметрлер (мысалы `promotion_end_iso`) |
| `promo_codes` | Болгерлерге берілетін кодтар |
| `promo_code_redemptions` | Кодтың қайдан, кім қолданғаны |
| `admin_sessions` | Браузер логин токендері |
| `admin_app_overview` | Дашборд үшін агрегатталған көріністер |

## 2. .env файлын жаңарту

`.env` ішіне 3 жаңа айнымалы:

```env
ADMIN_PANEL_LOGIN=admin
ADMIN_PANEL_PASSWORD=қандай-да-бір-күшті-пароль
ADMIN_PANEL_OWNER_TG_ID=5357445431
```

⚠️ Production-та `ADMIN_PANEL_PASSWORD`-ты міндетті түрде ауыстырыңыз.
Парольсіз backend `/api/admin-v2/login`-ды бұғаттайды.

## 3. Backend-ті іске қосу

`server/` папкасынан:

```bash
npm install
npm start    # немесе node index.js
```

Server `http://localhost:3001` (немесе `PORT` env)-те жұмыс істейді.

## 4. Браузерден кіру

| Жағдай | URL |
|---|---|
| Жергілікті дев | `http://localhost:3001/admin` |
| Production (бір домен) | `https://your-domain.com/admin` |
| API басқа доменде болса | `https://your-domain.com/admin?api=https://api.your-domain.com` |

`?api=...` параметрін бір рет ашсаңыз болды — ол `localStorage`-ге сақталады,
кейін `/admin` жай ашсаңыз да API сол URL-ге сұранады.

Логин экранында `.env`-те қойған логин/паролді енгізіңіз → токен
`localStorage`-ге жазылады, сессия 12 сағатқа жарамды. **Шығу** түймесі
токенді өшіреді.

## 5. Не істей аласыз

* **Дашборд** — қолданушылар саны, ақылы жоспарлар, жаңа кері байланыс,
  тікеттер күйі, акция таймері.
* **Промокодтар** — болгерге жаңа код шығару (автоматты немесе қолмен),
  жеңілдік пайыз, лимит, мерзім, болгер аты, ескертпе. Қосу/өшіру/жою.
* **Акция күні** — +3/+7/+14/+30/+60 күн жылдам ұзарту немесе нақты
  күн/сағат орнату. Барлығы `app_settings.promotion_end_iso`-ге жазылады.
* **Қолданушылар** — соңғы 50-і, telegram_id, username, atы бойынша іздеу.
* **Қосымша туралы** — backend параметрлері, әкімші сессиясының күйі.

## 6. Mini App-пен байланыс (көпір)

Әкімші панеліндегі өзгерістер автоматты түрде Mini App-та көрінуі үшін
келесі **публичный** эндпойнтер қосылған (auth керек емес):

| Endpoint | Не үшін |
|---|---|
| `GET /api/admin-v2/public/promotion` | Қазіргі акция аяқталу күнін қайтарады. Mini App `loadUserFromSupabase` ішінде шақырады, бар болса қолданушының локалды `promotionEndISO`-нан басым. |
| `POST /api/admin-v2/public/validate-promo` | Промокодты тексереді, жеңілдік пайызын қайтарады. Серверлік `getTonPromoOffer` fallback ретінде шақырады, сондықтан әкімші панелінен жасалған кодтар TON төлемінде де жұмыс істейді. |

### Mini App-ты қайта build ету керек

Өзгерістерді production-ға шығару үшін:

```powershell
cd "C:\Users\Huawei\OneDrive\Рабочий стол\mini app"
npm run build
```

Содан кейін деплой:

* **Vercel-ге**: `npm run deploy:vercel` немесе `vercel --prod`
* **GitHub Pages**: `npm run deploy`
* **Локалды тест**: `npm run preview`

Backend-ті де (server/) бөлек қайта іске қосуды ұмытпаңыз — өзгертулерді
оқу үшін.

### Production-та `VITE_API_URL` нені көрсетуі керек?

Mini App `import.meta.env.VITE_API_URL` мекенжайына сұраныс жібереді
(`/api/admin-v2/public/promotion`). Сондықтан `.env`-те бұл айнымалы
backend-тың **жариялы** URL-ін көрсетуі қажет:

```env
VITE_API_URL=https://your-backend.example.com
```

Backend локалда `localhost:3001`-де тұрса — Mini App браузерден ашылғанда
`localhost:3001`-ге жете алмайды. Сондықтан production-да backend-ті
HTTPS астында ашық серверге деплой ету керек (Render, Railway,
Fly.io, VPS, т.с.с.).

## 7. Қауіпсіздік ескертулері

* `admin_sessions` кестесіне қол жеткізу тек service role арқылы
  (RLS блоктайды). Frontend ешқашан тікелей кірмейді.
* Браузер логин **пароль негізінде**, сондықтан HTTPS міндетті.
* Кез келген әрекет `audit_logs` кестесіне жазылады.
* Сессия мерзімі: 12 сағат. Ескісі автоматты қабылданбайды.

## 8. Тексеру тізімі

- [ ] `006_admin_panel_v2.sql` Supabase-те орындалды
- [ ] `.env`-те `ADMIN_PANEL_PASSWORD` қойылды
- [ ] `npm start` server-де іске қосылды
- [ ] `/admin` бетіне браузерден кіру өтеді
- [ ] Жаңа промокод жасап көру (генерация жұмыс істейді)
- [ ] Акция күнін +7 күнге ұзартып, дашбордтан тексеру
