"use client";

import { useState, useTransition, useActionState } from "react";
import { updateConcept, suggestHashtagsAction, type ActionResponse } from "@/app/(dashboard)/settings/product-growth/actions";

interface Concept {
  id: string;
  accountName: string;
  genre: string;
  bio: string;
  productUrl: string | null;
  useHashtags: boolean | null;
  suggestedHashtags: any;
  footerText: string | null;
  personality: string | null;
}

export function ProductGrowthForm({ initialConcept }: { initialConcept: Concept }) {
  const [concept, setConcept] = useState<Concept>(initialConcept);
  const [isPending, startTransition] = useTransition();
  const [suggesting, setSuggesting] = useState(false);
  
  // React 19 useActionState for form submission
  const [state, formAction] = useActionState<ActionResponse, FormData>(
    async (prevState: ActionResponse, formData: FormData) => {
      // Convert formData to the expected structure
      const data = {
        accountName: formData.get("accountName") as string,
        genre: formData.get("genre") as string,
        productUrl: formData.get("productUrl") as string,
        bio: formData.get("bio") as string,
        personality: formData.get("personality") as string,
        footerText: formData.get("footerText") as string,
        useHashtags: concept.useHashtags,
        suggestedHashtags: concept.suggestedHashtags,
      };
      return await updateConcept(concept.id, data);
    },
    { success: false }
  );

  const handleSuggestHashtags = async () => {
    setSuggesting(true);
    try {
      const result = await suggestHashtagsAction(concept.genre, concept.bio);
      if (result.success && result.hashtags) {
        setConcept({ ...concept, suggestedHashtags: result.hashtags });
      } else {
        alert(result.error || "提案に失敗しました");
      }
    } catch (err) {
      console.error("Hashtag suggestion failed", err);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-4 rounded-xl text-sm border bg-red-500/10 border-red-500/30 text-red-400">
          {state.error}
        </div>
      )}
      {state.message && (
        <div className="p-4 rounded-xl text-sm border bg-green-500/10 border-green-500/30 text-green-400">
          {state.message}
        </div>
      )}

      {/* Basic Info */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">🚀 基本設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-500 font-medium">プロダクト名</label>
            <input
              type="text"
              name="accountName"
              value={concept.accountName}
              onChange={(e) => setConcept({ ...concept, accountName: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-500 font-medium">ジャンル</label>
            <input
              type="text"
              name="genre"
              value={concept.genre}
              onChange={(e) => setConcept({ ...concept, genre: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500 font-medium">プロダクトURL</label>
          <input
            type="text"
            name="productUrl"
            placeholder="https://..."
            value={concept.productUrl || ""}
            onChange={(e) => setConcept({ ...concept, productUrl: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500 font-medium">プロダクト概要 (Bio)</label>
          <textarea
            rows={3}
            name="bio"
            value={concept.bio}
            onChange={(e) => setConcept({ ...concept, bio: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors resize-none"
          />
        </div>
      </section>

      {/* Customization */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">🎨 投稿のカスタマイズ</h3>

        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500 font-medium">性格・ニュアンス設定</label>
          <input
            type="text"
            name="personality"
            placeholder="例: 親しみやすい、専門的、情熱的、カジュアルなど"
            value={concept.personality || ""}
            onChange={(e) => setConcept({ ...concept, personality: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors"
          />
          <p className="text-[10px] text-neutral-600 italic">※AIがこのトーンに合わせて文章を生成します</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500 font-medium">文末フッター (毎回表示)</label>
          <textarea
            rows={2}
            name="footerText"
            placeholder="例: ぜひサイトをチェックしてください！"
            value={concept.footerText || ""}
            onChange={(e) => setConcept({ ...concept, footerText: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors resize-none"
          />
        </div>
      </section>

      {/* Hashtags */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">#️⃣ ハッシュタグ設定</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">ハッシュタグを付与する</span>
            <button
              type="button"
              onClick={() => setConcept({ ...concept, useHashtags: !concept.useHashtags })}
              className={`w-10 h-5 rounded-full transition-colors relative ${concept.useHashtags ? "bg-blue-600" : "bg-neutral-700"}`}
            >
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${concept.useHashtags ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </div>

        {concept.useHashtags && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs text-neutral-500 font-medium">ハッシュタグ候補</label>
              <button
                type="button"
                onClick={handleSuggestHashtags}
                disabled={suggesting}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {suggesting ? "提案中..." : "✨ AIに提案させる"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-xl min-h-[60px]">
              {(concept.suggestedHashtags || []).length > 0 ? (
                concept.suggestedHashtags?.map((tag: string, idx: number) => (
                  <span key={idx} className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-neutral-600 text-[10px] italic">ハッシュタグが設定されていません。</span>
              )}
            </div>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
      >
        {isPending ? "保存中..." : "設定を保存する"}
      </button>
    </form>
  );
}
