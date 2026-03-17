import { db } from "@/db";
import { concepts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProductGrowthForm } from "@/components/dashboard/ProductGrowthForm";

export default async function ProductGrowthSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the primary concept for the user
  const [concept] = await db
    .select()
    .from(concepts)
    .where(eq(concepts.tenantId, user.id))
    .limit(1);

  if (!concept) {
    // If no concept exists, create a default one for the user to edit
    const [newConcept] = await db.insert(concepts).values({
      tenantId: user.id,
      platform: "x",
      genre: "General Product",
      accountName: "My Product",
      bio: "Product description goes here.",
    }).returning();
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">⚙️ Product Growth Settings</h2>
          <p className="text-neutral-400 mt-1 text-sm">自社プロダクトのグロース戦略と投稿スタイルの設定</p>
        </div>
        <ProductGrowthForm initialConcept={newConcept} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">⚙️ Product Growth Settings</h2>
        <p className="text-neutral-400 mt-1 text-sm">自社プロダクトのグロース戦略と投稿スタイルの設定</p>
      </div>
      <ProductGrowthForm initialConcept={concept} />
    </div>
  );
}
