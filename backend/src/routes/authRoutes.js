import express from "express";
import rateLimit from "express-rate-limit";
import {
  connectUser,
  disconnectUser,
  createUser,
  deleteUser,
  forgotPassword,
  resetPassword,
  getMe,
  exportMyData,
} from "../controllers/authControllers.js";
import { googleLogin, googleAuthCallback, googleCallback } from "../controllers/googleControllers.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post("/register", authLimiter, createUser);
router.post("/login", authLimiter, connectUser);
router.post("/logout", disconnectUser);
router.get("/google", googleLogin);
router.get("/google/callback", googleAuthCallback, googleCallback);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", requireAuth, getMe);
router.get("/me/export", requireAuth, exportMyData);
router.delete("/me", requireAuth, deleteUser);

export default router;
