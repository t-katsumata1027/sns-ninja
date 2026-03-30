/**
 * サーバー側環境変数の検証と一元管理
 */
export function validateEnv() {
  const serverRequired = [
    "GEMINI_API_KEY",
    "DATABASE_URL",
    "REDIS_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const publicRequired = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const missing = [...serverRequired, ...publicRequired].filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    if (process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE) {
      console.warn("⚠️ Build Phase: Skipping strict environment variable validation. Missing:", missing.join(", "));
      return process.env as any;
    }

    console.error("❌ Critical: Missing environment variables:", missing.join(", "));
    throw new Error(
      `Missing required environment variables: ${missing.join(
        ", "
      )}. Please check your .env or platform settings (Vercel/Render).`
    );
  }

  return {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    FAL_KEY: process.env.FAL_KEY, // Optional
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL, // Optional, Discord Error logging
  };
}

export const env = validateEnv();
