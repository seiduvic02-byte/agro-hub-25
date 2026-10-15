import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { publicPlatformScript } from "../server/_core/publicConfig";

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "64kb", extended: true, parameterLimit: 100 }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/platform/config.js", (_req, res) => {
  res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
});
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);

export default app;
