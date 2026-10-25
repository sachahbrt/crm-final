import passport from "passport";
import { signToken } from "../utils/token.js";

export const googleLogin = passport.authenticate("google", { scope: ["profile", "email"], session: false });

export function googleAuthCallback(req, res, next) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  passport.authenticate("google", { session: false, failureRedirect: `${frontendUrl}/login?error=google` })(
    req,
    res,
    next
  );
}

export async function googleCallback(req, res) {
  const token = signToken(req.user._id);
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  res.redirect(`${frontendUrl}/oauth-callback?token=${token}`);
}
