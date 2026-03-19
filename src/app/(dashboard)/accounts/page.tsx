import { db } from "@/db";
import { accounts, concepts, engagementLogs, engagementRules } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { AccountForm } from "./AccountForm";
import { AccountList } from "./AccountList";
import { redirect } from "next/navigation";

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch data in parallel
  const [userAccounts, userConcepts, todayActionsData, engagementRuleRows] = await Promise.all([
    db.select({
      id: accounts.id,
      platform: accounts.platform,
      username: accounts.username,
      isActive: accounts.isActive,
      conceptId: accounts.conceptId,
      warmingUpStage: accounts.warmingUpStage,
      accountType: accounts.accountType,
      enableAutoPost: accounts.enableAutoPost,
      enableImageGeneration: accounts.enableImageGeneration,
    }).from(accounts).where(eq(accounts.tenantId, user.id)),
    db.select({
      id: concepts.id,
      genre: concepts.genre,
      name: concepts.accountName,
    }).from(concepts).where(eq(concepts.tenantId, user.id)),
    db.select({
      accountId: engagementLogs.accountId,
      count: count(),
    }).from(engagementLogs).where(sql`DATE(${engagementLogs.actedAt}) = CURRENT_DATE`).groupBy(engagementLogs.accountId),
    db.select().from(engagementRules).where(eq(engagementRules.tenantId, user.id))
  ]);

  const dailyLimit = (engagementRuleRows[0] as any)?.dailyMaxActions || 50;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold">📱 アカウント連携</h2>
        <p className="text-neutral-400 mt-1 text-sm">
           SNS連携を行い、AIに自動運用を任せましょう。市場調査で作成したコンセプトを紐付けると効率的です。
        </p>
      </div>

      <AccountForm concepts={userConcepts} />

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold mb-6">連携済みアカウント</h3>
        
        {userAccounts.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm bg-neutral-950/50 rounded-xl border border-dashed border-neutral-800">
             まだアカウントが連携されていません。上のフォームから追加してください。
          </div>
        ) : (
          <AccountList 
            accounts={userAccounts as any} 
            concepts={userConcepts} 
            todayActionsData={todayActionsData} 
            engagementRules={engagementRuleRows as any}
            dailyLimit={dailyLimit}
          />
        )}
      </div>
    </div>
  );
}
