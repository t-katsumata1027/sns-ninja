"use server";

import { performMarketResearch, suggestGenres, analyzeMarket, getTrendingKeywords } from "@/lib/ai/research";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { concepts, trendCache } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { ensureTenant } from "@/lib/db/tenant";
import { eq } from "drizzle-orm";

const TREND_CACHE_ID = "trending_keywords";
const FRESH_TTL_MS = 1 * 60 * 60 * 1000; // 1 hour is "fresh"
const STALE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours is "stale but usable"

export async function getTrendingKeywordsAction() {
  try {
    // 1. Try to get from database cache
    const cached = await db.query.trendCache.findFirst({
      where: eq(trendCache.id, TREND_CACHE_ID),
    });

    const now = new Date().getTime();
    
    // 2. If valid and FRESH cache exists, return it instantly
    if (cached && (now - cached.updatedAt.getTime() < FRESH_TTL_MS)) {
      console.log("Returning fresh cached trending keywords");
      return { 
        success: true, 
        data: cached.data as any, 
        updatedAt: cached.updatedAt.toISOString() 
      };
    }

    // 3. If cache is STALE but usable, or missing
    if (cached) {
      console.log("Cache is stale, returning it but triggering background refresh...");
      // In a real production environment with Vercel, we'd use waitUntil(refreshCache())
      // Here we will try to fetch AI now but with a shorter path if it's the very first time.
      // If we already have cached data, we return it to UNBLOCK the user.
      
      // Kick off background refresh (don't await)
      refreshCache().catch(err => console.error("Background refresh failed:", err));
      
      return { 
        success: true, 
        data: cached.data as any, 
        updatedAt: cached.updatedAt.toISOString(),
        isStale: true 
      };
    }

    // 4. ABSOLUTE FALLBACK (If no cache at all)
    console.log("No cache found. Fetching initial data...");
    try {
      const keywords = await getTrendingKeywords();
      await updateCache(keywords);
      return { success: true, data: keywords, updatedAt: new Date().toISOString() };
    } catch (aiError) {
      console.error("AI Fetch Error for Initial Trends:", aiError);
      const fallbacks = [
        { keyword: "AI時短術", category: "テック", trendScore: 98, description: "話題のAIツール活用法" },
        { keyword: "QoL向上家電", category: "ライフスタイル", trendScore: 92, description: "生活を豊かにするガジェット" },
        { keyword: "新NISA投資法", category: "マネー", trendScore: 95, description: "最新の資産形成トレンド" },
        { keyword: "韓国美容トレンド", category: "美容", trendScore: 89, description: "最新のスキンケア・メイク" }
      ];
      return { success: true, data: fallbacks, updatedAt: new Date().toISOString(), isFallback: true };
    }
  } catch (error: any) {
    console.error("Trending Keywords Error:", error);
    return { success: false, error: error.message };
  }
}

// Helper to refresh cache in background
async function refreshCache() {
  const keywords = await getTrendingKeywords();
  await updateCache(keywords);
}

// Helper to update DB
async function updateCache(keywords: any) {
  await db.insert(trendCache).values({
    id: TREND_CACHE_ID,
    data: keywords,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: trendCache.id,
    set: {
      data: keywords,
      updatedAt: new Date(),
    },
  });
}

export async function getGenreSuggestionsAction(keyword: string) {
  try {
    const suggestions = await suggestGenres(keyword);
    return { success: true, data: suggestions };
  } catch (error: any) {
    console.error("Genre Suggestion Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMarketAnalysisAction(genre: string, platform: string) {
  try {
    const analysis = await analyzeMarket(genre, platform);
    return { success: true, data: analysis };
  } catch (error: any) {
    console.error("Market Analysis Error:", error);
    return { success: false, error: error.message };
  }
}

export async function runResearchAction(formData: FormData) {
  const genre = formData.get("genre") as string;
  const platform = formData.get("platform") as "x" | "instagram";

  if (!genre) throw new Error("ジャンルを入力してください");

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Ensure tenant exists in DB for foreign key constraints
    await ensureTenant(user.id, user.email);

    const result = await performMarketResearch(genre, platform);

    // Save to database
    const [inserted] = await db.insert(concepts).values({
      tenantId: user.id,
      platform,
      genre,
      accountName: result.concept.name,
      bio: result.concept.bio,
      targetAudience: result.strategy.targetAudience,
      hashtags: result.strategy.hashtags,
      contentMix: result.strategy.contentMix,
    }).returning({ id: concepts.id });

    const enhancedResult = { ...result, dbId: inserted.id };

    revalidatePath("/(dashboard)", "layout");
    
    return { success: true, data: enhancedResult };
  } catch (error: any) {
    console.error("Research Action Error:", error);
    return { success: false, error: error.message };
  }
}
