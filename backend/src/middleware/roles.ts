import { Response, NextFunction } from "express";
import { pool } from "../db/pool";
import { logger } from "../config/logger";
import { AuthRequest } from "./auth";

// Re-export AuthRequest pour compatibilité
export type { AuthRequest } from "./auth";

/**
 * Charge les rôles du user depuis la DB et les attache à req
 */
export async function loadUserRoles(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.userId) return next();

    const result = await pool.query(
      "SELECT role FROM user_roles WHERE user_id = $1",
      [req.userId]
    );
    req.userRoles = result.rows.map((r) => r.role);
    next();
  } catch (err) {
    logger.error("loadUserRoles error", { error: (err as Error).message });
    next();
  }
}

/**
 * Factory : vérifie que le user a au moins un des rôles requis
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const hasRole = req.userRoles?.some((r) => roles.includes(r));
    if (!hasRole) {
      res.status(403).json({ error: "Permissions insuffisantes" });
      return;
    }

    next();
  };
}
