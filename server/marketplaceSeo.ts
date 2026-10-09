import { getExampleListing } from "../shared/marketplace";
import { getPublicListing, getPublicSeller } from "./marketplaceDb";

type SeoListing = {
  title: string;
  slug: string;
  category: string;
  priceMinor: number;
  priceUnit: string;
  quantityAvailable: number;
  quantityUnit: string;
  minimumOrder: number;
  location: string;
  description: string;
  sellerName: string;
  sellerBusinessName: string | null;
  sellerContactInfo?: string | null;
  isExample?: boolean;
};

type SeoSeller = NonNullable<Awaited<ReturnType<typeof getPublicSeller>>>;

export type SeoPageResult = {
  html: string;
  status: number;
  cacheControl: string;
  noIndex: boolean;
};

const HOME_TITLE = "Agro Hub — Fresh produce, direct from Nigerian farms";
const HOME_DESCRIPTION =
  "Find fresh Nigerian produce, compare crop listings, and connect directly with growers. Request quantities and agree on delivery with the seller.";
const LOGO_PATH = "/brand/mark.webp";
const HERO_IMAGE_PATH = "/hero/agrohub-farmer.webp";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function oneLine(value: string, maxLength = 170): string {
  const clean = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1).trimEnd()}…` : clean;
}

function validAbsoluteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Use only the explicitly configured public website origin; never trust the request Host. */
export function getConfiguredPublicOrigin(): string | undefined {
  const configured = process.env.PUBLIC_SITE_URL?.trim();
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function getPublicSellerIdsForSitemap(
  listings: ReadonlyArray<{ sellerUserId: number | null }>
): number[] {
  const publicIds = listings
    .map(listing => listing.sellerUserId)
    .filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0);
  return [...new Set(publicIds)].sort((left, right) => left - right);
}

function setTitle(html: string, title: string): string {
  const tag = `<title>${escapeHtml(title)}</title>`;
  return /<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, tag)
    : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function setMeta(html: string, key: "name" | "property", value: string, content: string): string {
  const safeKey = escapeHtml(value);
  const tag = `<meta ${key}="${safeKey}" content="${escapeHtml(content)}" />`;
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${key}=[\"']${escapedValue}[\"'])[^>]*>`, "i");
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function setCanonical(html: string, canonical: string | undefined): string {
  const existing = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
  if (!canonical) return html.replace(existing, "");
  const tag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  return existing.test(html) ? html.replace(existing, tag) : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function shellContent(template: string, content: string): string {
  const header = `<header class="seo-shell-header"><a href="/" class="brand-lockup" aria-label="Agro Hub home"><img class="brand-mark" src="${LOGO_PATH}" alt="" /><span class="brand-wordmark">agro<span>hub</span><small>FARM TO MARKET</small></span></a><a class="button button-primary" href="/#marketplace">Explore produce <span aria-hidden="true">→</span></a></header>`;
  const shell = `<main id="seo-shell" class="seo-shell">${header}${content}</main>`;
  const shellPattern = /<main\b(?=[^>]*\bid=["']seo-shell["'])[^>]*>[\s\S]*?<\/main>/i;
  if (shellPattern.test(template)) return template.replace(shellPattern, shell);
  if (/<\/body>/i.test(template)) return template.replace(/<\/body>/i, `${shell}\n</body>`);
  return `${template}${shell}`;
}

function homeBody(): string {
  return `<section class="seo-shell-content" aria-label="Agro Hub marketplace introduction"><span class="eyebrow">GROWN HERE. SOURCED DIRECT.</span><h1>Good food begins closer to <em>home.</em></h1><p>A simpler way for Nigerian growers and buyers to find each other. Browse current produce offers, compare listed quantities, and ask growers about pickup or delivery.</p><p>Agro Hub supports direct conversations between farmers and buyers. Example cards are illustrative only; live produce comes from registered marketplace sellers.</p><a class="button button-primary" href="/#marketplace">Explore the marketplace <span aria-hidden="true">→</span></a></section>`;
}

function listingBody(listing: SeoListing): string {
  const name = listing.sellerBusinessName || listing.sellerName || "Marketplace seller";
  const price = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(listing.priceMinor / 100);
  const description = oneLine(listing.description, 420);
  const exampleNote = listing.isExample
    ? `<p class="sample-caution"><strong>Example only.</strong> This is illustrative product data, not a real seller or available inventory. Requests cannot be submitted for examples.</p>`
    : `<p>Contact the grower to confirm the harvest, quantity and delivery details. Agro Hub does not collect or confirm payment; arrange payment directly with the seller.</p>`;
  const contact = !listing.isExample && listing.sellerContactInfo
    ? `<p><strong>Seller-shared contact:</strong> ${escapeHtml(listing.sellerContactInfo)}</p>`
    : "";
  return `<section class="seo-shell-content" aria-label="Produce listing"><span class="eyebrow">${escapeHtml(listing.category)} · ${escapeHtml(listing.location)}</span><h1>${escapeHtml(listing.title)}</h1><p><strong>${escapeHtml(price)} / ${escapeHtml(listing.priceUnit)}</strong> · ${escapeHtml(listing.quantityAvailable.toLocaleString("en-NG"))} ${escapeHtml(listing.quantityUnit)} listed · minimum ${escapeHtml(listing.minimumOrder)} ${escapeHtml(listing.quantityUnit)}</p><p>${escapeHtml(description)}</p><p>Grower: ${escapeHtml(name)}. Listing and identity-review labels show their actual status and are not a product-quality guarantee.</p>${contact}${exampleNote}<a class="button button-primary" href="/#marketplace">Return to the marketplace <span aria-hidden="true">→</span></a></section>`;
}

function sellerBody(seller: SeoSeller): string {
  const name = seller.businessName || seller.displayName;
  const bio = seller.bio?.trim();
  const reviewNote = seller.verificationStatus === "verified"
    ? "Identity reviewed by Agro Hub. This status is not a product-quality or transaction guarantee."
    : "Seller identity-review status is shown as recorded; it is not a product-quality or transaction guarantee.";
  const listingItems = seller.listings.map(listing => {
    const price = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(listing.priceMinor / 100);
    return `<li><a href="/produce/${encodeURIComponent(listing.slug)}">${escapeHtml(listing.title)}</a><span>${escapeHtml(listing.category)} · ${escapeHtml(price)} / ${escapeHtml(listing.priceUnit)} · ${escapeHtml(listing.quantityAvailable.toLocaleString("en-NG"))} ${escapeHtml(listing.quantityUnit)}</span></li>`;
  }).join("");
  const listings = listingItems
    ? `<ul class="seo-seller-list">${listingItems}</ul>`
    : `<p>No produce is currently listed by this grower.</p>`;
  const location = seller.location ? ` · ${escapeHtml(seller.location)}` : "";
  const introduction = bio ? `<p>${escapeHtml(oneLine(bio, 420))}</p>` : "";
  const contact = seller.contactInfo ? `<p><strong>Seller-shared contact:</strong> ${escapeHtml(seller.contactInfo)}</p>` : "";
  return `<section class="seo-shell-content" aria-label="Grower profile"><span class="eyebrow">GROWER PROFILE${location}</span><h1>${escapeHtml(name)}</h1>${introduction}${contact}<p>${escapeHtml(reviewNote)}</p><h2>Current harvest</h2>${listings}<a class="button button-primary" href="/#marketplace">Browse the marketplace <span aria-hidden="true">→</span></a></section>`;
}

function privateBody(kind: "workspace" | "admin"): string {
  if (kind === "admin") {
    return `<section class="seo-shell-content" aria-label="Administrator access"><span class="eyebrow">AGRO HUB ADMINISTRATION</span><h1>Marketplace review, handled with <em>care.</em></h1><p>Administrator access is restricted to platform-assigned accounts. Sign in to review listings, seller identity-review requests and marketplace reports.</p><a class="button button-primary" href="/admin">Open the administration console <span aria-hidden="true">→</span></a></section>`;
  }
  return `<section class="seo-shell-content" aria-label="Marketplace workspace"><span class="eyebrow">YOUR MARKETPLACE, YOUR TERMS</span><h1>Your farm-to-market workspace.</h1><p>Sign in to manage a buyer or farmer profile, purchase requests, listings, order records and conversations. Personalized workspace content is private and is not indexed.</p><a class="button button-primary" href="/workspace">Open your workspace <span aria-hidden="true">→</span></a></section>`;
}

function notFoundBody(): string {
  return `<section class="seo-shell-content" aria-label="Page not found"><span class="eyebrow">PAGE NOT AVAILABLE</span><h1>This page could not be <em>found.</em></h1><p>The route or produce listing may have moved. Explore current marketplace listings from the Agro Hub home page.</p><a class="button button-primary" href="/">Back to Agro Hub <span aria-hidden="true">→</span></a></section>`;
}

function applyPageMetadata(
  html: string,
  pathname: string,
  title: string,
  description: string,
  options: { noIndex?: boolean; status?: number } = {}
): string {
  const noIndex = options.noIndex ?? false;
  const origin = getConfiguredPublicOrigin();
  const canonical = !noIndex && origin ? new URL(pathname, origin).toString() : undefined;
  const image = validAbsoluteUrl(process.env.PUBLIC_OG_IMAGE_URL?.trim())
    ?? (origin ? new URL(HERO_IMAGE_PATH, origin).toString() : undefined);
  let output = setTitle(html, title);
  output = setMeta(output, "name", "description", description);
  output = setMeta(output, "name", "robots", noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large");
  output = setMeta(output, "property", "og:type", "website");
  output = setMeta(output, "property", "og:site_name", "Agro Hub");
  output = setMeta(output, "property", "og:title", title);
  output = setMeta(output, "property", "og:description", description);
  if (canonical) output = setMeta(output, "property", "og:url", canonical);
  else output = output.replace(/<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/i, "");
  output = setMeta(output, "name", "twitter:card", image ? "summary_large_image" : "summary");
  output = setMeta(output, "name", "twitter:title", title);
  output = setMeta(output, "name", "twitter:description", description);
  if (image) {
    output = setMeta(output, "property", "og:image", image);
    output = setMeta(output, "name", "twitter:image", image);
  } else {
    output = output.replace(/<meta\b(?=[^>]*\bproperty=["']og:image["'])[^>]*>/i, "");
    output = output.replace(/<meta\b(?=[^>]*\bname=["']twitter:image["'])[^>]*>/i, "");
  }
  output = setCanonical(output, canonical);
  if (origin) output = setMeta(output, "name", "agro-public-origin", origin);
  else output = output.replace(/<meta\b(?=[^>]*\bname=["']agro-public-origin["'])[^>]*>/i, "");
  if (image) output = setMeta(output, "name", "agro-public-og-image", image);
  else output = output.replace(/<meta\b(?=[^>]*\bname=["']agro-public-og-image["'])[^>]*>/i, "");
  return output;
}

export async function renderSeoPage(requestUrl: string, template: string): Promise<SeoPageResult> {
  const url = new URL(requestUrl, "https://agrohub.invalid");
  const pathname = url.pathname;
  let title = HOME_TITLE;
  let description = HOME_DESCRIPTION;
  let body = homeBody();
  let status = 200;
  let noIndex = false;
  let cacheControl = "public, max-age=0, must-revalidate";

  if (pathname === "/") {
    // The interactive client loads current catalogue results; the first HTML stays useful and truthful without JS.
  } else if (pathname === "/workspace") {
    title = "Your Agro Hub workspace";
    description = "Manage your buyer or farmer profile, produce listings, purchase requests, order records and conversations.";
    body = privateBody("workspace");
    noIndex = true;
    cacheControl = "private, no-store, max-age=0";
  } else if (pathname === "/admin") {
    title = "Agro Hub administration";
    description = "Administrator-only review of produce listings, seller identity status and marketplace reports.";
    body = privateBody("admin");
    noIndex = true;
    cacheControl = "private, no-store, max-age=0";
  } else if (/^\/seller\/[1-9]\d*\/?$/.test(pathname)) {
    const sellerMatch = pathname.match(/^\/seller\/([1-9]\d*)\/?$/);
    const sellerId = Number(sellerMatch?.[1]);
    const seller = Number.isSafeInteger(sellerId) ? await getPublicSeller(sellerId) : null;
    if (seller) {
      const name = seller.businessName || seller.displayName;
      title = `${name} — Grower profile | Agro Hub`;
      description = oneLine(seller.bio?.trim() || `${name}, a farmer/seller on Agro Hub. Browse current harvest listings in ${seller.location}.`, 155);
      body = sellerBody(seller);
    } else {
      title = "Grower profile not found — Agro Hub";
      description = "This grower profile is not available. Browse current produce listings on Agro Hub.";
      body = notFoundBody();
      status = 404;
      noIndex = true;
      cacheControl = "no-store";
    }
  } else {
    const detailMatch = pathname.match(/^\/produce\/([^/]+)\/?$/);
    if (detailMatch) {
      let slug: string;
      try {
        slug = decodeURIComponent(detailMatch[1]!);
      } catch {
        slug = "";
      }
      const sample = slug ? getExampleListing(slug) : undefined;
      const listing = sample ?? (slug ? await getPublicListing(slug) : null);
      if (listing) {
        const safeListing: SeoListing = {
          title: listing.title,
          slug: listing.slug,
          category: listing.category,
          priceMinor: listing.priceMinor,
          priceUnit: listing.priceUnit,
          quantityAvailable: listing.quantityAvailable,
          quantityUnit: listing.quantityUnit,
          minimumOrder: listing.minimumOrder,
          location: listing.location,
          description: listing.description,
          sellerName: listing.sellerName,
          sellerBusinessName: listing.sellerBusinessName,
          sellerContactInfo: listing.sellerContactInfo,
          isExample: Boolean(sample),
        };
        title = `${listing.title} — Agro Hub`;
        description = oneLine(`${listing.title} from ${listing.location}. ${listing.description}`, 155);
        body = listingBody(safeListing);
        noIndex = Boolean(sample);
      } else {
        title = "Produce listing not found — Agro Hub";
        description = "This produce listing is no longer available. Browse the Agro Hub marketplace for current offers.";
        body = notFoundBody();
        status = 404;
        noIndex = true;
        cacheControl = "no-store";
      }
    } else {
      title = "Page not found — Agro Hub";
      description = "This Agro Hub page could not be found. Return to the marketplace to explore produce.";
      body = notFoundBody();
      status = 404;
      noIndex = true;
      cacheControl = "no-store";
    }
  }

  let html = shellContent(template, body);
  html = applyPageMetadata(html, pathname, title, description, { noIndex, status });
  return { html, status, cacheControl, noIndex };
}
