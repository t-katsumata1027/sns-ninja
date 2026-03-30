"use server";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getPostPublishQueue } from "@/lib/queue/client";
import { accounts } from "@/db/schema";

export async function approvePost(postId: string) {
  // 1. Fetch post and account details
  const [postWithAccount] = await db
    .select({
      id: posts.id,
      content: posts.content,
      tenantId: posts.tenantId,
      accountId: posts.accountId,
      platform: accounts.platform,
    })
    .from(posts)
    .innerJoin(accounts, eq(posts.accountId, accounts.id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (!postWithAccount) {
    throw new Error("Post not found");
  }

  // 2. Update status to approved
  await db.update(posts)
    .set({ status: "approved" })
    .where(eq(posts.id, postId));
  
  // 3. Add to BullMQ queue for immediate execution (rate limits will be applied by worker)
  const queue = getPostPublishQueue();
  await queue.add(`publish-${postId}`, {
    postId: postWithAccount.id,
    accountId: postWithAccount.accountId,
    tenantId: postWithAccount.tenantId,
    content: postWithAccount.content,
    platform: postWithAccount.platform as "x" | "instagram",
  });

  revalidatePath("/posts");
  revalidatePath("/");
}

export async function rejectPost(postId: string) {
  await db.update(posts)
    .set({ status: "rejected" })
    .where(eq(posts.id, postId));
    
  revalidatePath("/posts");
}
