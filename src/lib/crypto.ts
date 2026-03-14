/**
 * AES-256-GCM encryption/decryption utility for sensitive data (API tokens, etc.)
 * Uses the Web Crypto API (available in Node.js 19+ and all modern browsers)
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY env variable must be at least 32 characters long.");
  }
  return key.slice(0, 32);
}

async function importKey(rawKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(rawKey),
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string and returns a Base64-encoded "iv:ciphertext" string.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey(getEncryptionKey());
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );
  const ivBase64 = Buffer.from(iv).toString("base64");
  const ciphertextBase64 = Buffer.from(ciphertext).toString("base64");
  return `${ivBase64}:${ciphertextBase64}`;
}

/**
 * Decrypts a Base64-encoded "iv:ciphertext" string back to plaintext.
 */
export async function decrypt(encrypted: string): Promise<string> {
  const [ivBase64, ciphertextBase64] = encrypted.split(":");
  const key = await importKey(getEncryptionKey());
  const iv = Buffer.from(ivBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
