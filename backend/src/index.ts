import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { checkDbConnection } from "./db/pool";

import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import meRouter from "./routes/me";
import productsRouter from "./routes/products";
import cartRouter from "./routes/cart";
import ordersRouter from "./routes/orders";
import fanzineRouter from "./routes/fanzine";
import adminRouter from "./routes/admin";

const app = express();

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// HTTP request logging (Morgan → Winston)
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// ============================================================
// ROUTES
// ============================================================
app.use(healthRouter);
app.use("/auth", authRouter);
app.use(meRouter);
app.use(productsRouter);
app.use(cartRouter);
app.use(ordersRouter);
app.use(fanzineRouter);
app.use(adminRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ============================================================
// START SERVER
// ============================================================
  async function start() {
  try {
    const dbOk = await checkDbConnection();
    if (!dbOk) {
      logger.warn("DB not ready, starting anyway");
    }
  } catch (e) {
    logger.warn("DB check failed, continuing startup");
  }

  app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

start();

export default app; // For tests (supertest)
