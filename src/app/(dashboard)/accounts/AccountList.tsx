"use client";

import { useState } from "react";
import { EngagementRuleModal } from "./EngagementRuleModal";

interface Account {
  id: string;
  platform: string;
  username: string;
  isActive: boolean;
  conceptId: string | null;
  warmingUpStage: string | null;
  accountType: string;
  enableAutoPost: boolean;
  enableImageGeneration: boolean;
}

interface EngagementRule {
  id: string;
  accountId: string;
  targetKeywords: any;
  competitorAccounts: any;
}

interface Concept {
  id: string;
  name: string;
  genre: string;
}

interface AccountListProps {
  accounts: Account[];
  concepts: Concept[];
  todayActionsData: { accountId: string; count: number }[];
  engagementRules: EngagementRule[];
  dailyLimit: number;
}

export function AccountList({
  accounts,
  concepts,
  todayActionsData,
  engagementRules,
  dailyLimit,
}: AccountListProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => {
          const linkedConcept = concepts.find((c) => c.id === acc.conceptId);
          const currentRule = engagementRules.find((r) => r.accountId === acc.id);
          
          return (
            <div
              key={acc.id}
              className="group bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/50 transition-colors relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {acc.platform === "x" ? "𝕏" : "📸"}
                  </span>
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      {acc.username}
                      {acc.accountType === "affiliate" ? (
                        <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/30">
                          🎯 アフィリエイト
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30">
                          📈 アカウント育成
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500 capitalize">
                      {acc.platform}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    acc.isActive
                      ? "text-green-400 border-green-500/30 bg-green-500/10"
                      : "text-red-400 border-red-500/30 bg-red-500/10"
                  }`}
                >
                  {acc.isActive ? "連携中" : "無効"}
                </span>
              </div>

              {acc.isActive && (
                <div className="mb-4">
                  {(() => {
                    const currentActions =
                      todayActionsData.find((t) => t.accountId === acc.id)
                        ?.count || 0;
                    const usagePercent = Math.min(
                      Math.round((currentActions / dailyLimit) * 100),
                      100
                    );
                    const isWarning = usagePercent > 80;
                    return (
                      <>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-neutral-500">
                            本日アクション消化率
                          </span>
                          <span
                            className={
                              isWarning ? "text-amber-400" : "text-neutral-400"
                            }
                          >
                            {currentActions} / {dailyLimit} ({usagePercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              isWarning ? "bg-amber-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-2 mt-auto mb-4">
                <div className="flex justify-between text-xs p-2 bg-neutral-900 rounded-lg">
                  <span className="text-neutral-500">紐付けコンセプト:</span>
                  <span className="font-semibold text-blue-400">
                    {linkedConcept ? linkedConcept.name : "未設定"}
                  </span>
                </div>
                <div className="flex justify-between text-xs p-2 bg-neutral-900 rounded-lg">
                  <span className="text-neutral-500">機能:</span>
                  <div className="flex gap-2">
                    <span
                      className={`${
                        acc.enableAutoPost ? "text-white" : "text-neutral-600"
                      }`}
                    >
                      📝 自動投稿
                    </span>
                    <span
                      className={`${
                        acc.enableImageGeneration
                          ? "text-white"
                          : "text-neutral-600"
                      }`}
                    >
                      🖼️ 画像生成
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAccount(acc)}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white"
              >
                🎯 ターゲット設定を{currentRule ? "変更" : "作成"}
              </button>
            </div>
          );
        })}
      </div>

      {selectedAccount && (
        <EngagementRuleModal
          accountId={selectedAccount.id}
          accountName={selectedAccount.username}
          initialKeywords={(engagementRules.find(r => r.accountId === selectedAccount.id)?.targetKeywords as string[]) || []}
          initialCompetitors={(engagementRules.find(r => r.accountId === selectedAccount.id)?.competitorAccounts as string[]) || []}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </>
  );
}
