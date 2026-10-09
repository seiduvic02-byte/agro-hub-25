import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { renderSeoPage } from "../marketplaceSeo";

function sendRenderedPage(
  res: import("express").Response,
  result: Awaited<ReturnType<typeof renderSeoPage>>
) {
  res
    .status(result.status)
    .set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": result.cacheControl,
      "X-Robots-Tag": result.noIndex ? "noindex, nofollow" : "index, follow",
    })
    .end(result.html);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      const result = await renderSeoPage(url, page);
      sendRenderedPage(res, result);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        const fileName = path.basename(filePath);
        if (/^.+-[\da-f]{8,}\./i.test(fileName) && filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (/\.(?:png|jpe?g|webp|svg|woff2?)$/i.test(fileName)) {
          res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
        }
      },
    })
  );

  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(
        path.resolve(distPath, "index.html"),
        "utf-8"
      );
      const result = await renderSeoPage(req.originalUrl, template);
      sendRenderedPage(res, result);
    } catch (error) {
      next(error);
    }
  });
}
