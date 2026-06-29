import { Router, Response } from "express";
import { checkJwt, AuthRequest } from "../middleware/auth";
import { loadUserRoles, requireRole } from "../middleware/roles";
import { pool } from "../db/pool";

const router = Router();
const auth = [checkJwt, loadUserRoles, requireRole("BUYER", "ADMIN")];

// GET /orders — list user orders
router.get("/orders", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.status, o.total_amount, o.shipping_cost, o.created_at, o.updated_at,
              COUNT(oi.id)::int AS items_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /orders/:id — order detail with items
router.get("/orders/:id", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const itemsResult = await pool.query(
      `SELECT oi.*, pi.url AS image_url
       FROM order_items oi
       LEFT JOIN product_images pi ON pi.product_id = oi.product_id AND pi.is_primary = TRUE
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [req.params.id]
    );

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
