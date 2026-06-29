import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: number;
  email: string;
}

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoles?: string[];
}

/**
 * Vérifie le token JWT dans le header Authorization: Bearer <token>
 */
export function checkJwt(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

/**
 * Middleware optionnel : attache le user si un token est présent, mais ne bloque pas
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
  } catch { /* ignore invalid token */ }
  next();
}

/**
 * Génère un access token JWT
 */
export function generateAccessToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as string & jwt.SignOptions["expiresIn"] });
}

/**
 * Génère un refresh token JWT
 */
export function generateRefreshToken(userId: number, email: string): string {
  return jwt.sign({ userId, email, type: "refresh" }, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as string & jwt.SignOptions["expiresIn"] });
}
