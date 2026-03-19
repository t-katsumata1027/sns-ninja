"use server";

import { db } from "@/db";
import { accounts, engagementRules } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureTenant } from "@/lib/db/tenant";

export async function addAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Ensure tenant exists in DB for foreign key constraints
  await ensureTenant(user.id, user.email);

  const platform = formData.get("platform") as string;
  const username = formData.get("username") as string;
  const conceptId = formData.get("conceptId") as string;
  const token = formData.get("token") as string;
  const accountType = formData.get("accountType") as string || "affiliate";
  const enableAutoPost = formData.get("enableAutoPost") === "true";
  const enableImageGeneration = formData.get("enableImageGeneration") === "true";

  if (!platform || !username) {
    return { success: false, error: "Platform and Username are required." };
  }

  try {
    const encryptedToken = token ? await encrypt(token) : null;

    await db.insert(accounts).values({
      tenantId: user.id,
      platform,
      username,
      conceptId: conceptId || null,
      accountType,
      enableAutoPost,
      enableImageGeneration,
      encryptedToken,
      isActive: true,
      warmingUpStage: "1", // Initial restrictive stage for safety
    });

    revalidatePath("/(dashboard)", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add account:", error);
    return { success: false, error: "Failed to add account." };
  }
}
export async function upsertEngagementRule(
  accountId: string,
  targetKeywords: string[],
  competitorAccounts: string[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  try {
    // Check if rule exists
    const [existing] = await db
      .select()
      .from(engagementRules)
      .where(and(eq(engagementRules.accountId, accountId), eq(engagementRules.tenantId, user.id)))
      .limit(1);

    if (existing) {
      await db
        .update(engagementRules)
        .set({
          targetKeywords,
          competitorAccounts,
          updatedAt: new Date(),
        })
        .where(eq(engagementRules.id, existing.id));
    } else {
      await db.insert(engagementRules).values({
        tenantId: user.id,
        accountId,
        targetKeywords,
        competitorAccounts,
      });
    }

    revalidatePath("/(dashboard)/accounts");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to upsert engagement rule:", error);
    return { success: false, error: "Failed to save settings." };
  }
}
