"use server";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function approvePost(postId: string) {
  await db.update(posts)
    .set({ status: "approved" })
    .where(eq(posts.id, postId));
  
  revalidatePath("/posts");
  revalidatePath("/");
}

export async function rejectPost(postId: string) {
  await db.update(posts)
    .set({ status: "rejected" })
    .where(eq(posts.id, postId));
    
  revalidatePath("/posts");
}
