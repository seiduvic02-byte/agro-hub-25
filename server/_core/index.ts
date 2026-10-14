import dotenv from "dotenv";
import express from "express";

// Vercel project variables are mirrored here for the custom Express/Vite server.
dotenv.config({ path: ".env.development.local" });
dotenv.config();
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { searchListings } from "../marketplaceDb";
import { getConfiguredPublicOrigin, getPublicSellerIdsForSitemap } from "../marketplaceSeo";

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    next();
  });
  // Keep unauthenticated request parsing bounded; no file-upload route exists.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "64kb", extended: true, parameterLimit: 100 }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/robots.txt", (_req, res) => {
    const origin = getConfiguredPublicOrigin();
    const content = [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /workspace",
      "Disallow: /admin",
      ...(origin ? [`Sitemap: ${origin}/sitemap.xml`] : []),
      "",
    ].join("\n");
    res.set("Cache-Control", "public, max-age=0, must-revalidate").type("text/plain").send(content);
  });
  app.get("/sitemap.xml", async (_req, res) => {
    const origin = getConfiguredPublicOrigin();
    if (!origin) return res.status(404).type("text/plain").send("A public origin is not configured.");
    try {
      const listings = await searchListings({});
      const sellerIds = getPublicSellerIdsForSitemap(listings);
      const locs = [
        `${origin}/`,
        ...listings.map(listing => `${origin}/produce/${encodeURIComponent(listing.slug)}`),
        ...sellerIds.map(userId => `${origin}/seller/${userId}`),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.map(loc => `<url><loc>${escapeXml(loc)}</loc></url>`).join("")}</urlset>`;
      return res.set("Cache-Control", "public, max-age=0, must-revalidate").type("application/xml").send(xml);
    } catch (error) {
      console.error("Could not build the live marketplace sitemap:", error instanceof Error ? error.message : "unknown error");
      return res.status(503).set("Cache-Control", "no-store").type("text/plain").send("The sitemap is temporarily unavailable.");
    }
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
