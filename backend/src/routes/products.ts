import { Router, Request, Response } from "express";
import { pool } from "../db/pool";

const router = Router();

// GET /products — list products with filters
router.get("/products", async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      min_price,
      max_price,
      featured,
      exclusive,
      sort = "created_at",
      order = "desc",
      page = "1",
      limit = "20",
    } = req.query;

    const conditions: string[] = ["p.status = 'PUBLISHED'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`c.slug = $${paramIndex++}`);
      params.push(category);
    }

    if (search) {
      conditions.push(
        `(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (min_price) {
      conditions.push(`p.price >= $${paramIndex++}`);
      params.push(Number(min_price));
    }

    if (max_price) {
      conditions.push(`p.price <= $${paramIndex++}`);
      params.push(Number(max_price));
    }

    if (featured === "true") {
      conditions.push("p.is_featured = TRUE");
    }

    if (exclusive === "true") {
      conditions.push("p.is_exclusive = TRUE");
    }

    const allowedSorts = ["created_at", "price", "title"];
    const sortCol = allowedSorts.includes(sort as string) ? sort : "created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const countQuery = `
      SELECT COUNT(*) FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch products with primary image
    const query = `
      SELECT p.id, p.title, p.slug, p.short_desc, p.price, p.compare_price,
             p.stock_quantity, p.is_featured, p.is_exclusive, p.attributes,
             p.created_at,
             c.name AS category_name, c.slug AS category_slug,
             pi.url AS image_url, pi.alt_text AS image_alt
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
      ${whereClause}
      ORDER BY p.${sortCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    res.json({
      products: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /products/featured — featured products for homepage carousel
router.get("/products/featured", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.slug, p.short_desc, p.price, p.compare_price,
              p.attributes, p.is_exclusive,
              c.name AS category_name, c.slug AS category_slug,
              pi.url AS image_url, pi.alt_text AS image_alt
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
       WHERE p.status = 'PUBLISHED' AND p.is_featured = TRUE
       ORDER BY p.created_at DESC
       LIMIT 12`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /products/:slug — product detail
router.get("/products/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1 AND p.status = 'PUBLISHED'`,
      [slug]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Fetch all images
    const images = await pool.query(
      `SELECT id, url, alt_text, position, is_primary
       FROM product_images WHERE product_id = $1 ORDER BY position`,
      [result.rows[0].id]
    );

    res.json({ ...result.rows[0], images: images.rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /categories — list active categories
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, description, icon_url, parent_id, sort_order
       FROM categories
       WHERE is_active = TRUE
       ORDER BY sort_order, name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
