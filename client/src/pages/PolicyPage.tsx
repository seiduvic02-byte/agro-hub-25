import { Link, useRoute } from "wouter";
import { ArrowLeft, Leaf, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { updatePageMetadata } from "@/lib/page-metadata";

export default function PolicyPage() {
  const [privacy] = useRoute("/privacy");
  const title = privacy ? "Privacy & data control" : "Terms of use";
  useEffect(() => updatePageMetadata(`${title} · Agro Hub`, privacy ? "How Agro Hub protects marketplace users and handles personal data." : "The terms that guide safe, direct produce trading on Agro Hub."), [privacy, title]);
  return (
    <div className="policy-page">
      <header className="policy-header page-wrap">
        <Link href="/" className="brand-lockup" aria-label="Agro Hub home"><span className="brand-mark policy-mark"><Leaf size={18} /></span><span className="brand-wordmark">agro<span>hub</span><small>FARM TO MARKET</small></span></Link>
        <Link href="/" className="text-link"><ArrowLeft size={15} /> Back to marketplace</Link>
      </header>
      <main className="policy-content page-wrap">
        <span className="eyebrow"><ShieldCheck size={14} /> AGRO HUB POLICY</span>
        <h1>{title}</h1>
        <p className="policy-lede">A clear, practical guide for farmers and buyers using Agro Hub to discover produce and start trusted conversations.</p>
        {privacy ? <>
          <PolicySection title="What we collect">We collect account details, marketplace profile information, listings, requests and messages needed to operate the farmer-to-buyer marketplace. We do not expose private requests or orders to unrelated users.</PolicySection>
          <PolicySection title="Your choices">You can control profile visibility, contact sharing and optional communications from your workspace privacy center. You may request an export or account deletion from the same place.</PolicySection>
          <PolicySection title="Trust and safety">We use role-based access, server-side ownership checks and moderation tools to protect listings, enquiries and orders. Never share passwords or payment credentials in a marketplace message.</PolicySection>
        </> : <>
          <PolicySection title="Use the marketplace honestly">Only publish produce you can reasonably supply. Keep quantities, prices and availability accurate, and respond to requests in good faith.</PolicySection>
          <PolicySection title="Transactions">Agro Hub records enquiries, purchase requests and order status. Payment, collection and delivery arrangements are agreed directly between the parties; no payment gateway is connected in this MVP.</PolicySection>
          <PolicySection title="Moderation">We may pause or remove misleading, unsafe or reported listings and restrict accounts that abuse the marketplace or other members.</PolicySection>
        </>}
      </main>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: string }) {
  return <section className="policy-section"><h2>{title}</h2><p>{children}</p></section>;
}
