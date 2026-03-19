"use client";

import { useTransition } from "react";
import { approvePost, rejectPost } from "./actions";

export function PostItem({ post }: { post: any }) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      await approvePost(post.id);
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      await rejectPost(post.id);
    });
  };

  return (
    <div className={`bg-neutral-900 border border-amber-500/20 rounded-2xl p-5 transition-opacity ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <p className="text-sm text-white whitespace-pre-wrap leading-relaxed mb-4">
        {post.content}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="rounded-lg bg-green-600 hover:bg-green-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
        >
          {isPending ? "処理中..." : "✅ 承認"}
        </button>
        <button
          onClick={handleReject}
          disabled={isPending}
          className="rounded-lg bg-red-600/80 hover:bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
        >
          {isPending ? "処理中..." : "❌ 却下"}
        </button>
        <span className="text-xs text-neutral-500 ml-auto">
          {new Date(post.createdAt).toLocaleString("ja-JP")}
        </span>
      </div>
    </div>
  );
}
