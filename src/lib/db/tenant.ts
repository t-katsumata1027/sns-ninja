import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Ensures a tenant record exists in the database for the given user ID.
 * If mapping Supabase UUIDs to Tenant IDs, this ensures the foreign key constraints hold.
 */
export async function ensureTenant(userId: string, email?: string) {
  const [existing] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, userId))
    .limit(1);

  if (!existing) {
    console.log(`Creating tenant record for user ${userId}`);
    await db.insert(tenants).values({
      id: userId,
      name: email || `User ${userId.slice(0, 8)}`,
      subscriptionPlan: "one-time",
    });
  }
}
