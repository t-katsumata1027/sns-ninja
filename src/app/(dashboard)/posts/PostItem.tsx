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

  const getStatusBadge = () => {
    switch (post.status) {
      case "published":
        return <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Published</span>;
      case "failed":
        return <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Failed</span>;
      case "approved":
        return <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Approved / Queued</span>;
      default:
        return <span className="bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pending</span>;
    }
  };

  return (
    <div className={`bg-neutral-900 border border-amber-500/20 rounded-2xl p-5 transition-all ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex justify-between items-start mb-4">
        {getStatusBadge()}
        <span className="text-[10px] text-neutral-500 font-mono">
          {new Date(post.createdAt).toLocaleString("ja-JP")}
        </span>
      </div>
      
      <p className="text-sm text-white whitespace-pre-wrap leading-relaxed mb-6">
        {post.content}
      </p>

      {post.status !== "published" && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="rounded-lg bg-green-600 hover:bg-green-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            {isPending ? "処理中..." : post.status === "failed" ? "🔄 再試行" : "✅ 承認"}
          </button>
          
          {(post.status === "pending_approval" || post.status === "failed") && (
            <button
              onClick={handleReject}
              disabled={isPending}
              className="rounded-lg bg-neutral-800 hover:bg-neutral-700 px-4 py-1.5 text-xs font-semibold text-neutral-400 transition-colors disabled:opacity-50"
            >
              {isPending ? "処理中..." : "❌ 却下"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
