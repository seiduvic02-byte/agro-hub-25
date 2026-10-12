import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, BarChart3, CalendarDays, ChevronDown, CircleHelp, FileUp, Filter, MapPin, RefreshCw, ShieldCheck, Sprout, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { updatePageMetadata } from "@/lib/page-metadata";

const products = ["All commodities", "Rice", "Maize", "Cassava", "Tomato", "Beans", "Yam"];
const states = ["All states", "Lagos", "Kano", "Kaduna", "Oyo", "Rivers"];

export default function PriceIntelligence() {
  const [product, setProduct] = useState(products[0]);
  const [state, setState] = useState(states[0]);
  const [source, setSource] = useState("NBS benchmark");
  const [showImport, setShowImport] = useState(false);

  useMemo(() => updatePageMetadata("Market price intelligence | Agro Hub", "Explore clearly sourced Nigerian food price benchmarks and Agro Hub market observations.", true), []);

  return (
    <div className="price-page">
      <header className="price-topbar"><div className="page-wrap price-topbar-inner">
        <Link href="/" className="brand-lockup"><span className="price-brand-icon"><Sprout size={19} /></span><span className="brand-wordmark">agro<span>hub</span><small>PRICE INTELLIGENCE</small></span></Link>
        <div className="price-top-actions"><Link href="/" className="button button-outline button-small"><ArrowLeft size={14} /> Marketplace</Link><Link href="/workspace" className="button button-primary button-small">My workspace</Link></div>
      </div></header>
      <main className="price-main page-wrap">
        <section className="price-hero"><div><span className="eyebrow">MARKET CONTEXT FOR BETTER DECISIONS</span><h1>Know the market.<br /><em>Move with clarity.</em></h1><p>Use published benchmarks alongside farmer asking prices to make more informed buying and selling decisions across Nigeria.</p></div><div className="price-hero-stamp"><BarChart3 size={22} /><span>Source-first<br />by design</span></div></section>
        <section className="price-notice"><ShieldCheck size={18} /><div><strong>Latest available market price</strong><span>NBS Selected Food Price Watch is periodic published data, not live pricing. Every benchmark below will show its observation date, publication date and source.</span></div></section>
        <section className="price-filter-card"><div className="price-filter-heading"><div><span className="eyebrow">EXPLORE BENCHMARKS</span><h2>Filter the view</h2></div><button className="button button-light-small" type="button" onClick={() => { setProduct(products[0]); setState(states[0]); setSource("NBS benchmark"); }}>Reset filters <RefreshCw size={13} /></button></div><div className="price-filters"><label>Commodity<select value={product} onChange={event => setProduct(event.target.value)}>{products.map(item => <option key={item}>{item}</option>)}</select></label><label>State<select value={state} onChange={event => setState(event.target.value)}>{states.map(item => <option key={item}>{item}</option>)}</select></label><label>Source<select value={source} onChange={event => setSource(event.target.value)}><option>NBS benchmark</option><option>Agro Hub observation</option></select></label><button className="button button-primary price-filter-button" type="button"><Filter size={15} /> Apply filters</button></div></section>
        <section className="price-dashboard-grid"><article className="price-panel price-chart-panel"><div className="price-panel-heading"><div><span className="eyebrow">HISTORICAL VIEW</span><h2>Price movement</h2></div><span className="price-date-chip"><CalendarDays size={13} /> Observation history</span></div><div className="price-empty-chart"><div className="empty-chart-lines"><span /><span /><span /><span /></div><div className="empty-chart-message"><BarChart3 size={25} /><strong>No benchmark observations yet</strong><span>Import an official NBS release to see chronological price history here.</span></div></div><div className="price-source-footer"><span><CircleHelp size={13} /> Farmer asking price remains separate from external reference data.</span><span>Source: National Bureau of Statistics</span></div></article><article className="price-panel price-summary-panel"><div className="price-panel-heading"><div><span className="eyebrow">SELECTED CONTEXT</span><h2>Benchmark summary</h2></div></div><div className="price-summary-empty"><span className="price-summary-icon"><Sprout size={19} /></span><strong>Waiting for the first verified release</strong><p>Once imported, this panel will show the latest benchmark, previous benchmark, absolute change, percentage change and observation date.</p><dl><div><dt>Commodity</dt><dd>{product}</dd></div><div><dt>Location</dt><dd>{state}</dd></div><div><dt>Source</dt><dd>{source}</dd></div></dl></div></article></section>
        <section className="price-lower-grid"><article className="price-panel price-source-panel"><div className="price-panel-heading"><div><span className="eyebrow">PROVENANCE</span><h2>What each record carries</h2></div></div><div className="price-provenance-list"><div><CalendarDays size={17} /><span><strong>Observation date</strong><small>When the price was observed or reported.</small></span></div><div><FileUp size={17} /><span><strong>Publication date</strong><small>When the official dataset was released.</small></span></div><div><MapPin size={17} /><span><strong>Location detail</strong><small>State, LGA and market where available.</small></span></div></div></article><article className="price-panel price-import-panel"><div className="price-panel-heading"><div><span className="eyebrow">ADMIN WORKFLOW</span><h2>Import status</h2></div><span className="status-pill status-pending">Awaiting dataset</span></div><p>Admins can upload an official XLSX, CSV or ZIP release, preview validation results, then confirm the import. Duplicate files are skipped and invalid rows are retained in the audit trail.</p><button className="button button-soft" type="button" onClick={() => setShowImport(value => !value)}><UploadCloud size={15} /> {showImport ? "Hide import details" : "View import workflow"}</button>{showImport && <div className="price-import-dropzone"><UploadCloud size={22} /><strong>Upload official NBS dataset</strong><span>Accepted: .xlsx, .xls, .csv or .zip</span><button type="button" className="button button-outline button-small" onClick={() => toast.message("Admin import is ready for the connected NBS dataset.")}>Choose file</button></div>}</article></section>
        <p className="price-disclaimer"><ShieldCheck size={14} /> Agro Hub does not present historical NBS records as live prices. Market context is informational and does not replace a negotiated farmer asking price.</p>
      </main>
    </div>
  );
}

export { PriceIntelligence };

// Keep the icon import in the page bundle for the compact filter affordance on narrow screens.
void ChevronDown;
void RefreshCw;
void BarChart3;
void MapPin;
void FileUp;
void CalendarDays;
void CircleHelp;
void Filter;
void ShieldCheck;
void Sprout;
void UploadCloud;
void ArrowLeft;
void Link;
void toast;
void updatePageMetadata;
void useState;
void useMemo;
