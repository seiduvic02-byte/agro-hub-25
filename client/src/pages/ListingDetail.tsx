import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Clock3, MapPin, MessageCircle, ShieldCheck, Sprout } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatNaira, perUnitLabel } from "@/lib/marketplace-format";
import { updatePageMetadata } from "@/lib/page-metadata";
import { getExampleListing, type MarketplaceItem } from "@shared/marketplace";
import RequestDialog from "@/components/RequestDialog";

function statusCopy(status: string) {
  if (status === "verified") return { text: "Identity reviewed by Agro Hub", className: "status-reviewed" };
  if (status === "pending") return { text: "Identity review pending", className: "status-pending" };
  if (status === "needs_changes") return { text: "Review update requested", className: "status-muted" };
  return { text: "Marketplace seller", className: "status-muted" };
}

export default function ListingDetail() {
  const [, params] = useRoute("/produce/:slug");
  const slug = params?.slug ?? "";
  const example = getExampleListing(slug);
  const listingQuery = trpc.marketplace.listingBySlug.useQuery({ slug }, { enabled: Boolean(slug) && !example, retry: false });
  const listing = example ?? (listingQuery.data as MarketplaceItem | null | undefined) ?? null;
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Listing details appear inaccurate");
  const [reportDetail, setReportDetail] = useState("");
  const report = trpc.marketplace.report.useMutation({
    onSuccess: () => { toast.success("Report sent for review"); setReportOpen(false); setReportDetail(""); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (listing) {
      updatePageMetadata(`${listing.title} — Agro Hub`, `${listing.title} from ${listing.location}. View the listed quantity and price, then contact the grower directly.`, listing.isExample);
    } else if (listingQuery.isError || (!listingQuery.isLoading && !example)) {
      updatePageMetadata("Produce listing not found — Agro Hub", "This produce listing is no longer available.", true);
    }
  }, [listing, listingQuery.isError, listingQuery.isLoading, example]);

  if (listingQuery.isLoading && !example) return <div className="site-shell"><div className="detail-loading"><span className="loading-dots" />Loading produce details…</div></div>;
  if (!listing) return <div className="site-shell"><div className="detail-not-found page-wrap"><div className="empty-icon"><Sprout size={25} /></div><span className="eyebrow">LISTING NOT AVAILABLE</span><h1>This harvest may have moved on.</h1><p>The listing could not be found or is no longer available. Browse current listings and examples on the marketplace.</p><Link className="button button-primary" href="/">Back to the marketplace <ArrowRight size={16} /></Link></div></div>;

  const sellerStatus = statusCopy(listing.sellerVerificationStatus);
  return <div className="site-shell">
    <header className="detail-header"><div className="page-wrap detail-header-inner"><Link className="brand-lockup" href="/"><img className="brand-mark" src="/brand/mark.webp" alt="" /><span className="brand-wordmark">agro<span>hub</span><small>FARM TO MARKET</small></span></Link><Link className="button button-light-small" href="/"><ArrowLeft size={15} /> Back to marketplace</Link></div></header>
    <main className="detail-main page-wrap">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><a href="/#marketplace">Produce</a><span>/</span><span>{listing.title}</span></nav>
      <div className="detail-grid">
        <div className="detail-gallery">
          <div className="detail-image-frame"><img src={listing.imageUrl || "/produce/tomatoes.jpg"} alt={listing.title} /><span className={listing.isExample ? "example-ribbon" : "listing-ribbon"}>{listing.isExample ? "EXAMPLE LISTING" : "LIVE LISTING"}</span></div>
          <div className="detail-image-caption"><Sprout size={16} /><span>{listing.isExample ? "An illustrative example — not current stock." : "Crop reference image only — confirm harvest details with the seller."}</span></div>
        </div>
        <section className="detail-info">
          <div className="detail-category-row"><span className="category-label">{listing.category}</span><span className={sellerStatus.className}><i />{sellerStatus.text}</span></div>
          <h1>{listing.title}</h1>
          <p className="detail-place"><MapPin size={16} />{listing.location}</p>
          <div className="detail-price"><strong>{formatNaira(listing.priceMinor / 100)}</strong><span>{perUnitLabel(listing.priceUnit)}</span></div>
          <div className="detail-quantity-row"><span><Check size={15} />{listing.quantityAvailable.toLocaleString()} {listing.quantityUnit} listed</span><span><Clock3 size={15} />Minimum {listing.minimumOrder} {listing.quantityUnit}</span></div>
          <p className="detail-description">{listing.description}</p>
          <div className="detail-seller-card"><div className="seller-avatar seller-avatar-large"><Sprout size={20} /></div><div><span className="eyebrow">GROWER</span><strong>{listing.sellerBusinessName || listing.sellerName}</strong><small>{listing.location} · {sellerStatus.text}</small></div>{listing.sellerVerificationStatus === "verified" && <BadgeCheck className="verified-icon" size={19} />}</div>
          {!listing.isExample && listing.sellerContactInfo && <p className="seller-contact-public"><strong>Seller-shared contact</strong><span>{listing.sellerContactInfo}</span></p>}
          {listing.sellerUserId && <Link className="text-link detail-profile-link" href={`/seller/${listing.sellerUserId}`}>View grower profile <ArrowRight size={15} /></Link>}
          {listing.isExample ? <div className="sample-caution"><ShieldCheck size={18} /><span><strong>Example only.</strong> This is illustrative product data, not a real seller or available inventory. You can't submit a request for it.</span></div> : <><button type="button" className="button button-primary button-wide detail-request" onClick={() => setRequestOpen(true)}>Request this produce <ArrowRight size={17} /></button><p className="payment-note"><MessageCircle size={15} />A request starts a conversation. Payment is not processed on Agro Hub.</p><button type="button" className="report-link" onClick={() => setReportOpen(value => !value)}>Report a concern about this listing</button></>}
        </section>
      </div>
      <div className="detail-bottom-note"><ShieldCheck size={18} /><span>Compare listing details with the grower directly. Review badges only indicate the status shown; they are not a guarantee of product quality or transaction outcome.</span></div>
    </main>
    <RequestDialog item={requestOpen && !listing.isExample ? listing : null} onClose={() => setRequestOpen(false)} />
    {reportOpen && !listing.isExample && <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setReportOpen(false); }}><section className="request-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title"><div className="dialog-head"><div><p className="eyebrow">MARKETPLACE CARE</p><h2 id="report-title">Report a concern</h2></div><button className="icon-button" type="button" onClick={() => setReportOpen(false)} aria-label="Close report form">×</button></div><form className="form-stack" onSubmit={event => { event.preventDefault(); if (listing.sellerUserId) report.mutate({ listingId: listing.id, reportedUserId: listing.sellerUserId, reason: reportReason, details: reportDetail || undefined }); }}><label className="field-label">What's the concern?<select value={reportReason} onChange={event => setReportReason(event.target.value)}><option>Listing details appear inaccurate</option><option>Duplicate or misleading listing</option><option>Seller conduct concern</option><option>Other marketplace issue</option></select></label><label className="field-label">Details <span className="optional-label">Optional</span><textarea maxLength={1200} rows={4} value={reportDetail} onChange={event => setReportDetail(event.target.value)} placeholder="Share what our review team should know." /></label><p className="quiet-note"><ShieldCheck size={15} />Reports are reviewed by an administrator. Please don't include sensitive personal information.</p><button className="button button-primary button-wide" type="submit" disabled={report.isPending}>{report.isPending ? "Sending…" : "Send report"}</button></form></section></div>}
  </div>;
}
