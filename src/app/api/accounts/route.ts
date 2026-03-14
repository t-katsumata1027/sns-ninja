import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { encrypt } from "@/lib/crypto";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/accounts - list accounts for the current tenant
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: accounts.id,
      platform: accounts.platform,
      username: accounts.username,
      isActive: accounts.isActive,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.tenantId, user.id));

  return NextResponse.json({ accounts: rows });
}

// POST /api/accounts - add a new SNS account
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { platform, username, token, proxyConfig, stealthFingerprint } = body;

  if (!platform || !username) {
    return NextResponse.json({ error: "platform and username are required" }, { status: 400 });
  }

  // Encrypt the SNS token before storing
  const encryptedToken = token ? await encrypt(token) : null;

  const [newAccount] = await db.insert(accounts).values({
    tenantId: user.id,  // user.id serves as tenant_id (1-to-1)
    platform,
    username,
    encryptedToken,
    proxyConfig: proxyConfig ?? null,
    stealthFingerprint: stealthFingerprint ?? null,
    isActive: true,
  }).returning();

  return NextResponse.json({ account: newAccount }, { status: 201 });
}
