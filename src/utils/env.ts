type EnvSchema = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_API_URL?: string;
};

const PLACEHOLDER_VALUES = new Set([
  'your-anon-key-here',
  'https://your-project.supabase.co',
  'placeholder-key',
  'your_telegram_bot_token_here',
]);

const isPlaceholder = (value: string | undefined): boolean =>
  !value || PLACEHOLDER_VALUES.has(value);

const readRaw = (key: keyof EnvSchema): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === 'string' ? value.trim() : undefined;
};

const validate = (): { env: EnvSchema; missing: string[]; warnings: string[] } => {
  const warnings: string[] = [];
  const missing: string[] = [];

  const supabaseUrl = readRaw('VITE_SUPABASE_URL');
  const supabaseAnonKey = readRaw('VITE_SUPABASE_ANON_KEY');
  const apiUrl = readRaw('VITE_API_URL');

  if (isPlaceholder(supabaseUrl)) {
    missing.push('VITE_SUPABASE_URL');
  } else if (!/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl!)) {
    warnings.push(`VITE_SUPABASE_URL does not look like a Supabase URL: ${supabaseUrl}`);
  }

  if (isPlaceholder(supabaseAnonKey)) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  } else if (supabaseAnonKey!.length < 40) {
    warnings.push('VITE_SUPABASE_ANON_KEY looks too short to be a valid anon key.');
  }

  if (apiUrl && !/^https?:\/\//.test(apiUrl)) {
    warnings.push(`VITE_API_URL must start with http:// or https://: ${apiUrl}`);
  }

  return {
    env: {
      VITE_SUPABASE_URL: supabaseUrl ?? '',
      VITE_SUPABASE_ANON_KEY: supabaseAnonKey ?? '',
      VITE_API_URL: apiUrl,
    },
    missing,
    warnings,
  };
};

const { env, missing, warnings } = validate();

if (missing.length) {
  // Logged in both dev and prod — silent placeholders mask real problems.
  console.error(`[env] Missing required env vars: ${missing.join(', ')}`);
}
if (warnings.length && import.meta.env.DEV) {
  for (const w of warnings) console.warn(`[env] ${w}`);
}

export const ENV = env;
export const isMissingEnv = missing.length > 0;
export const missingEnvKeys = missing;
// Default to relative '/api' so the frontend always talks to its own origin —
// in prod the Vercel function answers there, and in dev Vite's proxy in
// vite.config.ts forwards to the local Express server on :3001. Override with
// VITE_API_URL only if you're running the SPA against a different backend.
export const apiUrl = (): string => env.VITE_API_URL || '/api';
