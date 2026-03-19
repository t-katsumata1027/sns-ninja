"use server";

import { db } from "@/db";
import { concepts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type ActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function updateConcept(conceptId: string, data: Partial<typeof concepts.$inferInsert>): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "認証が必要です" };

  try {
    // RLS will handle the check naturally via user.id if configured, 
    // but we can also add an explicit check here if tenant_id is used.
    await db.update(concepts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(concepts.id, conceptId));

    revalidatePath("/(dashboard)/settings/product-growth");
    return { success: true, message: "設定を保存しました" };
  } catch (error: any) {
    console.error("Failed to update concept:", error);
    return { success: false, error: "保存に失敗しました" };
  }
}

import { suggestHashtags as suggestHashtagsAI } from "@/lib/ai/gemini";

export async function suggestHashtagsAction(genre: string, bio: string): Promise<{ success: boolean; hashtags?: string[]; error?: string }> {
  try {
    const hashtags = await suggestHashtagsAI({ genre, bio });
    return { success: true, hashtags };
  } catch (error: any) {
    console.error("Hashtag suggestion action failed:", error);
    return { success: false, error: "提案に失敗しました" };
  }
}
