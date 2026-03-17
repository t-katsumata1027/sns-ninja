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
  console.log("getTrendingKeywordsAction started");
  try {
    const cached = await db.query.trendCache.findFirst({
      where: eq(trendCache.id, TREND_CACHE_ID),
    });

    const now = new Date().getTime();
    console.log("Cache check:", { exists: !!cached, updatedAt: cached?.updatedAt });
    
    if (cached && (now - cached.updatedAt.getTime() < FRESH_TTL_MS)) {
      const data = cached.data as any[];
      if (Array.isArray(data) && data.length > 0) {
        console.log("Returning fresh cached trends:", data.length, "items");
        return { success: true, data, updatedAt: cached.updatedAt.toISOString() };
      }
      console.log("Cache exists but data is invalid or empty array");
    }

    if (cached) {
      const data = cached.data as any[];
      if (Array.isArray(data) && data.length > 0) {
        console.log("Cache is stale, returning and refreshing in background...");
        refreshCache().catch(err => console.error("Background refresh failed:", err));
        return { success: true, data, updatedAt: cached.updatedAt.toISOString(), isStale: true };
      }
    }

    console.log("Fetching new trending keywords from AI...");
    try {
      const keywords = await getTrendingKeywords();
      console.log("AI returned keywords:", Array.isArray(keywords) ? keywords.length : "Not an array");
      await updateCache(keywords);
      return { success: true, data: keywords, updatedAt: new Date().toISOString() };
    } catch (aiError) {
      console.error("AI Fetch Error for Trends:", aiError);
      const fallbacks = [
        { keyword: "AI時短術", category: "テック", trendScore: 98, description: "話題のAIツール活用法" },
        { keyword: "QoL向上家電", category: "ライフスタイル", trendScore: 92, description: "生活を豊かにするガジェット" },
        { keyword: "新NISA投資法", category: "マネー", trendScore: 95, description: "最新の資産形成トレンド" },
        { keyword: "韓国美容トレンド", category: "美容", trendScore: 89, description: "最新のスキンケア・メイク" }
      ];
      return { success: true, data: fallbacks, updatedAt: new Date().toISOString(), isFallback: true };
    }
  } catch (error: any) {
    console.error("Trending Keywords Top Level Error:", error);
    return { success: false, error: error.message };
  }
}

// ... helper updates with logs ...
async function updateCache(keywords: any) {
  console.log("Updating trend_cache in DB...");
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

export async function runResearchAction(formData: FormData) {
  const genre = formData.get("genre") as string;
  const platform = formData.get("platform") as "x" | "instagram";
  console.log("runResearchAction started:", { genre, platform });

  if (!genre) throw new Error("ジャンルを入力してください");

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    console.log("User identified:", user.id);

    await ensureTenant(user.id, user.email);

    console.log("Calling performMarketResearch...");
    const result = await performMarketResearch(genre, platform);
    console.log("Research AI result received:", !!result.concept);

    if (!result.concept || !result.concept.name) {
      console.error("Critical AI Structure Failure:", result);
      throw new Error("AIの設計図生成が不完全です（名前が見つかりません）。もう一度お試しください。");
    }

    console.log("Inserting concept into DB...");
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
    console.log("Research Action successful:", inserted.id);
    
    return { success: true, data: enhancedResult };
  } catch (error: any) {
    console.error("Research Action Final Error:", error);
    return { success: false, error: error.message };
  }
}

async function refreshCache() {
  console.log("refreshCache: Triggering background AI fetch...");
  try {
    const keywords = await getTrendingKeywords();
    await updateCache(keywords);
    console.log("refreshCache: Background update successful");
  } catch (err) {
    console.error("refreshCache: Background update failed:", err);
  }
}

export async function getGenreSuggestionsAction(keyword: string) {
  console.log("getGenreSuggestionsAction started:", keyword);
  try {
    const suggestions = await suggestGenres(keyword);
    console.log("Genre suggestions success:", suggestions.length);
    return { success: true, data: suggestions };
  } catch (error: any) {
    console.error("Genre Suggestion Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMarketAnalysisAction(genre: string, platform: string) {
  console.log("getMarketAnalysisAction started:", { genre, platform });
  try {
    const analysis = await analyzeMarket(genre, platform);
    console.log("Market analysis success");
    return { success: true, data: analysis };
  } catch (error: any) {
    console.error("Market Analysis Error:", error);
    return { success: false, error: error.message };
  }
}
