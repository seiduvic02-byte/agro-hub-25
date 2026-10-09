import { describe, expect, it } from "vitest";
import { getPublicSellerIdsForSitemap, renderSeoPage } from "./marketplaceSeo";

const template = `<!doctype html><html lang="en"><head><title>Starter</title></head><body><main id="seo-shell" class="seo-shell">Starter shell</main><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;

describe("server-rendered SEO shell", () => {
  it("includes only unique, positive safe-integer seller IDs in sitemap output", () => {
    expect(getPublicSellerIdsForSitemap([
      { sellerUserId: null },
      { sellerUserId: 42 },
      { sellerUserId: 42 },
      { sellerUserId: 0 },
      { sellerUserId: -3 },
      { sellerUserId: 1.5 },
      { sellerUserId: Number.MAX_SAFE_INTEGER + 1 },
    ])).toEqual([42]);
  });

  it("replaces only the SEO shell and leaves the React root visible beside it", async () => {
    const result = await renderSeoPage("/", template);
    const body = result.html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";

    expect(result.status).toBe(200);
    expect(body).toContain('<main id="seo-shell" class="seo-shell">');
    expect(body).toContain('<div id="root"></div>');
    expect(body).toContain('<script type="module" src="/src/main.tsx"></script>');
    const shellStart = body.indexOf('<main id="seo-shell"');
    const shellEnd = body.indexOf("</main>", shellStart);
    const rootPosition = body.indexOf('<div id="root">');
    expect(rootPosition).toBeGreaterThan(shellEnd);
    expect(result.html).not.toContain("<main id=\"seo-shell\"><!doctype html>");
  });

  it("preserves a document without a starter SEO shell when inserting the fallback", async () => {
    const noShellTemplate = `<!doctype html><html><head></head><body><div id="root"></div></body></html>`;
    const result = await renderSeoPage("/", noShellTemplate);
    const body = result.html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";

    expect(result.status).toBe(200);
    expect(body).toContain('<main id="seo-shell" class="seo-shell">');
    expect(body).toContain('<div id="root"></div>');
    const shellStart = body.indexOf('<main id="seo-shell"');
    const shellEnd = body.indexOf("</main>", shellStart);
    const rootPosition = body.indexOf('<div id="root">');
    expect(rootPosition < shellStart || rootPosition > shellEnd).toBe(true);
    expect(result.html).toContain("<!doctype html>");
  });
});
