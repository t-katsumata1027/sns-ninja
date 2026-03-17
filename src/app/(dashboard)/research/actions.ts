"use server";

import { performMarketResearch, suggestGenres, analyzeMarket, getTrendingKeywords } from "@/lib/ai/research";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { concepts } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { ensureTenant } from "@/lib/db/tenant";

export async function getTrendingKeywordsAction() {
  try {
    const keywords = await getTrendingKeywords();
    return { success: true, data: keywords };
  } catch (error: any) {
    console.error("Trending Keywords Error:", error);
    return { success: false, error: error.message };
  }
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
