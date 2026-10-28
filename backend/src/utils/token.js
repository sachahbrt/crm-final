import jwt from "jsonwebtoken";
import crypto from "crypto";

export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// Short-lived token handed back while a 2FA code is pending — NOT a real
// session token. The `purpose` claim lets requireAuth tell the two apart so
// this can't be used to reach protected routes before the code is verified.
export function signPreAuthToken(userId) {
  return jwt.sign({ id: userId, purpose: "2fa" }, process.env.JWT_SECRET, { expiresIn: "10m" });
}

// Shared by any "emailed link proves ownership" flow (password reset, email
// change confirmation): a random raw token sent by email, only its sha256
// hash stored in DB so a DB leak alone can't be used to forge valid links.
export function generateHashedToken(ttlMs = 60 * 60 * 1000) {
  const raw = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hashed, expires: Date.now() + ttlMs };
}

// Same idea, but a short numeric code a user types in by hand instead of a
// URL token — used for the account-deletion email confirmation.
export function generateHashedCode(ttlMs = 10 * 60 * 1000) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const hashed = crypto.createHash("sha256").update(code).digest("hex");
  return { code, hashed, expires: Date.now() + ttlMs };
}
