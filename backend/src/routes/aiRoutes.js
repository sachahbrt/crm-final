import express from "express";
import rateLimit from "express-rate-limit";
import { chatWithAi } from "../controllers/aiControllers.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Hits a free, quota-limited third-party API — keep it from being hammered.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requêtes, réessaie dans quelques minutes." },
});

router.post("/chat", requireAuth, aiLimiter, chatWithAi);

export default router;
