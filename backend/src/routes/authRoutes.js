import express from "express";
import rateLimit from "express-rate-limit";
import {
  connectUser,
  disconnectUser,
  createUser,
  requestAccountDeletion,
  deleteUser,
  forgotPassword,
  resetPassword,
  getMe,
  exportMyData,
  updateProfile,
  changePassword,
  requestEmailChange,
  confirmEmailChange,
  verifyTwoFactor,
  updateTwoFactor,
} from "../controllers/authControllers.js";
import { googleLogin, googleAuthCallback, googleCallback } from "../controllers/googleControllers.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requêtes, réessaie dans quelques minutes." },
});

// Reached by a full browser navigation (the "Se connecter avec Google"
// button links straight here), not a fetch/XHR call — so on limit, redirect
// to a frontend page instead of letting the browser render the raw JSON
// response from a rate limiter with the default handler.
const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.redirect(`${process.env.FRONTEND_URL}/trop-de-requetes`),
});

router.post("/register", authLimiter, createUser);
router.post("/login", authLimiter, connectUser);
router.post("/login/verify-2fa", authLimiter, verifyTwoFactor);
router.post("/logout", disconnectUser);
router.get("/google", googleAuthLimiter, googleLogin);
router.get("/google/callback", googleAuthLimiter, googleAuthCallback, googleCallback);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateProfile);
router.put("/me/password", requireAuth, changePassword);
router.put("/me/2fa", requireAuth, updateTwoFactor);
router.post("/me/email", requireAuth, requestEmailChange);
router.post("/confirm-email/:token", confirmEmailChange);
router.get("/me/export", requireAuth, exportMyData);
router.post("/me/delete/request", requireAuth, authLimiter, requestAccountDeletion);
router.delete("/me", requireAuth, deleteUser);

export default router;
