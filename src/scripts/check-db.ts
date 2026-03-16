
import { db } from "../db";
import { tenants, accounts } from "../db/schema";
import { count } from "drizzle-orm";

async function main() {
  console.log("Checking DB contents...");
  try {
    const tenantCount = await db.select({ value: count() }).from(tenants);
    console.log("Tenant Count:", tenantCount[0].value);

    const allTenants = await db.select().from(tenants);
    console.log("Tenants:", JSON.stringify(allTenants, null, 2));

    const accountCount = await db.select({ value: count() }).from(accounts);
    console.log("Social Account Count:", accountCount[0].value);
  } catch (err) {
    console.error("Error checking DB:", err);
  }
}

main();
