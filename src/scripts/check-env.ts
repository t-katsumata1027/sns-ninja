
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const host = process.env.REDIS_HOST;

console.log("Checking REDIS_HOST environment variable...");
if (host) {
  console.log(`Value: "${host}"`);
  console.log(`Length: ${host.length}`);
  if (host.endsWith(".i") && !host.endsWith(".io")) {
    console.log(">>> WARNING: Hostname appears to be truncated (ends with .i instead of .io)");
  }
} else {
  console.log(">>> ERROR: REDIS_HOST is not set.");
}
