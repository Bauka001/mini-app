---
name: "mini-app-analyzer"
description: "Analyzes the current state of the Focus App Telegram Mini App project including structure, functionality, architecture, and technical debt. Invoke when user requests comprehensive project analysis, health check, or audit."
---

# Mini App Analyzer

This skill performs a comprehensive analysis of the Focus App Telegram Mini App project, examining its current state, functionality, architecture, and identifying areas for improvement.

## Analysis Scope

### 1. Project Structure Analysis
- `src/` directory organization
- Component separation and hierarchy
- File naming conventions
- Code duplication detection
- Type definitions and interfaces

### 2. Architecture Analysis
- State management (Zustand store) structure
- Routing configuration (React Router)
- Component hierarchy and reusability
- API integration patterns
- Error handling strategies

### 3. Functional Analysis
- **Games:** All 11 games implementation quality
  - Memory, Schulte, Math, Pairs, Stroop, Tetris, 2048
  - Agent Sequence, Agent Spot, Code Breaker, Odd One Out
- **Daily Workout:** 3 random games session logic
- **VIP System:** Subscription, payment, features
- **Tournament:** Weekend tournament system
- **Analytics:** VIP analytics functionality
- **Shop:** Skins and VIP subscription

### 4. Monetization Analysis
- VIP subscription (Monthly $4.99 / Yearly $39.99)
- TonConnect payment integration
- Telegram Stars payment
- Skin purchase mechanics
- Tournament entry tickets
- Daily rewards and challenges

### 5. Technical Analysis
- **Dependencies:** All packages in package.json
- **Type Safety:** TypeScript implementation quality
- **Performance:** Optimization opportunities
- **Security:** API key handling, auth flow
- **Build process:** Vite configuration

### 6. Internationalization Analysis
- 3 language support (EN/RU/KZ)
- i18next configuration
- Translation key organization
- Missing translation key detection

### 7. State Management Analysis
- `useStore.ts` main store structure
- Local storage integration
- State mutations and getters
- Performance optimization

### 8. UI/UX Analysis
- Tailwind CSS configuration
- Theme system (light/dark/gold/blue)
- Responsive design
- Animation (Framer Motion)
- User flows
- Accessibility

### 9. Telegram Integration Analysis
- Telegram Mini App SDK integration
- initData handling
- TonConnect wallet connection
- In-app notifications
- Haptic feedback

### 10. Backend & Database Analysis
- Express.js API endpoints
- Supabase database schema
- Migration files review
- Authentication flow
- Data consistency

### 11. Deployment Analysis
- Vercel deployment configuration
- Environment variables
- Build optimization
- CI/CD requirements

### 12. Issues and Optimizations
- Broken or missing functionality
- Performance issues
- Code duplication
- Technical debt
- Security issues
- User experience issues

## Analysis Output Format

```markdown
## 📊 Focus App - Complete Analysis Report

### 📋 Current State Summary
[Project overview]

### ✅ Strengths
[List of advantages]

### ⚠️ Issues and Deficiencies
#### Critical
[Critical issues]

#### High Priority
[High priority issues]

#### Medium Priority
[Medium priority issues]

#### Low Priority
[Low priority issues]

### 🔧 Optimization Recommendations
#### Short-term (1 week)
[Recommendations]

#### Medium-term (1 month)
[Recommendations]

#### Long-term (3+ months)
[Recommendations]

### 📊 Metrics and KPIs
[Monitoring indicators]

### 🚀 Next Steps
1. [First step]
2. [Second step]
...
```

## Analysis Guidelines

- Read and analyze all relevant files
- Focus on functional analysis
- Provide practical and actionable recommendations
- Keep assessments objective and fact-based
- Consider real-world deployment requirements
- Evaluate user feedback capabilities
- Check for automated tests
- Assess code readability and maintainability

## Analysis Process

1. **Read Key Files:**
   - `package.json` - dependencies and scripts
   - `src/App.tsx` - main app structure
   - `src/store/useStore.ts` - state management
   - `src/pages/Home.tsx` - main entry point
   - `src/pages/Shop.tsx` - monetization
   - `vite.config.ts` - build configuration
   - `tsconfig.json` - TypeScript config

2. **Analyze Component Structure:**
   - Review all components in `src/components/`
   - Check pages in `src/pages/`
   - Examine hooks in `src/hooks/`
   - Review utilities in `src/utils/`

3. **Examine Games:**
   - Check all game implementations
   - Verify game mechanics
   - Assess scoring systems
   - Review user experience

4. **Review Integrations:**
   - Telegram SDK usage
   - Supabase integration
   - TonConnect implementation
   - Payment flows

5. **Identify Issues:**
   - Broken functionality
   - Missing features
   - Performance bottlenecks
   - Security vulnerabilities
   - Code quality issues

6. **Generate Report:**
   - Compile findings
   - Prioritize issues
   - Provide recommendations
   - Create action plan

## Priority Levels

- **Critical:** Must fix immediately, blocking core functionality
- **High Priority:** Should fix soon, affecting user experience significantly
- **Medium Priority:** Nice to have, improves quality/performance
- **Low Priority:** Cosmetic or minor improvements

## Usage Examples

**User:** "Analyze the current state of my Focus App project"
**Action:** Perform comprehensive analysis following the scope above

**User:** "Check for technical debt in the mini app"
**Action:** Focus on code quality, duplication, and architectural issues

**User:** "What needs to be improved in the Focus App?"
**Action:** Provide prioritized optimization recommendations

**User:** "Audit the Focus App for deployment readiness"
**Action:** Focus on deployment analysis, security, and production readiness
