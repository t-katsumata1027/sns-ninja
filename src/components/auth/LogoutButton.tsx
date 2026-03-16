"use client";

import { logout } from "@/app/(auth)/login/actions";
import { useTransition } from "react";

export function LogoutButton({ isSidebar }: { isSidebar?: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  if (isSidebar) {
    return (
      <button
        onClick={handleLogout}
        disabled={isPending}
        className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
      >
        <span>🚪</span>
        {isPending ? "Logging out..." : "Logout"}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-red-500 hover:text-red-400 active:text-red-600 transition-colors disabled:opacity-50"
    >
      <span className="text-xl">🚪</span>
      <span className="text-[10px] font-medium">{isPending ? "..." : "ログアウト"}</span>
    </button>
  );
}
