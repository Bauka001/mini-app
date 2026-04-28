# Көзқырағы — Design Upgrade Prompt (Claude Opus 4.7 үшін)

> Төмендегі промптты Claude Opus 4.7-ге бер. Ол `index.html`-ды ашып, дизайнды толық жаңартады.

---

## РӨЛ

Сен — премиум-класстағы мобильді ойындардың (Monument Valley, Alto's Odyssey, Florence, Forest, Tide, Finch) эстетикасы мен UX-ін жақсы білетін senior product designer және front-end инженерсің. Сен Telegram Mini Apps-тың 2026 жылғы гайдлайндарын, safe-area, haptic feedback, full-screen layout ережелерін сақтайсың.

## КОНТЕКСТ

Жоба: **Көзқырағы** — қазақ даласы стиліндегі қысқа мерзімді көру жадысы мен зейінді жаттықтыратын Telegram Mini App. Барлық код бір `index.html` файлда (HTML + CSS + JS, ешқандай build, framework немесе тәуелділік жоқ). Мақсатты экран — телефон (iPhone/Android), ені 500px-ға шектелген. 12 деңгей, 3 сұрақ типі (Presence / Absence / Count), жұлдыз жүйесі, `localStorage` прогрессі, Telegram WebApp SDK интеграциясы.

Қазіргі палитра — қоңыр-қызғылт сары дала түстері (`#2b1810`, `#4a2c1a`, `#f4b860`, `#e87a4c`). Логотип — бүркіт. Мұны сақтап, бірақ әлдеқайда премиум көрсетуге ұмтыл.

## МАҚСАТ

`index.html`-ды құрылымдық жағынан сол күйінде қалдырып (экрандар, ID-лер, JS логикасы өзгермейді), **визуал дизайн мен микро-интерактивтілікті** Monument Valley / Alto's Odyssey деңгейіне жеткіз. Пайдаланушы ойынды ашқанда "О, бұл кәсіби студия жасаған" деп ойлауы керек.

## ДИЗАЙН ПРИНЦИПТЕРІ (қатаң сақта)

1. **Minimalism with soul** — артық элемент жоқ, бірақ әр беттің өзіндік "суреті" бар (Monument Valley: "әр кадр қабырғаға ілетіндей болсын").
2. **Calm, low-stimulus palette** — зейін ойыны болғандықтан, көзді шаршатпайтын жылы түстер. Cortisol төмендететін палитра (Lofizen, Tide мысалы).
3. **Depth through layering** — flat emes, бірақ skeuomorphism да emes. Субтильді shadow, blur, gradient, grain noise арқылы тереңдік бер.
4. **Environmental storytelling** — фонда жай gradient emes, дала силуэттері (таулар, шатыр, күн, бүркіт көлеңкесі) параллакс арқылы қозғалсын.
5. **Motion as feedback** — әр түйме басылғанда, деңгей ашылғанда, дұрыс/бұрыс жауап берілгенде — spring animation (cubic-bezier), haptic + визуал бірге.
6. **Mobile-first, thumb-zone aware** — барлық негізгі CTA экранның төменгі 1/3-де, safe-area-inset ескерілген.
7. **Typography with hierarchy** — 1 display font (тақырыпқа, Cormorant немесе Fraunces сияқты serif — қазақ дастандарына сай), 1 UI font (Inter немесе SF Pro style). `font-feature-settings: "ss01", "cv11"` қолдан.

## НАҚТЫ ӨЗГЕРІСТЕР

### 1. Home screen
- Бүркіт emoji emes, **SVG бүркіт силуэті** салып, жел арқылы жәй тербеліп тұрсын (CSS `@keyframes` + `transform: translateY` emes, `transform: rotate(-2deg) → rotate(2deg)` subtle).
- Фонда **параллакс дала**: 3 қабат SVG (алыс таулар, орта таулар, жақын шөп), әр қайсысы әр түрлі жылдамдықта scroll/tilt-қа жауап берсін (`DeviceOrientation API` немесе `mousemove` fallback).
- Күн/ай — экранның жоғарғы оң жағында, жұмсақ glow радиалды gradient.
- Grain / noise texture — SVG filter `feTurbulence` арқылы (2-3% opacity) барлық фонға.
- Негізгі түйме ("Ойнау") — gradient + inner shadow + subtle press animation (масштаб 0.97 + shadow azaytu).

### 2. Level select
- Grid 3×N — әр карта бір "жерлеу орны" / "қарауыл мұнарасы" сияқты силуэт болсын (қазақ даласындағы бағдаршам).
- Locked деңгейлер — монохромды + кіші құлыпша SVG, аздап blur.
- Current деңгей — жұмсақ pulsing gold glow (box-shadow анимациясы).
- Completed деңгейлер — 1/2/3 жұлдыз + субтильді gold foil эффект (gradient + shimmer animation).
- Карточка басылғанда — haptic "light" + масштаб 0.96 + 200ms scale-up back (spring).

### 3. Game screen (сахна + сұрақ)
- Объектілерді көрсететін сахна — **fade-in stagger** (әр объект 50-80ms кідіріспен пайда болсын).
- Таймер — жоғарыда thin progress bar, түсі уақыт азайған сайын `#f4b860 → #e87a4c → #b83d3d` градиентімен ауысады.
- Сұрақ карточкасы — bottom sheet стилінде (Apple/iOS pattern), `border-radius: 24px 24px 0 0`, аздап backdrop-blur.
- Жауап варианттары — үлкен тap target (min 56px), 2×2 grid телефон үшін ыңғайлы.
- Дұрыс жауап — жасыл pulse + haptic "success" + конфетти emes, кіші sparkle particles (3-4 dots, fade-out).
- Бұрыс жауап — қызыл shake (3-цикл, 80ms) + haptic "error" + дұрыс жауапты highlight.

### 4. Result screen (жұлдыздар)
- 3 жұлдыз — бірінен кейін бірі stagger animation, scale + rotate + gold glow. Әр жұлдыз пайда болғанда haptic "medium".
- "Келесі деңгей" түймесі — CTA primary, толық ені.
- "Қайта" және "Мәзір" — secondary, кіші.

### 5. Micro-details
- Барлық transition `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot spring).
- `@media (prefers-reduced-motion: reduce)` — барлық анимацияны өшір.
- `prefers-color-scheme: dark` — қазіргі палитра dark режимге сай, light режим керек емес (ойынның эстетикасы түнгі дала).
- Safe-area-inset-top/bottom — барлық screen-де сақталсын.
- `touch-action: manipulation` — double-tap zoom өшірулі (қазір бар, тексер).
- Telegram WebApp: `tg.expand()`, `tg.requestFullscreen()` (2026), `tg.HapticFeedback.impactOccurred('light'/'medium'/'heavy')` барлық тап-та.

### 6. Палитра (нақты ұсыныс)
Қазіргі түстерді сақтап, жаңа accent қос:
```css
--bg-1: #1a0f08;       /* түн даласы, тереңірек */
--bg-2: #2b1810;
--bg-3: #4a2c1a;
--sky-1: #f4b860;      /* күн сәулесі */
--sky-2: #e87a4c;      /* таң шапағы */
--sky-3: #8b3a3a;      /* күн батуы */
--accent: #d4a84b;     /* gold, жұлдыздар */
--accent-soft: #f5d98e;
--card: #fef6e4;
--card-dark: #f5e6c8;
--text: #2b1810;
--text-soft: #6b4423;
--success: #6b9e4a;    /* жасыл, шөп түсі */
--danger: #c14949;
--grain: url("data:image/svg+xml;utf8,<svg ...feTurbulence...>");
```

## ӨЗГЕРТУГЕ БОЛМАЙТЫН НӘРСЕЛЕР

- JS логикасы (deңгей generation, scoring, storage) — қолданба!
- HTML экран ID-лері (`#home-screen`, `#levels-screen`, т.б.) — сақта.
- Файл саны — ЖАЛҒЫЗ `index.html` болып қалсын. CSS/JS сыртқа шығарма.
- CDN-дан font жүктесең, `<link rel="preconnect">` + `font-display: swap` қой.
- Жалпы файл көлемі 150KB-тан аспасын (SVG-лерді сығып қой).

## ДЕЛИВЕРАБЛ

1. Жаңартылған толық `index.html` (бір файл).
2. Жасалған негізгі өзгерістердің қысқа (5-7 пункт) тізімі.
3. Енді не қосуға болатынының 3 ұсынысы (sound design, onboarding, streaks т.б.).

## СЫН КӨЗІ (self-review checklist, жіберерден бұрын)

- [ ] iPhone SE (375×667) және iPhone 15 Pro Max (430×932) екеуінде де дұрыс көрінеді ме?
- [ ] Safe-area notch/home-indicator-мен қабаттасатын элемент жоқ па?
- [ ] Барлық tap target ≥ 44×44px па?
- [ ] Дизайн Monument Valley / Alto's Odyssey деңгейінде премиум сезіле ме, әлде әлі де "hobby project" сияқты ма?
- [ ] Қазақ даласы эстетикасы көрініп тұр ма, әлде generic mobile game бе?
- [ ] 60fps ұстап тұр ма (анимациялар `transform` + `opacity` арқылы ғана)?

---

**Соңғы ескерту:** өзіңе сенімді бол. Ұсақ-түйекке такырама — толық реворк жаса. Сен бұл жобаны Apple Design Award номинациясына дайындап жатқандайсың.
