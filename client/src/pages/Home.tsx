import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Heart, Leaf, MapPin, Menu, Search, ShieldCheck, ShoppingBasket, Sprout, Users, Wheat, X } from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { formatNaira, perUnitLabel } from "@/lib/marketplace-format";
import { exampleListings, marketplaceCategories, type MarketplaceItem } from "@shared/marketplace";
import RequestDialog from "@/components/RequestDialog";

const HERO_IMAGE = "/hero/agrohub-farmer.webp";
const LOGO_IMAGE = "/brand/mark.webp";

function signIn() {
  window.dispatchEvent(new CustomEvent("agrohub:signin"));
}

function beginGoogleSignIn() {
  void startLogin().catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "Sign-in is not available yet. Please try again later.");
  });
}

function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode("signin");
      setEmail("");
      setPassword("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      toast.error("Sign-in is temporarily unavailable. Please try again later.");
      return;
    }
    setBusy(true);
    const redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT_URL ??
      import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
      `${window.location.origin}/auth/callback`;
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectTo } })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      const message = result.error.message.toLowerCase();
      if (message.includes("email not confirmed")) toast.error("Please confirm your email before signing in.");
      else if (message.includes("invalid login credentials")) toast.error("Invalid email or password.");
      else if (message.includes("password") && message.includes("character")) toast.error("Use a password with at least 6 characters.");
      else toast.error("We could not complete that request. Please try again.");
      return;
    }
    if (mode === "signup") {
      toast.success("Account created. Check your email to confirm your account.");
      setMode("signin");
      setPassword("");
      return;
    }
    onClose();
    window.location.assign("/workspace");
  }

  return <div className="signin-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="signin-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-title">
      <button className="signin-close" type="button" onClick={onClose} aria-label="Close sign-in dialog"><X size={18} /></button>
      <div className="signin-dialog-art"><span className="signin-art-orbit" /><span className="signin-art-leaf"><Leaf size={28} /></span><small>GROWN<br />WITH<br />CARE</small></div>
      <div className="signin-dialog-content">
        <span className="eyebrow">WELCOME TO AGRO HUB</span>
        <h2 id="signin-title">{mode === "signin" ? <>Source with<br /><em>confidence.</em></> : <>Join the<br /><em>movement.</em></>}</h2>
        <p className="signin-intro">{mode === "signin" ? "Sign in to message growers, save suppliers and keep every request in one calm, clear workspace." : "Create your account to connect with growers, buyers and a better way to move food."}</p>
        <button className="signin-google-button" type="button" onClick={beginGoogleSignIn} disabled={busy}><span className="google-mark" aria-hidden="true">G</span><span>Continue with Google</span><ArrowRight size={16} /></button>
        <div className="signin-rule"><span>or use email</span></div>
        <form className="signin-email-form" onSubmit={submitEmail}>
          <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
          <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required /></label>
          <button className="button button-outline button-wide" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"} {!busy && <ArrowRight size={15} />}</button>
        </form>
        <button className="signin-mode-toggle" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "New to Agro Hub? Create an account" : "Already have an account? Sign in"}</button>
        <p className="signin-legal">By continuing, you agree to Agro Hub&apos;s <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
      </div>
    </section>
  </div>;
}

function useSignInDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const openDialog = () => setOpen(true);
    window.addEventListener("agrohub:signin", openDialog);
    return () => window.removeEventListener("agrohub:signin", openDialog);
  }, []);
  return { open, close: () => setOpen(false) };
}

function Brand() {
  return <Link href="/" className="brand-lockup" aria-label="Agro Hub home">
    <img className="brand-mark" src={LOGO_IMAGE} alt="" />
    <span className="brand-wordmark">agro<span>hub</span><small>FARM TO MARKET</small></span>
  </Link>;
}

function Header() {
  const auth = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  useEffect(() => setMobileOpen(false), [location]);
  return <header className="site-header">
    <div className="header-inner page-wrap">
      <Brand />
      <button className="mobile-menu-toggle" type="button" onClick={() => setMobileOpen(value => !value)} aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen}>{mobileOpen ? <X /> : <Menu />}</button>
      <nav className={`main-nav ${mobileOpen ? "is-open" : ""}`} aria-label="Main navigation">
        <a href="/#marketplace">Explore produce</a>
        <a href="/#how-it-works">How it works</a>
        <a href="/#for-farmers">For farmers</a>
        {auth.data ? <Link href="/workspace" className="nav-workspace">My profile <ArrowUpRight size={15} /></Link> : <button className="nav-login" type="button" onClick={signIn}>Sign into profile</button>}
        <a className="button button-primary nav-cta" href="/workspace">List your harvest <ArrowRight size={16} /></a>
      </nav>
    </div>
  </header>;
}

function ListingCard({ item, onRequest }: { item: MarketplaceItem; onRequest: (item: MarketplaceItem) => void }) {
  const isExample = item.isExample;
  return <article className={`listing-card ${isExample ? "is-example" : ""}`}>
    <Link href={`/produce/${item.slug}`} className="listing-image-link" aria-label={`View ${item.title}`}>
      <img className="listing-image" src={item.imageUrl || "/produce/tomatoes.jpg"} alt={item.title} loading="lazy" />
      <span className={isExample ? "example-ribbon" : "listing-ribbon"}>{isExample ? "EXAMPLE" : "AVAILABLE"}</span>
    </Link>
    <div className="listing-card-body">
      <div className="listing-topline"><span className="category-label">{item.category}</span><span className="location-label"><MapPin size={13} />{item.location.split(",")[0]}</span></div>
      <h3><Link href={`/produce/${item.slug}`}>{item.title}</Link></h3>
      <div className="listing-price-line"><strong>{formatNaira(item.priceMinor / 100)}</strong><span>{perUnitLabel(item.priceUnit)}</span></div>
      <div className="listing-details"><span>{item.quantityAvailable.toLocaleString()} {item.quantityUnit} available</span><span>Min. {item.minimumOrder} {item.quantityUnit}</span></div>
      <div className="seller-line"><span className="seller-avatar"><Sprout size={15} /></span><span>{item.sellerBusinessName || item.sellerName}<small>{item.sellerVerificationStatus === "verified" ? "Identity reviewed" : isExample ? "Illustrative seller" : "Marketplace seller"}</small>{!isExample && item.sellerUserId && <Link className="seller-profile-link" href={`/seller/${item.sellerUserId}`}>View grower profile <ArrowUpRight size={12} /></Link>}</span>{item.sellerVerificationStatus === "verified" && <BadgeCheck className="verified-icon" size={16} aria-label="Identity reviewed" />}</div>
      {isExample ? <div className="example-card-note">Sample only · not orderable</div> : <button className="button button-outline card-request" type="button" onClick={() => onRequest(item)}>Request produce <ArrowRight size={15} /></button>}
    </div>
  </article>;
}

function UseStep({ number, title, description, icon: Icon }: { number: string; title: string; description: string; icon: typeof Search }) {
  return <article className="step-card"><span className="step-number">{number}</span><div className="step-icon"><Icon size={22} strokeWidth={1.8} /></div><h3>{title}</h3><p>{description}</p></article>;
}

export default function Home() {
  const signInDialog = useSignInDialog();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("All produce");
  const [requestItem, setRequestItem] = useState<MarketplaceItem | null>(null);
  const auth = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const profile = trpc.marketplace.profile.useQuery(undefined, { enabled: Boolean(auth.data), retry: false });
  const utils = trpc.useUtils();
  const saveSupplier = trpc.marketplace.savedSuppliers.toggle.useMutation({
    onSuccess: async result => { toast.success(result.saved ? "Supplier saved" : "Supplier removed from saved list"); await utils.marketplace.savedSuppliers.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchDraft.trim()), 260);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);
  useEffect(() => {
    updatePageMetadata(
      "Agro Hub — Fresh produce, direct from Nigerian farms",
      "Find fresh Nigerian produce, compare crop listings, and connect directly with growers. Request quantities and agree on delivery with the seller."
    );
  }, []);

  const query = trpc.marketplace.search.useQuery({ query: search, category: category === "All produce" ? undefined : category, location: region.trim() || undefined }, { staleTime: 20_000, retry: 1 });
  const liveItems = (query.data ?? []) as unknown as MarketplaceItem[];
  const filteredExamples = useMemo(() => exampleListings.filter(item => {
    const matchesQuery = !search || `${item.title} ${item.category} ${item.location} ${item.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All produce" || item.category === category;
    const matchesRegion = !region.trim() || item.location.toLowerCase().includes(region.trim().toLowerCase());
    return matchesQuery && matchesCategory && matchesRegion;
  }), [search, category, region]);
  const isFiltering = Boolean(search || region.trim() || category !== "All produce");
  const showExamples = liveItems.length === 0 && !isFiltering;
  const visibleItems = liveItems.length ? liveItems : showExamples ? filteredExamples : [];

  const save = (item: MarketplaceItem) => {
    if (!auth.data) { signIn(); return; }
    if (!profile.data) { toast.message("Create a buyer profile to save suppliers."); window.location.assign("/workspace"); return; }
    if (profile.data.accountType !== "buyer") { toast.error("Saved suppliers are available to buyer profiles."); return; }
    if (item.sellerUserId) saveSupplier.mutate({ sellerUserId: item.sellerUserId });
  };

  return <div className="site-shell">
    <Header />
    <main>
      <section className="hero-section">
        <div className="page-wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> GROWN HERE. SOURCED DIRECT.</span>
            <h1>Good food begins<br />closer to <em>home.</em></h1>
            <p className="hero-lede">A simpler way for Nigerian growers and buyers to find each other. Browse the harvest, ask the right questions, and arrange a deal directly.</p>
            <div className="hero-actions"><a className="button button-dark" href="#marketplace">Explore produce <ArrowRight size={17} /></a><a className="button button-soft" href="#for-farmers">I'm a farmer <ArrowUpRight size={16} /></a></div>
            <div className="hero-assurance"><div className="assurance-icon"><Leaf size={18} /></div><span><strong>Built around the people who grow it</strong><small>Direct conversations, clear quantities, no middleman promises.</small></span></div>
          </div>
          <div className="hero-visual-wrap">
            <div className="hero-photo-frame"><img className="hero-photo" src={HERO_IMAGE} alt="A Nigerian farmer harvesting fresh tomatoes and peppers" fetchPriority="high" /><div className="hero-photo-shade" /></div>
            <div className="hero-photo-note"><span className="note-icon"><Sprout size={17} /></span><span><strong>Fresh from the farm</strong><small>Know who you're buying from</small></span></div>
            <div className="hero-floating-stamp"><span>FIELD</span><Leaf size={25} /><span>TO TABLE</span></div>
            <span className="hero-ornament ornament-one" /><span className="hero-ornament ornament-two" />
          </div>
        </div>
      </section>

      <section id="marketplace" className="market-section">
        <div className="page-wrap">
          <div className="section-heading section-heading-row">
            <div><span className="eyebrow">THE MARKETPLACE</span><h2>Find what you're <em>looking for.</em></h2><p>Search produce, check what's on offer and start a conversation with the grower.</p></div>
            <a className="text-link" href="#how-it-works">How buying works <ArrowUpRight size={16} /></a>
          </div>
          <form className="search-panel" onSubmit={event => { event.preventDefault(); setSearch(searchDraft.trim()); }}>
            <label className="search-field"><Search size={19} /><span className="sr-only">Search produce or seller</span><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="What are you looking for?" /></label>
            <span className="search-divider" />
            <label className="search-field search-location"><MapPin size={18} /><span className="sr-only">Filter by state or town</span><input value={region} onChange={event => setRegion(event.target.value)} placeholder="State or town" /></label>
            <button className="button button-primary search-button" type="submit">Search produce <ArrowRight size={16} /></button>
          </form>
          <div className="browse-toolbar">
            <div className="category-pills" role="group" aria-label="Filter by produce category">
              {marketplaceCategories.map(item => <button key={item} type="button" className={`category-pill ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item === "Vegetables" ? <Leaf size={15} /> : item === "Grains" ? <Wheat size={15} /> : item === "Roots & tubers" ? <Sprout size={15} /> : item === "Fruits" ? <ShoppingBasket size={15} /> : null}{item}</button>)}
            </div>
            {(search || region || category !== "All produce") && <button className="clear-filters" type="button" onClick={() => { setSearch(""); setSearchDraft(""); setRegion(""); setCategory("All produce"); }}>Clear filters <X size={13} /></button>}
          </div>
          <div className="results-line"><span>{query.isLoading ? "Finding produce…" : liveItems.length ? `${liveItems.length} live ${liveItems.length === 1 ? "listing" : "listings"}` : showExamples ? "A few examples to get you started" : "No matching listings"}</span>{showExamples && <span className="example-disclosure"><i /> EXAMPLES · NOT LIVE STOCK</span>}</div>
          {visibleItems.length ? <div className="listing-grid">{visibleItems.map(item => <div className="listing-card-wrap" key={item.id}><ListingCard item={item} onRequest={setRequestItem} />{!item.isExample && item.sellerUserId && <button className="save-supplier-button" type="button" onClick={() => save(item)} aria-label={`Save ${item.sellerBusinessName || item.sellerName}`}><Heart size={16} /></button>}</div>)}</div> : <div className="empty-listings"><div className="empty-icon"><Search size={23} /></div><h3>No produce found just yet</h3><p>Try a different crop or nearby location. New listings appear here after growers publish their harvest.</p><button className="button button-outline" type="button" onClick={() => { setSearch(""); setSearchDraft(""); setRegion(""); setCategory("All produce"); }}>Reset search</button></div>}
          {query.isError && <p className="inline-notice">Live listings could not be refreshed. Any cards labelled “Example” are illustrative and cannot be ordered.</p>}
        </div>
      </section>

      <section id="how-it-works" className="how-section">
        <div className="page-wrap">
          <div className="section-heading centered-heading"><span className="eyebrow">A CLEARER WAY TO SOURCE</span><h2>Good business starts<br />with a <em>conversation.</em></h2><p>Find the crop. Talk through what you need. Make the arrangements that work for both sides.</p></div>
          <div className="steps-grid"><UseStep number="01" title="Browse the harvest" description="Explore produce by crop and location. Every example is labelled; live listings come from registered growers." icon={Search} /><UseStep number="02" title="Talk to the grower" description="Request the quantity you need, ask about collection or delivery, and compare the details directly." icon={Users} /><UseStep number="03" title="Agree on the next step" description="When a grower accepts, a request becomes an order record. Payment is arranged separately with the seller." icon={BookOpen} /></div>
          <div className="how-note"><ShieldCheck size={18} /><span><strong>Clarity over claims.</strong> Seller identity and listing review labels show their actual status—nothing is called verified unless it has been reviewed.</span></div>
        </div>
      </section>

      <section id="for-farmers" className="farmer-cta-section">
        <div className="page-wrap farmer-cta-card">
          <div className="farmer-cta-copy"><span className="eyebrow eyebrow-light">GROWERS, THIS IS YOUR SPACE</span><h2>Put your harvest<br />in front of the <em>right people.</em></h2><p>Create a farmer profile, post what you have available and manage enquiries in one place. You stay in control of the conversation.</p><a href="/workspace" className="button button-cream">Start a farmer profile <ArrowRight size={16} /></a><small>Listings are reviewed before appearing as live stock.</small></div>
          <div className="farmer-cta-art"><img src="/produce/maize.jpg" alt="Fresh ears of yellow maize" loading="lazy" /><span className="farmer-art-label"><Wheat size={15} /> YOUR HARVEST, YOUR TERMS</span><span className="farmer-cta-spark"><Leaf size={29} /></span></div>
        </div>
      </section>

      <section className="principles-section"><div className="page-wrap principles-grid"><div><span className="eyebrow">A MARKET WITH PURPOSE</span><h2>Shorter routes.<br /><em>Stronger roots.</em></h2></div><div className="principles-copy"><p>Agro Hub brings growers and buyers into the same conversation. No inflated claims about guaranteed supply—just a clearer way to see what is offered, ask about the details, and make a plan together.</p><a href="/#marketplace" className="text-link">Explore the marketplace <ArrowDownRight size={16} /></a></div></div></section>
    </main>
    <footer className="site-footer"><div className="page-wrap footer-inner"><Brand /><p>Growing closer, from farm to market.</p><div className="footer-links"><a href="/#marketplace">Explore produce</a><a href="/#how-it-works">How it works</a><a href="/workspace">Join Agro Hub</a></div><span className="footer-copy">© {new Date().getFullYear()} Agro Hub · Made for Nigerian agriculture</span></div></footer>
    <RequestDialog item={requestItem} onClose={() => setRequestItem(null)} />
    <SignInDialog open={signInDialog.open} onClose={signInDialog.close} />
  </div>;
}
import { updatePageMetadata } from "@/lib/page-metadata";
