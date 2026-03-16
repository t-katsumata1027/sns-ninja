
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;

async function confirmUser() {
  const sql = postgres(connectionString, { prepare: false });

  const email = "admin@sns-ninja.com";

  console.log(`Manually confirming email for: ${email}`);

  try {
    const result = await sql`
      UPDATE auth.users 
      SET email_confirmed_at = NOW(), 
          updated_at = NOW(),
          last_sign_in_at = NOW()
      WHERE email = ${email}
      RETURNING id, email, email_confirmed_at;
    `;

    if (result.length > 0) {
      console.log(">>> SUCCESS: User email confirmed in database.");
      console.log("User details:", result[0]);
    } else {
      console.log(">>> FAILURE: User not found in auth.users table.");
    }
  } catch (err) {
    console.error(">>> ERROR executing SQL:", err);
  } finally {
    await sql.end();
  }
}

confirmUser().catch(console.error);
