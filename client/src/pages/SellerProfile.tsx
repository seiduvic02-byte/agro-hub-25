import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, BadgeCheck, MapPin, Package, Sprout } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatNaira, perUnitLabel } from "@/lib/marketplace-format";
import { updatePageMetadata } from "@/lib/page-metadata";

function reviewCopy(status: string) {
  if (status === "verified") return "Identity reviewed";
  if (status === "pending") return "Identity review pending";
  if (status === "needs_changes") return "Review update requested";
  return "Marketplace seller";
}

export default function SellerProfile() {
  const [, params] = useRoute("/seller/:id");
  const rawId = params?.id ?? "";
  const userId = Number(rawId);
  const validUserId = /^[1-9]\d*$/.test(rawId) && Number.isSafeInteger(userId);
  const sellerQuery = trpc.marketplace.sellerById.useQuery(
    { userId },
    { enabled: validUserId, retry: false }
  );
  const seller = sellerQuery.data ?? null;
  const name = seller?.businessName || seller?.displayName || "Grower profile";

  useEffect(() => {
    if (seller) {
      updatePageMetadata(
        `${name} — Grower profile | Agro Hub`,
        seller.bio?.trim() || `${name}, a farmer/seller on Agro Hub. Browse their current harvest listings.`
      );
    } else if (!sellerQuery.isLoading) {
      updatePageMetadata(
        "Grower profile not found — Agro Hub",
        "This grower profile is not available. Browse current produce listings on Agro Hub.",
        true
      );
    }
  }, [seller, sellerQuery.isLoading, name]);

  return (
    <div className="site-shell">
      <header className="detail-header">
        <div className="page-wrap detail-header-inner">
          <Link className="brand-lockup" href="/" aria-label="Agro Hub home">
            <img className="brand-mark" src="/brand/mark.webp" alt="" />
            <span className="brand-wordmark">agro<span>hub</span><small>FARM TO MARKET</small></span>
          </Link>
          <Link className="button button-light-small" href="/">
            <ArrowLeft size={15} /> Back to marketplace
          </Link>
        </div>
      </header>

      <main className="seller-profile-main page-wrap">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>/</span><a href="/#marketplace">Growers</a>
          {seller && <><span>/</span><span>{name}</span></>}
        </nav>

        {sellerQuery.isLoading ? (
          <div className="detail-loading" role="status"><span className="loading-dots" />Loading grower profile…</div>
        ) : !seller ? (
          <section className="detail-not-found seller-profile-not-found">
            <div className="empty-icon"><Sprout size={25} /></div>
            <span className="eyebrow">GROWER NOT AVAILABLE</span>
            <h1>This profile could not be found.</h1>
            <p>The seller may no longer have an active marketplace profile. Return to Agro Hub to browse current produce.</p>
            <Link className="button button-primary" href="/">Back to the marketplace <ArrowRight size={16} /></Link>
          </section>
        ) : (
          <>
            <section className="seller-profile-card">
              <div className="seller-profile-avatar"><Sprout size={30} /></div>
              <div className="seller-profile-copy">
                <span className="eyebrow">FARMER / GROWER</span>
                <h1>{name}</h1>
                {seller.location && <p className="seller-profile-location"><MapPin size={16} />{seller.location}</p>}
                <span className={`seller-profile-status ${seller.verificationStatus === "verified" ? "is-reviewed" : ""}`}>
                  {seller.verificationStatus === "verified" && <BadgeCheck size={15} />}
                  {reviewCopy(seller.verificationStatus)}
                </span>
                {seller.bio?.trim() && <p className="seller-profile-bio">{seller.bio.trim()}</p>}
                {seller.contactInfo?.trim() && <p className="seller-profile-contact"><strong>Contact the grower</strong><span>{seller.contactInfo}</span></p>}
                <p className="seller-profile-disclaimer">Identity-review status reflects the account record only. It is not a guarantee of product quality or transaction outcome.</p>
              </div>
            </section>

            <section className="seller-profile-harvest" aria-labelledby="seller-harvest-title">
              <div className="section-heading seller-profile-heading">
                <div>
                  <span className="eyebrow">CURRENT HARVEST</span>
                  <h2 id="seller-harvest-title">Produce from <em>{name}</em></h2>
                  <p>Only active listings with available quantity appear here.</p>
                </div>
                <span className="seller-profile-count"><Package size={16} />{seller.listings.length} {seller.listings.length === 1 ? "listing" : "listings"}</span>
              </div>

              {seller.listings.length ? (
                <div className="seller-profile-listing-grid">
                  {seller.listings.map(listing => (
                    <Link className="seller-profile-listing-card" href={`/produce/${listing.slug}`} key={listing.id}>
                      <div className="seller-profile-listing-image">
                        <img src={listing.imageUrl || "/produce/tomatoes.jpg"} alt={listing.title} loading="lazy" />
                        <span>{listing.category}</span>
                      </div>
                      <div className="seller-profile-listing-copy">
                        <h3>{listing.title}</h3>
                        <p><MapPin size={13} />{listing.location}</p>
                        <div className="seller-profile-listing-price"><strong>{formatNaira(listing.priceMinor / 100)}</strong><span>{perUnitLabel(listing.priceUnit)}</span></div>
                        <small>{listing.quantityAvailable.toLocaleString()} {listing.quantityUnit} available</small>
                        <span className="seller-profile-open">View produce <ArrowRight size={14} /></span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-listings seller-profile-empty">
                  <div className="empty-icon"><Package size={22} /></div>
                  <h3>No live produce right now</h3>
                  <p>This grower has no active listings with available quantity at the moment.</p>
                  <Link className="button button-outline" href="/#marketplace">Explore other produce</Link>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
