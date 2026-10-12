import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Download, MapPin, RefreshCw, Sprout, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { updatePageMetadata } from "@/lib/page-metadata";

const products = ["Tomatoes", "Rice", "Maize", "Cassava", "Plantain", "Pepper"];
const states = ["All states", "Lagos", "Kano", "Kaduna", "Oyo", "Benue"];
const history = [
  { month: "Oct", price: 640 }, { month: "Nov", price: 680 }, { month: "Dec", price: 720 },
  { month: "Jan", price: 690 }, { month: "Feb", price: 760 }, { month: "Mar", price: 805 },
];
const productRows = [
  { name: "Tomatoes", unit: "per 1 kg", price: "₦805", change: "+6.1%", trend: "up", state: "Lagos" },
  { name: "Rice", unit: "per 1 kg", price: "₦1,420", change: "+3.4%", trend: "up", state: "Kano" },
  { name: "Maize", unit: "per 1 kg", price: "₦680", change: "−1.8%", trend: "down", state: "Kaduna" },
  { name: "Cassava", unit: "per 1 kg", price: "₦390", change: "+2.2%", trend: "up", state: "Benue" },
];

export default function PriceIntelligence() {
  updatePageMetadata("Market Price Intelligence", "Reference Nigerian food prices and make more informed produce decisions.");
  const [product, setProduct] = useState("Tomatoes");
  const [state, setState] = useState("All states");
  const [range, setRange] = useState("6 months");
  const visibleRows = useMemo(() => state === "All states" ? productRows : productRows.filter(row => row.state === state), [state]);

  return <div className="price-page">
    <header className="price-topbar"><div className="page-wrap price-topbar-inner">
      <Link href="/" className="brand-lockup"><span className="price-brand-icon"><Sprout size={19} /></span><span className="brand-wordmark">agro<span>hub</span><small>PRICE INTELLIGENCE</small></span></Link>
      <nav className="price-nav"><Link href="/">Marketplace</Link><Link className="active" href="/prices">Market prices</Link><Link href="/workspace">My workspace</Link></nav>
    </div></header>
    <main className="page-wrap price-main">
      <Link href="/" className="price-back"><ArrowLeft size={15} /> Back to marketplace</Link>
      <div className="price-heading"><div><span className="eyebrow">NIGERIA · NBS SELECTED FOOD PRICE WATCH</span><h1>Know the market.<br /><em>Move with confidence.</em></h1><p>Use the latest published reference prices to sense demand, plan listings and start better conversations with buyers.</p></div><button className="button button-outline button-small" type="button"><Download size={14} /> Download data</button></div>
      <section className="price-filter-bar" aria-label="Price filters"><label>Product<select value={product} onChange={event => setProduct(event.target.value)}>{products.map(item => <option key={item}>{item}</option>)}</select></label><label>State<select value={state} onChange={event => setState(event.target.value)}>{states.map(item => <option key={item}>{item}</option>)}</select></label><label>Period<select value={range} onChange={event => setRange(event.target.value)}><option>6 months</option><option>12 months</option><option>24 months</option></select></label><button className="price-refresh" type="button" aria-label="Refresh prices"><RefreshCw size={16} /></button></section>
      <div className="price-source-note"><span><CalendarDays size={15} /> Observation period: March 2026</span><span>Source: Nigerian National Bureau of Statistics · Selected Food Price Watch</span></div>
      <section className="price-overview-grid"><article className="price-hero-card"><div className="price-card-top"><span className="eyebrow">NATIONAL REFERENCE · {product.toUpperCase()}</span><span className="confidence-chip">Reference data</span></div><div className="price-number">₦805 <small>/ kg</small></div><div className="price-change positive"><TrendingUp size={16} /> 6.1% from last period</div><p>A directional reference, not a guaranteed farm-gate or transaction price. Location, quality, season and volume all matter.</p></article><article className="price-stat-card"><span className="price-stat-label">National average</span><strong>₦805</strong><small>per 1 kg · March 2026</small><div className="mini-bar"><i style={{ width: "72%" }} /></div></article><article className="price-stat-card"><span className="price-stat-label">Price range</span><strong>₦650–₦980</strong><small>observed across selected states</small><div className="price-range-line"><i /><b /><i /></div></article></section>
      <section className="price-chart-panel"><div className="panel-heading"><div><span className="eyebrow">PRICE MOVEMENT</span><h2>{product} reference trend</h2></div><span className="price-chart-legend"><i /> Average price / kg</span></div><div className="price-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4b8a5b" stopOpacity={0.24} /><stop offset="100%" stopColor="#4b8a5b" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e8eee5" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b988d", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b988d", fontSize: 10 }} tickFormatter={value => `₦${value}`} /><Tooltip formatter={(value: number) => [`₦${value}`, "Average"]} contentStyle={{ border: "1px solid #dfe7da", borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="price" stroke="#34714b" strokeWidth={2.5} fill="url(#priceFill)" /></AreaChart></ResponsiveContainer></div></section>
      <section className="price-table-panel"><div className="panel-heading"><div><span className="eyebrow">SELECTED MARKET VIEW</span><h2>Reference prices by product</h2></div><Link href="/" className="text-link">Explore produce <ArrowRight size={14} /></Link></div><div className="price-table-wrap"><table><thead><tr><th>Product</th><th>Reference price</th><th>Change</th><th>Example observation</th><th /></tr></thead><tbody>{visibleRows.map(row => <tr key={row.name}><td><strong>{row.name}</strong><small>{row.unit}</small></td><td><strong>{row.price}</strong></td><td className={row.trend === "up" ? "positive" : "negative"}>{row.trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{row.change}</td><td><span className="state-pill"><MapPin size={12} /> {row.state}</span></td><td><ChevronDown size={15} /></td></tr>)}</tbody></table></div></section>
      <footer className="price-footnote"><span>Data is presented for planning and discovery only. Always confirm current terms directly with a farmer or buyer.</span><span>Last updated: 08 Apr 2026</span></footer>
    </main>
  </div>;
}

export { PriceIntelligence };

