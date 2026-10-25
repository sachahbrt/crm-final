import express from "express";
import { getStatsByCategory } from "../controllers/statsControllers.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, getStatsByCategory);

export default router;
