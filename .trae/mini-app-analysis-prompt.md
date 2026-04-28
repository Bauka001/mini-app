# Focus App Mini App - Толық Талдау Промпты

## Жоба туралы ақпарат
**Проект атауы:** Focus App
**Тип:** Telegram Mini App
**Версия:** 2.0.0
**Платформа:** React + Vite + TypeScript
**Бэкенд:** Express.js + Supabase

---

## Талдау міндеттері

Бұл промпт Focus App мини апптың ағымдағы күйін тексеріп, келесі талдауларды орындауы тиіс:

### 1. 📁 **Жоба құрылымының талдауы**
- `src/` директориясының ұйымдастырылуын тексеру
- Компоненттердің бөлінуі (components/, pages/, hooks/, utils/)
- Type definitions және interfaces'тердің дұрыстығы
- File naming conventions'ды тексеру
- Дубликат кодтарды анықтау

### 2. 🧩 **Архитектуралық талдау**
- State management (Zustand store) құрылымы
- Routing құрылымы (React Router)
- Component hierarchy және reusability
- API integration құрылымы
- Error handling стратегиялары

### 3. 🎮 **Функционалдық талдау**
- **Ойындар:** 11 ойынның әрқайсысының реализациясы
  - Memory, Schulte, Math, Pairs, Stroop, Tetris, 2048
  - Agent Sequence, Agent Spot, Code Breaker, Odd One Out
- **Daily Workout:** 3 кездейсоқ ойын сессиясының логикасы
- **VIP System:** Жазылым, төлем, мүмкіндіктер
- **Tournament:** Weekend турнир жүйесі
- **Analytics:** VIP analytics функционалы
- **Shop:** Skins және VIP subscription

### 4. 💰 **Монетизация талдауы**
- VIP subscription (Monthly $4.99 / Yearly $39.99)
- TonConnect төлем интеграциясы
- Telegram Stars төлемі
- Skin сатып алу механикасы
- Tournament кіру билеттері
- Daily rewards және challenges

### 5. 🔧 **Техникалық талдау**
- **Dependencies:** package.json'dегі барлық пакеттерді талдау
  - React 18.3.1
  - React Router DOM 7.11.0
  - Zustand 5.0.9
  - Supabase JS 2.101.0
  - TonConnect UI React 2.3.1
  - Framer Motion 12.23.26
  - Recharts 3.6.0
  - i18next 25.7.3
- **Type Safety:** TypeScript қолданылуын тексеру
- **Performance:** Оптимизация мүмкіндіктері
- **Security:** API key handling, auth flow
- **Build process:** Vite конфигурациясы

### 6. 🌐 **Интернационализация талдауы**
- 3 тіл қолдауы (EN/RU/KZ)
- i18next конфигурациясы
- Translation key ұйымдастырылуы
- Missing translation key'лерді анықтау

### 7. 📊 **State Management талдауы**
- `useStore.ts` - негізгі store құрылымы
- Local storage integration
- State mutations және getters
- Performance optimization (re-renders)

### 8. 🎨 **UI/UX талдауы**
- Tailwind CSS конфигурациясы
- Theme system (light/dark/gold/blue)
- Responsive design
- Animation (Framer Motion)
- User flow'лар
- Accessibility

### 9. 📱 **Telegram Integration талдауы**
- Telegram Mini App SDK интеграциясы
- initData handling
- TonConnect wallet connection
- In-app notifications
- Haptic feedback

### 10. 🗄️ **Backend & Database талдауы**
- Express.js API endpoints
- Supabase database schema
- Migration files'ды тексеру
- Authentication flow
- Data consistency

### 11. 🚀 **Deployment талдауы**
- Vercel deployment конфигурациясы
- Environment variables
- Build optimization
- CI/CD қажеттіліктері

### 12. ⚠️ **Мәселелер мен оңтайландырулар**
- Бұзылқан немесе жетіспейтін функциялар
- Performance мәселелері
- Code duplication
- Technical debt
- Security мәселелері
- User experience мәселелері

---

## Талдау шығарылымы

Талдау нәтижесінде келесі бөлімдер болуы тиіс:

### 📋 **Ағымдағы күйінің жиынтығы**
- Жобаның жалпы сипаттамасы
- Негізгі мүмкіндіктер
- Техникалық стек

### ✅ **Жақсы жақтары**
- Күшті жақтар мен артықшылықтар
- Дұрыс реализацияланған функциялар
- Ерекшеліктер

### ⚠️ **Мәселелер мен кемшіліктер**
- Бұзылқан немесе жетіспейтін функциялар
- Technical debt
- Performance мәселелері
- UX проблемалары
- Security мәселелері

### 🔧 **Оңтайландыру ұсыныстары**
- Қысқа мерзімді (бір апта ішінде)
- Орта мерзімді (бір ай ішінде)
- Ұзақ мерзімді (үш айдан артық)

### 📊 **Метрикалар мен KPI'лер**
- Бақылауға тиісті көрсеткіштер
- Success criteria
- Monitoring қажеттіліктері

### 🚀 **Келесі қадамдар**
- Приоритеттілік тізімі
- Action items
- Timeline

---

## Анализдің форматы

```markdown
## 📊 Focus App - Толық Талдау Баяндамасы

### 📋 Ағымдағы күйінің жиынтығы
[Жоба сипаттамасы]

### ✅ Жақсы жақтары
[Артықшылықтар тізімі]

### ⚠️ Мәселелер мен кемшіліктер
#### Critical
[Критикалық мәселелер]

#### High Priority
[Жоғары приоритетті мәселелер]

#### Medium Priority
[Орта приоритетті мәселелер]

#### Low Priority
[Төмен приоритетті мәселелер]

### 🔧 Оңтайландыру ұсыныстары
#### Қысқа мерзімді (1 апта)
[Ұсыныстар]

#### Орта мерзімді (1 ай)
[Ұсыныстар]

#### Ұзақ мерзімді (3+ ай)
[Ұсыныстар]

### 📊 Метрикалар мен KPI'лер
[Бақылау көрсеткіштері]

### 🚀 Келесі қадамдар
1. [Бірінші қадам]
2. [Екінші қадам]
...
```

---

## Қосымша нұсқаулар

- Барлық файлдарды оқып, кодтың нақты күйін талдау
- Мүмкіндігінше автоматты тесттерді тексеру
- Кодтың readability және maintainability аспектілерге назар аудару
- Real-world deployment қажеттіліктерін ескеру
- User feedback мүмкіндіктерін қарастыру

---

## Шектеулер

- Тек бар файлдарды талдау (жоқ кодты болжау емес)
- Функционалдық талдауға баса назар аудару
- Практикалық және қол жеткізетін ұсыныстар беруге тырысу
- Бағасын объективті және фактік негізде жасау
