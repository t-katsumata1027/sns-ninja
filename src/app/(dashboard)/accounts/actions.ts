"use server";

import { db } from "@/db";
import { accounts } from "@/db/schema";
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
