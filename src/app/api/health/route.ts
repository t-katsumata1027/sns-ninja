import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { env } from "@/lib/env";

export async function GET() {
  const status: Record<string, any> = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    checks: {},
  };

  try {
    // 1. Database connection check
    await db.execute(sql`SELECT 1`);
    status.checks.database = "UP";
  } catch (err) {
    status.checks.database = "DOWN";
    console.error("❌ Healthcheck: Database connection failed", err);
  }

  try {
    // 2. Redis connection check
    const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
    await redis.ping();
    status.checks.redis = "UP";
    await redis.quit();
  } catch (err) {
    status.checks.redis = "DOWN";
    console.error("❌ Healthcheck: Redis connection failed", err);
  }

  const isHealthy = Object.values(status.checks).every((s) => s === "UP");

  return NextResponse.json(status, {
    status: isHealthy ? 200 : 503,
  });
}
