import { db } from "@/db";
import { accounts, concepts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { AccountForm } from "./AccountForm";
import { redirect } from "next/navigation";

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch data in parallel
  const [userAccounts, userConcepts] = await Promise.all([
    db.select({
      id: accounts.id,
      platform: accounts.platform,
      username: accounts.username,
      isActive: accounts.isActive,
      conceptId: accounts.conceptId,
      warmingUpStage: accounts.warmingUpStage,
    }).from(accounts).where(eq(accounts.tenantId, user.id)),
    db.select({
      id: concepts.id,
      genre: concepts.genre,
      name: concepts.accountName,
    }).from(concepts).where(eq(concepts.tenantId, user.id))
  ]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userAccounts.map(acc => {
              const linkedConcept = userConcepts.find(c => c.id === acc.conceptId);
              return (
                <div key={acc.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <span className="text-2xl">{acc.platform === "x" ? "𝕏" : "📸"}</span>
                       <div>
                         <p className="font-bold">{acc.username}</p>
                         <p className="text-xs text-neutral-500 capitalize">{acc.platform}</p>
                       </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${acc.isActive ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
                      {acc.isActive ? "連携中" : "無効"}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mt-auto">
                    <div className="flex justify-between text-xs p-2 bg-neutral-900 rounded-lg">
                       <span className="text-neutral-500">紐付けコンセプト:</span>
                       <span className="font-semibold text-blue-400">{linkedConcept ? linkedConcept.name : "未設定"}</span>
                    </div>
                    <div className="flex justify-between text-xs p-2 bg-neutral-900 rounded-lg">
                       <span className="text-neutral-500">ウォーミングアップ:</span>
                       <span className="font-semibold text-amber-400">フェーズ {acc.warmingUpStage}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
