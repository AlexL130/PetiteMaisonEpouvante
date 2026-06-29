import { Router, Response } from "express";
import { checkJwt, AuthRequest } from "../middleware/auth";
import { loadUserRoles, requireRole } from "../middleware/roles";
import { pool } from "../db/pool";
import { writeAuditLog } from "../services/audit.service";
import { logger } from "../config/logger";

const router = Router();
const auth = [checkJwt, loadUserRoles, requireRole("BUYER", "ADMIN")];

// GET /cart — list cart items
router.get("/cart", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ci.id, ci.quantity, ci.added_at,
              p.id AS product_id, p.title, p.slug, p.price, p.stock_quantity,
              pi.url AS image_url
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
       WHERE ci.user_id = $1
       ORDER BY ci.added_at DESC`,
      [req.userId]
    );

    const items = result.rows;
    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    res.json({ items, subtotal: Math.round(subtotal * 100) / 100, count: items.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /cart — add item to cart
router.post("/cart", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id || quantity < 1) {
      res.status(400).json({ error: "product_id and quantity >= 1 required" });
      return;
    }

    // Check product exists and has stock
    const product = await pool.query(
      "SELECT id, stock_quantity, status FROM products WHERE id = $1",
      [product_id]
    );

    if (product.rows.length === 0 || product.rows[0].status !== "PUBLISHED") {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (product.rows[0].stock_quantity < quantity) {
      res.status(409).json({ error: "Insufficient stock" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, added_at = NOW()
       RETURNING id, product_id, quantity`,
      [req.userId, product_id, quantity]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /cart/:id — update quantity
router.patch("/cart/:id", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      res.status(400).json({ error: "quantity >= 1 required" });
      return;
    }

    const result = await pool.query(
      `UPDATE cart_items SET quantity = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, product_id, quantity`,
      [quantity, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Cart item not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /cart/:id — remove item
router.delete("/cart/:id", ...auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Cart item not found" });
      return;
    }

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /cart/checkout — convert cart to order
router.post("/cart/checkout", ...auth, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get cart items with product info
    const cartResult = await client.query(
      `SELECT ci.product_id, ci.quantity, p.title, p.price, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1`,
      [req.userId]
    );

    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    // Check stock for all items
    for (const item of cartResult.rows) {
      if (item.stock_quantity < item.quantity) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: `Insufficient stock for "${item.title}"`,
          product_id: item.product_id,
        });
        return;
      }
    }

    // Calculate total
    const totalAmount = cartResult.rows.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const shippingCost = totalAmount >= 50 ? 0 : 5.99;

    const { shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country } = req.body;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, shipping_cost, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, status, total_amount, shipping_cost, created_at`,
      [req.userId, totalAmount, shippingCost, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country || "FR"]
    );

    const orderId = orderResult.rows[0].id;

    // Create order items + decrement stock
    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, title, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.title, item.price, item.quantity]
      );

      await client.query(
        "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
    }

    // Clear cart
    await client.query("DELETE FROM cart_items WHERE user_id = $1", [req.userId]);

    await client.query("COMMIT");

    await writeAuditLog({
      userId: req.userId,
      action: "ORDER_CREATED",
      entityType: "order",
      entityId: orderId,
      details: { total: totalAmount, items: cartResult.rows.length },
      ipAddress: req.ip,
    });

    logger.info("Order created", { orderId, userId: req.userId, total: totalAmount });

    res.status(201).json({
      order: orderResult.rows[0],
      items_count: cartResult.rows.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Checkout failed", { error: (err as Error).message, userId: req.userId });
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

export default router;
