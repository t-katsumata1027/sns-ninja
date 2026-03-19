/**
 * サーバー側環境変数の検証と一元管理
 */
export function validateEnv() {
  const serverRequired = ["GEMINI_API_KEY", "DATABASE_URL"];
  const publicRequired = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  const missing = [...serverRequired, ...publicRequired].filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `ミッシング環境変数: ${missing.join(", ")}. .env.local を確認してください。`
    );
  }

  return {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, // Optional
    REDIS_URL: process.env.REDIS_URL, // Optional
  };
}

export const env = validateEnv();
