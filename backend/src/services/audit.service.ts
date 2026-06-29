import { pool } from "../db/pool";
import { logger } from "../config/logger";

interface AuditEntry {
  userId?: number;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.userId ?? null,
        entry.action,
        entry.entityType ?? null,
        entry.entityId ?? null,
        JSON.stringify(entry.details ?? {}),
        entry.ipAddress ?? null,
      ]
    );
  } catch (err) {
    logger.error("Failed to write audit log", { error: (err as Error).message, entry });
  }
}
