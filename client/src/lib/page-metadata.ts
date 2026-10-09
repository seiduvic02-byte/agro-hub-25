export function updatePageMetadata(
  title: string,
  description: string,
  noIndex = false
) {
  document.title = title;
  const ensureMeta = (selector: string, attributes: Record<string, string>) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement("meta");
      document.head.appendChild(element);
    }
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
    return element;
  };

  ensureMeta('meta[name="description"]', {
    name: "description",
    content: description,
  });
  ensureMeta('meta[property="og:title"]', {
    property: "og:title",
    content: title,
  });
  ensureMeta('meta[property="og:description"]', {
    property: "og:description",
    content: description,
  });
  ensureMeta('meta[property="og:type"]', {
    property: "og:type",
    content: "website",
  });
  ensureMeta('meta[property="og:site_name"]', {
    property: "og:site_name",
    content: "Agro Hub",
  });
  ensureMeta('meta[name="twitter:title"]', {
    name: "twitter:title",
    content: title,
  });
  ensureMeta('meta[name="twitter:description"]', {
    name: "twitter:description",
    content: description,
  });

  const origin = document.head.querySelector<HTMLMetaElement>(
    'meta[name="agro-public-origin"]'
  )?.content;
  const image = document.head.querySelector<HTMLMetaElement>(
    'meta[name="agro-public-og-image"]'
  )?.content;
  const canonical = !noIndex && origin
    ? new URL(window.location.pathname, origin).toString()
    : undefined;

  if (canonical) {
    ensureMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonical,
    });
    let link = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
  } else {
    document.head.querySelector('meta[property="og:url"]')?.remove();
    document.head.querySelector('link[rel="canonical"]')?.remove();
  }

  if (image) {
    ensureMeta('meta[property="og:image"]', {
      property: "og:image",
      content: image,
    });
    ensureMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: image,
    });
  } else {
    document.head.querySelector('meta[property="og:image"]')?.remove();
    document.head.querySelector('meta[name="twitter:image"]')?.remove();
  }
  ensureMeta('meta[name="twitter:card"]', {
    name: "twitter:card",
    content: image ? "summary_large_image" : "summary",
  });
  ensureMeta('meta[name="robots"]', {
    name: "robots",
    content: noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large",
  });
}
