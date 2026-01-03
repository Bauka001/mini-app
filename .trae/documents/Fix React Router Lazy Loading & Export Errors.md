I have identified the root cause of the `TypeError: Cannot convert object to primitive value`. It is caused by **incorrect module exports** in your page components, specifically `Profile.tsx`, which is missing an `export default` statement while `App.tsx` tries to import it as a default export. This causes React's `lazy` loader to fail.

Here is the comprehensive fix plan:

### 1. Fix Exports in Page Components
I will standardize all page components to use `export default`. This ensures consistency and prevents `lazy` loading errors.

*   **`src/pages/Profile.tsx`**: Add `export default ProfilePage;` at the end. (Currently missing).
*   **`src/pages/Guilds.tsx`**: Add `export default GuildsPage;` at the end.
*   **`src/pages/DailyWorkout.tsx`**: Add `export default DailyWorkoutPage;` at the end.

### 2. Update `App.tsx` Imports
I will update `src/App.tsx` to use clean, standard lazy imports for all pages, removing the complex `.then(module => ...)` pattern which is error-prone.

**Current (Fragile):**
```typescript
const GuildsPage = lazy(() => import('./pages/Guilds').then(module => ({ default: module.GuildsPage })));
const ProfilePage = lazy(() => import('./pages/Profile')); // Fails because no default export!
```

**New (Standard):**
```typescript
const GuildsPage = lazy(() => import('./pages/Guilds'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const DailyWorkoutPage = lazy(() => import('./pages/DailyWorkout'));
const BattlePage = lazy(() => import('./pages/Battle'));
```

### 3. Verification
*   I will verify that all pages load correctly without errors.
*   I will double-check `i18n` usage to ensure no objects are passed as translation keys.

This "Head-to-Toe" fix will resolve the routing crash permanently.