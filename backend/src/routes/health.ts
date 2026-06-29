import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, error: "database unreachable" });
  }
});

export default router;
