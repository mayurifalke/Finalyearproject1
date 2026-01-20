// utils/svixVerify.js
import crypto from "crypto";

export function verifySvixSignature(payloadBuffer, signatureHeader, timestampHeader, secret, toleranceSecs = 300) {
  if (!secret) return false;
  if (!signatureHeader) return false;

  // Parse signature header (supports "t=..., v1=..., v1=...")
  const parts = signatureHeader.split(",").map(p => p.trim());
  const sigMap = {};
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (!k || !v) continue;
    sigMap[k] = sigMap[k] || [];
    sigMap[k].push(v);
  }

  // timestamp may be provided as header param 't' or the separate header
  const timestamp = (sigMap.t && sigMap.t[0]) || timestampHeader;
  if (!timestamp) return false;

  const now = Math.floor(Date.now() / 1000);
  const tsInt = parseInt(timestamp, 10);
  if (Number.isNaN(tsInt)) return false;
  if (Math.abs(now - tsInt) > toleranceSecs) return false;

  const signed = Buffer.concat([Buffer.from(`${timestamp}.`), payloadBuffer]);
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");

  // check v1 signatures
  const v1s = sigMap.v1 || [];
  for (const s of v1s) {
    if (crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return true;
  }

  // also check any other values
  const allSigs = Object.values(sigMap).flat();
  for (const s of allSigs) {
    if (crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return true;
  }

  return false;
}
