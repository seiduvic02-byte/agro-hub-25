'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { FileCheck2, MapPin, MessageCircle, ReceiptText, ShieldCheck, Sparkles, Tractor, UserRound, X } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder-key',
)

const navItems = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'kyc', label: 'KYC verification', icon: ShieldCheck },
  { id: 'receipts', label: 'Receipts', icon: ReceiptText },
  { id: 'tracking', label: 'Live tracking', icon: MapPin },
]

const initialMessages = [
  { from: 'buyer', name: 'Maya from Green Basket', text: 'Can you confirm the tomato harvest is ready for pickup?', time: '09:24' },
  { from: 'me', name: 'You', text: 'Confirmed. It is packed and ready at the north field gate.', time: '09:26' },
]

export default function Page() {
  const [active, setActive] = useState('overview')
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const [kycStatus, setKycStatus] = useState<'idle' | 'reviewing' | 'verified'>('idle')
  const [tracking, setTracking] = useState(false)
  const [location, setLocation] = useState('Location sharing is off')
  const [authMessage, setAuthMessage] = useState('')

  async function signInWithGoogle() {
    setAuthMessage('Connecting to Google…')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setAuthMessage('Google sign-in is not configured yet. Connect the provider in Supabase Auth to continue.')
  }

  function startKyc() {
    setKycStatus('reviewing')
    window.setTimeout(() => setKycStatus('verified'), 1400)
  }

  function toggleTracking() {
    if (tracking) {
      setTracking(false)
      setLocation('Location sharing is off')
      return
    }
    if (!navigator.geolocation) {
      setLocation('Location is not supported by this browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setTracking(true)
        setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`)
      },
      () => setLocation('Location permission was not granted'),
    )
  }

  function sendMessage() {
    const text = draft.trim()
    if (!text) return
    setMessages((current) => [...current, { from: 'me', name: 'You', text, time: 'now' }])
    setDraft('')
  }

  function downloadReceipt() {
    const receipt = ['AGROHUB TRANSACTION RECEIPT', 'Receipt #AH-1048', 'Green Basket → AgroHub Farm', 'Produce: Fresh tomatoes (120 kg)', 'Total: $480.00', 'Status: Paid', 'Generated: 9 October 2026'].join('\n')
    const blob = new Blob([receipt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'agrohub-receipt-AH-1048.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Tractor size={18} /></span><span>Agro<span>Hub</span></span></div>
        <div className="workspace-label">FARM WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => setActive(id)}><Icon size={17} />{label}</button>)}
        </nav>
        <div className="sidebar-footer"><div className="avatar">AF</div><div><strong>AgroHub Farm</strong><small>Owner workspace</small></div><UserRound size={16} className="muted" /></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="eyebrow">THURSDAY, 09 OCTOBER 2026</p><h1>{active === 'overview' ? 'Good morning, Alex' : navItems.find((item) => item.id === active)?.label}</h1></div><div className="header-actions"><span className="secure-pill"><span className="status-dot" />Secure workspace</span><button className="google-button" onClick={signInWithGoogle}>Continue with Google</button></div></header>
        {authMessage && <div className="notice"><span>{authMessage}</span><button aria-label="Dismiss" onClick={() => setAuthMessage('')}><X size={15} /></button></div>}

        {active === 'overview' && <>
          <section className="hero-card"><div><span className="kicker">FARM OPERATIONS</span><h2>Everything your farm needs,<br /><em>in one calm place.</em></h2><p>Communicate with buyers, verify partners, and keep every delivery traceable.</p><button className="primary-button" onClick={() => setActive('messages')}>Open communications <span>→</span></button></div><div className="hero-orbit"><div className="orbit-center"><Tractor size={28} /></div><div className="orbit-node node-one"><ShieldCheck size={17} /></div><div className="orbit-node node-two"><ReceiptText size={17} /></div><div className="orbit-node node-three"><MapPin size={17} /></div></div></section>
          <div className="section-heading"><div><span className="kicker">AT A GLANCE</span><h2>Today&apos;s operations</h2></div><span className="last-sync">Last synced just now</span></div>
          <section className="stats-grid"><article className="stat-card"><span className="stat-icon green"><MessageCircle size={18} /></span><span className="stat-label">Unread messages</span><strong>04</strong><small className="positive">+2 since yesterday</small></article><article className="stat-card"><span className="stat-icon amber"><ShieldCheck size={18} /></span><span className="stat-label">KYC status</span><strong>{kycStatus === 'verified' ? 'Verified' : 'Pending'}</strong><small>{kycStatus === 'verified' ? 'Identity confirmed' : 'Action recommended'}</small></article><article className="stat-card"><span className="stat-icon blue"><ReceiptText size={18} /></span><span className="stat-label">This month</span><strong>$4,280</strong><small className="positive">+18.4% vs last month</small></article></section>
          <section className="lower-grid"><article className="panel preview-panel"><div className="panel-heading"><div><span className="kicker">LATEST TRANSACTION</span><h3>Green Basket Co.</h3></div><span className="paid-tag">Paid</span></div><div className="transaction-row"><div><span>Fresh tomatoes</span><small>120 kg · 08 Oct 2026</small></div><strong>$480.00</strong></div><button className="text-button" onClick={() => setActive('receipts')}>View transaction receipt <span>→</span></button></article><article className="panel"><div className="panel-heading"><div><span className="kicker">FIELD LOCATION</span><h3>{tracking ? 'Tracking active' : 'Ready to track'}</h3></div><MapPin className="panel-icon" size={20} /></div><div className="map-preview"><div className="map-grid" /><span className="map-pin"><MapPin size={20} /></span><span className="map-label">North field gate</span></div><button className="text-button" onClick={() => setActive('tracking')}>{tracking ? 'Manage live tracking' : 'Start location sharing'} <span>→</span></button></article></section>
        </>}

        {active === 'messages' && <section className="feature-layout"><article className="panel conversation-panel"><div className="conversation-header"><div className="contact-avatar">MB</div><div><h3>Maya from Green Basket</h3><small><span className="status-dot" />Online · Buyer</small></div></div><div className="messages">{messages.map((message, index) => <div className={`message ${message.from}`} key={`${message.time}-${index}`}><small>{message.name} · {message.time}</small><p>{message.text}</p></div>)}</div><div className="composer"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) sendMessage() }} placeholder="Write a message…" aria-label="Message" /><button onClick={sendMessage}>Send</button></div></article><aside className="panel side-panel"><span className="kicker">CONVERSATION SAFETY</span><h3>Verified partner</h3><p>Maya&apos;s identity and business documents were verified by AgroHub.</p><div className="check-row"><ShieldCheck size={16} />KYC verified</div><div className="check-row"><FileCheck2 size={16} />Trade history available</div></aside></section>}

        {active === 'kyc' && <section className="feature-layout"><article className="panel feature-card"><span className="feature-symbol amber"><ShieldCheck size={28} /></span><span className="kicker">IDENTITY & BUSINESS</span><h2>Automatic KYC verification</h2><p>Verify your identity once to build trust with buyers and unlock faster settlements. Your documents are encrypted and only shared with verified transaction partners.</p>{kycStatus === 'verified' ? <div className="success-state"><ShieldCheck size={22} /><div><strong>Verification complete</strong><span>Your AgroHub identity is verified.</span></div></div> : <button className="primary-button" onClick={startKyc}>{kycStatus === 'reviewing' ? 'Reviewing documents…' : 'Start verification'} <span>→</span></button>}</article><aside className="panel checklist"><span className="kicker">WHAT YOU&apos;LL NEED</span><h3>Three simple steps</h3>{['Government-issued ID','A clear selfie','Business or farm details'].map((item, index) => <div className="step" key={item}><span>{index + 1}</span><p>{item}<small>{index === 0 ? 'Passport or national ID' : index === 1 ? 'Takes less than a minute' : 'Name and operating location'}</small></p></div>)}</aside></section>}

        {active === 'receipts' && <section className="feature-layout"><article className="panel receipt-card"><div className="receipt-top"><div><span className="kicker">TRANSACTION RECEIPT</span><h2>Receipt #AH-1048</h2></div><span className="paid-tag">Paid</span></div><div className="receipt-meta"><span>FROM<strong>AgroHub Farm</strong></span><span>TO<strong>Green Basket Co.</strong></span><span>DATE<strong>08 Oct 2026</strong></span></div><div className="receipt-line"><span>Fresh tomatoes <small>120 kg</small></span><strong>$480.00</strong></div><div className="receipt-total"><span>Total paid</span><strong>$480.00</strong></div><button className="primary-button" onClick={downloadReceipt}>Download receipt <span>↓</span></button></article><aside className="panel side-panel"><span className="kicker">RECEIPT AUTOMATION</span><h3>Always ready to share</h3><p>AgroHub creates a tamper-evident receipt every time a transaction is completed.</p><div className="check-row"><FileCheck2 size={16} />Timestamped automatically</div><div className="check-row"><ShieldCheck size={16} />Verified transaction record</div></aside></section>}

        {active === 'tracking' && <section className="feature-layout"><article className="panel tracking-card"><div className="panel-heading"><div><span className="kicker">LIVE FIELD LOCATION</span><h2>{tracking ? 'Your location is visible' : 'Keep deliveries on track'}</h2></div><span className={`tracking-status ${tracking ? 'on' : ''}`}><span className="status-dot" />{tracking ? 'Live' : 'Off'}</span></div><div className="large-map"><div className="map-grid" /><span className="map-pin large"><MapPin size={30} /></span><span className="map-label large-label">{location}</span></div><button className="primary-button" onClick={toggleTracking}>{tracking ? 'Stop sharing location' : 'Share live location'} <span>{tracking ? '×' : '→'}</span></button></article><aside className="panel side-panel"><span className="kicker">PRIVACY CONTROLS</span><h3>You stay in control</h3><p>Location sharing is off by default and can be stopped at any time. Only active delivery participants can see it.</p><div className="check-row"><ShieldCheck size={16} />Private by default</div><div className="check-row"><MapPin size={16} />Shared only during delivery</div></aside></section>}
      </section>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 4).map(({ id, label, icon: Icon }) => (
          <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
            <Icon size={18} />
            <span>{label === 'KYC verification' ? 'KYC' : label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

// Keep the browser-only workspace interactive while the database schema is being provisioned.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
void supabase

