import jwt from "jsonwebtoken";
import crypto from "crypto";

export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// Shared by any "emailed link proves ownership" flow (password reset, email
// change confirmation): a random raw token sent by email, only its sha256
// hash stored in DB so a DB leak alone can't be used to forge valid links.
export function generateHashedToken(ttlMs = 60 * 60 * 1000) {
  const raw = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hashed, expires: Date.now() + ttlMs };
}
