import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import { logger } from "../config/logger";
import { env } from "../config/env";
import { generateAccessToken, generateRefreshToken, checkJwt, AuthRequest } from "../middleware/auth";
import { writeAuditLog } from "../services/audit.service";

const router = Router();
const SALT_ROUNDS = 12;

// ─── POST /auth/register ───────────────────
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, display_name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères" });
      return;
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Cet email est déjà utilisé" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name`,
      [email.toLowerCase(), passwordHash, display_name || email.split("@")[0]]
    );

    const user = result.rows[0];

    await pool.query(
      "INSERT INTO user_roles (user_id, role) VALUES ($1, 'BUYER')",
      [user.id]
    );

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    await writeAuditLog({ userId: user.id, action: "USER_REGISTER", entityType: "user", entityId: user.id, ipAddress: String(req.ip) });

    logger.info("User registered", { userId: user.id });

    res.status(201).json({
      user: { id: user.id, email: user.email, display_name: user.display_name, roles: ["BUYER"] },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    logger.error("Register error", { error: (err as Error).message });
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ─── POST /auth/login ─────────────────────
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }

    const userResult = await pool.query(
      "SELECT id, email, password_hash, display_name, avatar_url, is_active FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: "Compte désactivé" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    const rolesResult = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [user.id]);
    const roles = rolesResult.rows.map((r) => r.role);

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    await writeAuditLog({ userId: user.id, action: "USER_LOGIN", entityType: "user", entityId: user.id, ipAddress: String(req.ip) });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        roles,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    logger.error("Login error", { error: (err as Error).message });
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ─── POST /auth/refresh ───────────────────
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(400).json({ error: "Refresh token requis" });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: number; email: string; type?: string };

    if (decoded.type !== "refresh") {
      res.status(401).json({ error: "Token invalide" });
      return;
    }

    const userResult = await pool.query("SELECT id, email, is_active FROM users WHERE id = $1", [decoded.userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      res.status(401).json({ error: "Utilisateur introuvable" });
      return;
    }

    const user = userResult.rows[0];
    const accessToken = generateAccessToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id, user.email);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: "Refresh token expiré" });
  }
});

// ─── GET /auth/me ─────────────────────────
router.get("/me", checkJwt, async (req: AuthRequest, res: Response) => {
  try {
    const userResult = await pool.query(
      "SELECT id, email, display_name, avatar_url FROM users WHERE id = $1",
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    const user = userResult.rows[0];
    const rolesResult = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [user.id]);

    res.json({
      ...user,
      roles: rolesResult.rows.map((r) => r.role),
    });
  } catch (err) {
    logger.error("Get me error", { error: (err as Error).message });
    res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
