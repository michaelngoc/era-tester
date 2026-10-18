import { createHmac, timingSafeEqual } from "crypto";

/** Kiểm `X-Hub-Signature-256` (`sha256=<hex>`) của GitHub bằng HMAC-SHA256 trên raw body. */
export function verifyGithubSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const given = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}
