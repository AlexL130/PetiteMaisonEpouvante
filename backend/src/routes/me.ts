import { Router, Response } from "express";
import { checkJwt, AuthRequest } from "../middleware/auth";
import { pool } from "../db/pool";
import { writeAuditLog } from "../services/audit.service";

const router = Router();
const auth = [checkJwt];

// GET /me/profile — get current user profile
router.get("/me/profile", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at,
              ARRAY_AGG(ur.role) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /me/profile — update display name or avatar
router.patch("/me/profile", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { display_name, avatar_url } = req.body;

    const result = await pool.query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        avatar_url = COALESCE($2, avatar_url),
        updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, display_name, avatar_url`,
      [display_name || null, avatar_url || null, req.userId]
    );

    await writeAuditLog({
      userId: req.userId,
      action: "PROFILE_UPDATE",
      entityType: "user",
      entityId: req.userId,
      details: { display_name, avatar_url },
      ipAddress: String(req.ip),
    });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
