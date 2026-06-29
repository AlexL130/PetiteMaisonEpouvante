import { Router, Request, Response } from "express";
import { checkJwt, AuthRequest } from "../middleware/auth";
import { loadUserRoles, requireRole } from "../middleware/roles";
import { pool } from "../db/pool";
import { writeAuditLog } from "../services/audit.service";
import { logger } from "../config/logger";

const router = Router();
const auth = [checkJwt, loadUserRoles, requireRole("BUYER", "ADMIN")];

// ============================================================
// PUBLIC — list fanzine issues
// ============================================================
router.get("/fanzine/issues", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, issue_number, title, description, cover_url, page_count,
              published_at, is_free_preview
       FROM fanzine_issues
       ORDER BY issue_number DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /fanzine/issues/:id — issue detail (public metadata, PDF only if authorized)
router.get("/fanzine/issues/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, issue_number, title, description, cover_url, page_count,
              published_at, is_free_preview
       FROM fanzine_issues WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// PROTECTED — read issue (returns PDF URL if authorized)
// ============================================================
router.get("/fanzine/read/:id", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const issueId = parseInt(String(req.params.id), 10);

    // Check if free preview
    const issue = await pool.query(
      "SELECT id, title, pdf_url, is_free_preview FROM fanzine_issues WHERE id = $1",
      [issueId]
    );

    if (issue.rows.length === 0) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    if (issue.rows[0].is_free_preview) {
      res.json({ pdf_url: issue.rows[0].pdf_url, access: "free_preview" });
      return;
    }

    // Check active subscription (DIGITAL or BOTH)
    const subscription = await pool.query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'ACTIVE'
         AND type IN ('DIGITAL', 'BOTH')
         AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
       LIMIT 1`,
      [req.userId]
    );

    if (subscription.rows.length > 0) {
      res.json({ pdf_url: issue.rows[0].pdf_url, access: "subscription" });
      return;
    }

    // Check individual purchase
    const access = await pool.query(
      "SELECT id FROM user_fanzine_access WHERE user_id = $1 AND issue_id = $2",
      [req.userId, issueId]
    );

    if (access.rows.length > 0) {
      res.json({ pdf_url: issue.rows[0].pdf_url, access: "purchase" });
      return;
    }

    res.status(403).json({ error: "No access to this issue — subscribe or purchase it" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// SUBSCRIPTIONS
// ============================================================

// GET /subscriptions/me — current user subscriptions
router.get("/subscriptions/me", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, type, status, start_date, end_date, auto_renew, price_paid, created_at
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /subscriptions — create subscription
router.post("/subscriptions", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.body; // PAPER, DIGITAL, BOTH

    if (!["PAPER", "DIGITAL", "BOTH"].includes(type)) {
      res.status(400).json({ error: "type must be PAPER, DIGITAL or BOTH" });
      return;
    }

    // Check no active subscription of same type
    const existing = await pool.query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'ACTIVE' AND type = $2`,
      [req.userId, type]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Active subscription already exists" });
      return;
    }

    // Pricing
    const prices: Record<string, number> = { PAPER: 29.99, DIGITAL: 19.99, BOTH: 39.99 };
    const pricePaid = prices[type];

    // 1 year subscription
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, type, start_date, end_date, price_paid)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $3)
       RETURNING *`,
      [req.userId, type, pricePaid]
    );

    // Grant access to all published issues if DIGITAL or BOTH
    if (type === "DIGITAL" || type === "BOTH") {
      await pool.query(
        `INSERT INTO user_fanzine_access (user_id, issue_id, source)
         SELECT $1, id, 'SUBSCRIPTION' FROM fanzine_issues
         ON CONFLICT (user_id, issue_id) DO NOTHING`,
        [req.userId]
      );
    }

    await writeAuditLog({
      userId: req.userId,
      action: "SUBSCRIPTION_CREATED",
      entityType: "subscription",
      entityId: result.rows[0].id,
      details: { type, price_paid: pricePaid },
      ipAddress: req.ip,
    });

    logger.info("Subscription created", { userId: req.userId, type, price: pricePaid });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /subscriptions/:id — cancel subscription
router.delete("/subscriptions/:id", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE subscriptions SET status = 'CANCELLED', auto_renew = FALSE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'
       RETURNING id, status`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Active subscription not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /fanzine/library — user's accessible issues
router.get("/fanzine/library", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT fi.id, fi.issue_number, fi.title, fi.description, fi.cover_url,
              fi.page_count, fi.published_at, ufa.source, ufa.granted_at
       FROM user_fanzine_access ufa
       JOIN fanzine_issues fi ON fi.id = ufa.issue_id
       WHERE ufa.user_id = $1
       ORDER BY fi.issue_number DESC`,
      [req.userId]
    );

    // Also include free preview issues
    const freeResult = await pool.query(
      `SELECT id, issue_number, title, description, cover_url, page_count, published_at
       FROM fanzine_issues WHERE is_free_preview = TRUE`
    );

    res.json({
      owned: result.rows,
      free_previews: freeResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
