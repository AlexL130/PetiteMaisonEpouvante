import { Router, Response } from "express";
import { checkJwt, AuthRequest } from "../middleware/auth";
import { loadUserRoles, requireRole } from "../middleware/roles";
import { pool } from "../db/pool";
import { writeAuditLog } from "../services/audit.service";

const router = Router();
const adminAuth = [checkJwt, loadUserRoles, requireRole("ADMIN")];

// ============================================================
// USERS MANAGEMENT
// ============================================================
router.get("/admin/users", ...adminAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.is_active, u.created_at,
              ARRAY_AGG(ur.role) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /admin/users/:id/role — add role to user
router.post("/admin/users/:id/role", ...adminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!["BUYER", "SELLER", "ADMIN"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    await pool.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
       ON CONFLICT (user_id, role) DO NOTHING`,
      [req.params.id, role]
    );

    await writeAuditLog({
      userId: req.userId,
      action: "ROLE_GRANTED",
      entityType: "user",
      entityId: parseInt(String(req.params.id)),
      details: { role },
      ipAddress: String(req.ip),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// PRODUCTS MANAGEMENT
// ============================================================
router.post("/admin/products", ...adminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { category_id, title, slug, description, short_desc, price, stock_quantity, status, is_featured, is_exclusive, attributes } = req.body;

    const result = await pool.query(
      `INSERT INTO products (category_id, title, slug, description, short_desc, price, stock_quantity, status, is_featured, is_exclusive, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [category_id, title, slug, description, short_desc, price, stock_quantity || 0, status || "DRAFT", is_featured || false, is_exclusive || false, JSON.stringify(attributes || {})]
    );

    await writeAuditLog({
      userId: req.userId,
      action: "PRODUCT_CREATED",
      entityType: "product",
      entityId: result.rows[0].id,
      details: { title, price },
      ipAddress: req.ip,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/admin/products/:id", ...adminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const fields = ["title", "description", "short_desc", "price", "stock_quantity", "status", "is_featured", "is_exclusive"];
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE products SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// ORDERS MANAGEMENT
// ============================================================
router.get("/admin/orders", ...adminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const conditions = [];
    const params: unknown[] = [];

    if (status) {
      conditions.push(`o.status = $${params.length + 1}`);
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT o.*, u.email, u.display_name,
              COUNT(oi.id)::int AS items_count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id, u.email, u.display_name
       ORDER BY o.created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/admin/orders/:id/status", ...adminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await writeAuditLog({
      userId: req.userId,
      action: "ORDER_STATUS_CHANGED",
      entityType: "order",
      entityId: parseInt(String(req.params.id)),
      details: { new_status: status },
      ipAddress: String(req.ip),
    });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// AUDIT LOGS (observability)
// ============================================================
router.get("/admin/audit-logs", ...adminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { action, limit = "50", offset = "0" } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (action) {
      conditions.push(`al.action = $${params.length + 1}`);
      params.push(action);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT al.*, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), Number(offset)]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
