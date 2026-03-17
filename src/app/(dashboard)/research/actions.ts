"use server";

import { performMarketResearch } from "@/lib/ai/research";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { concepts } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { ensureTenant } from "@/lib/db/tenant";

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

    // Optional: add the concept ID to the returned data so UI can link it
    const enhancedResult = { ...result, dbId: inserted.id };

    revalidatePath("/(dashboard)", "layout"); // Revalidate dashboard to update checklist
    
    return { success: true, data: enhancedResult };
  } catch (error: any) {
    console.error("Research Action Error:", error);
    return { success: false, error: error.message };
  }
}
