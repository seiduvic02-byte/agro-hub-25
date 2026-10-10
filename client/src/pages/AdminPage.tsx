import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, BadgeCheck, CircleHelp, ClipboardCheck, RefreshCw, ShieldCheck, Sprout, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/marketplace-format";
import { updatePageMetadata } from "@/lib/page-metadata";

function signIn() {
  void startLogin().catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "Sign-in is not available yet.");
  });
}

export default function AdminPage() {
  const auth = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const isAdmin = auth.data?.role === "admin";
  const utils = trpc.useUtils();
  const overview = trpc.marketplace.admin.overview.useQuery(undefined, { enabled: Boolean(isAdmin), retry: false });
  const queue = trpc.marketplace.admin.queue.useQuery(undefined, { enabled: Boolean(isAdmin), retry: false });
  const moderate = trpc.marketplace.admin.moderateListing.useMutation({
    onSuccess: async result => {
      toast.success(result.status === "active" ? "Listing approved and published" : "Listing returned for changes");
      await Promise.all([utils.marketplace.admin.queue.invalidate(), utils.marketplace.admin.overview.invalidate(), utils.marketplace.search.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });
  const verify = trpc.marketplace.admin.verifyProfile.useMutation({
    onSuccess: async () => {
      toast.success("Identity-review status updated");
      await Promise.all([utils.marketplace.admin.queue.invalidate(), utils.marketplace.admin.overview.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });
  const resolve = trpc.marketplace.admin.resolveReport.useMutation({
    onSuccess: async () => {
      toast.success("Report closed");
      await Promise.all([utils.marketplace.admin.queue.invalidate(), utils.marketplace.admin.overview.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });
  const acknowledgeDeletion = trpc.marketplace.admin.acknowledgeDeletion.useMutation({
    onSuccess: async () => {
      toast.success("Deletion request reviewed. No account data was deleted.");
      await Promise.all([utils.marketplace.admin.queue.invalidate(), utils.marketplace.admin.overview.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => updatePageMetadata("Agro Hub administration", "Review produce listings, seller identity status, marketplace reports and account requests.", true), []);
  if (auth.isLoading) return <div className="workspace-loading"><div className="loading-dots" />Checking administrator access…</div>;
  if (!auth.data) return <div className="workspace-auth-shell"><Link href="/" className="workspace-back"><ArrowLeft size={16} /> Agro Hub home</Link><div className="workspace-signin-card"><span className="workspace-brand-icon"><ShieldCheck size={25} /></span><span className="eyebrow">ADMINISTRATOR ACCESS</span><h1>Sign in to the <em>admin console.</em></h1><p>Review queues are available only to platform-assigned administrators.</p><button className="button button-primary" type="button" onClick={signIn}>Sign in with Manus <ArrowRight size={16} /></button></div></div>;
  if (!isAdmin) return <div className="workspace-auth-shell"><div className="workspace-signin-card"><span className="workspace-brand-icon"><ShieldCheck size={25} /></span><span className="eyebrow">RESTRICTED AREA</span><h1>Admin access <em>required.</em></h1><p>Your account doesn't have administrator permissions. This role is managed by the platform.</p><Link className="button button-primary" href="/workspace">Open my workspace <ArrowRight size={16} /></Link><Link className="text-link" href="/">Return to marketplace</Link></div></div>;

  const stats = [
    { label: "Marketplace members", value: overview.data?.users ?? 0, icon: Users },
    { label: "Live listings", value: overview.data?.activeListings ?? 0, icon: Sprout },
    { label: "Listings in review", value: overview.data?.pendingListings ?? 0, icon: ClipboardCheck },
    { label: "Open reports", value: overview.data?.openReports ?? 0, icon: CircleHelp },
    { label: "Deletion requests", value: overview.data?.openDeletionRequests ?? 0, icon: Trash2 },
  ];

  return (
    <div className="admin-shell">
      <header className="admin-topbar"><div className="page-wrap admin-topbar-inner">
        <Link href="/" className="brand-lockup"><span className="admin-brand-icon"><Sprout size={20} /></span><span className="brand-wordmark">agro<span>hub</span><small>ADMINISTRATION</small></span></Link>
        <div className="admin-tools"><span className="admin-role-chip"><ShieldCheck size={14} />Platform administrator</span><Link className="button button-outline button-small" href="/">Public marketplace <ArrowRight size={14} /></Link></div>
      </div></header>
      <main className="admin-main page-wrap">
        <div className="admin-heading"><div><span className="eyebrow">MARKETPLACE OPERATIONS</span><h1>Review with <em>care.</em></h1><p>Queues and counts below come from persistent marketplace records; no sample inventory is included.</p></div><button type="button" className="icon-button" aria-label="Refresh queue" onClick={() => { void overview.refetch(); void queue.refetch(); }}><RefreshCw size={17} /></button></div>
        <div className="admin-stat-grid">{stats.map(({ label, value, icon: Icon }) => <article className="admin-stat-card" key={label}><span className="admin-stat-icon"><Icon size={18} /></span><span>{label}</span><strong>{overview.isLoading ? "—" : value.toLocaleString()}</strong></article>)}</div>
        <div className="admin-queue-grid">
          <section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">PUBLISHING QUEUE</span><h2>Listings to review</h2></div><span className="admin-queue-count">{queue.data?.pendingListings.length ?? 0}</span></div>
            {queue.data?.pendingListings.length ? queue.data.pendingListings.map(item => <article className="admin-queue-item" key={item.id}><div className="queue-item-icon"><Sprout size={18} /></div><div className="queue-item-body"><div className="queue-item-title"><div><strong>{item.title}</strong><small>{item.category} · {item.quantityAvailable.toLocaleString()} {item.quantityUnit} · {item.location}</small></div><small>{formatDate(item.createdAt)}</small></div><p>Submitted by {item.sellerName} · profile #{item.sellerUserId}</p><div className="workspace-card-actions"><button className="button button-primary button-small" type="button" disabled={moderate.isPending} onClick={() => moderate.mutate({ listingId: item.id, decision: "approve" })}>Approve listing</button><button className="button button-soft button-small" type="button" disabled={moderate.isPending} onClick={() => moderate.mutate({ listingId: item.id, decision: "reject" })}>Request changes</button></div></div></article>) : <div className="admin-empty"><ClipboardCheck size={20} /><span>No listings waiting for review.</span></div>}
          </section>
          <section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">SELLER IDENTITY</span><h2>Profiles to review</h2></div><span className="admin-queue-count">{queue.data?.pendingProfiles.length ?? 0}</span></div>
            {queue.data?.pendingProfiles.length ? queue.data.pendingProfiles.map(item => <article className="admin-queue-item" key={item.userId}><div className="queue-item-icon"><BadgeCheck size={18} /></div><div className="queue-item-body"><div className="queue-item-title"><div><strong>{item.displayName}</strong><small>{item.accountType} · {item.location}</small></div></div><p>Profile updated {formatDate(item.createdAt)}. The status indicates review, not a product guarantee.</p><div className="workspace-card-actions"><button className="button button-primary button-small" type="button" disabled={verify.isPending} onClick={() => verify.mutate({ userId: item.userId, status: "verified" })}>Mark reviewed</button><button className="button button-soft button-small" type="button" disabled={verify.isPending} onClick={() => verify.mutate({ userId: item.userId, status: "needs_changes" })}>Request changes</button></div></div></article>) : <div className="admin-empty"><BadgeCheck size={20} /><span>No identity reviews are pending.</span></div>}
          </section>
          <section className="admin-panel admin-reports-panel"><div className="panel-heading"><div><span className="eyebrow">MARKETPLACE CARE</span><h2>Open reports</h2></div><span className="admin-queue-count">{queue.data?.reports.length ?? 0}</span></div>
            {queue.data?.reports.length ? queue.data.reports.map(item => <article className="admin-queue-item" key={item.id}><div className="queue-item-icon queue-report-icon"><CircleHelp size={18} /></div><div className="queue-item-body"><div className="queue-item-title"><strong>{item.reason}</strong><small>{formatDate(item.createdAt)}</small></div><p>{item.details || "No additional report details."}</p><small>{item.listingId ? `Listing #${item.listingId}` : "General seller report"}{item.reportedUserId ? ` · Member #${item.reportedUserId}` : ""}{item.conversationId ? ` · Conversation #${item.conversationId}` : ""}</small><div className="workspace-card-actions"><button className="button button-outline button-small" type="button" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: item.id, status: "resolved" })}>Resolve</button><button className="button button-soft button-small" type="button" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: item.id, status: "dismissed" })}>Dismiss</button></div></div></article>) : <div className="admin-empty"><ShieldCheck size={20} /><span>No open reports.</span></div>}
          </section>
          <section className="admin-panel admin-deletion-panel"><div className="panel-heading"><div><span className="eyebrow">ACCOUNT CONTROL</span><h2>Deletion requests</h2></div><span className="admin-queue-count">{queue.data?.deletionRequests.length ?? 0}</span></div>
            <p className="admin-deletion-note">Restricted to platform-assigned administrators. Acknowledging a request records review only; it does not delete the account or transaction history.</p>
            {queue.data?.deletionRequests.length ? queue.data.deletionRequests.map(item => <article className="admin-queue-item" key={item.id}><div className="queue-item-icon queue-report-icon"><Trash2 size={18} /></div><div className="queue-item-body"><div className="queue-item-title"><div><strong>{item.userName || `Member #${item.userId}`}</strong><small>Member #{item.userId} · requested {formatDate(item.requestedAt)}</small></div><small>Open</small></div><div className="workspace-card-actions"><button className="button button-outline button-small" type="button" disabled={acknowledgeDeletion.isPending} onClick={() => acknowledgeDeletion.mutate({ id: item.id })}>Acknowledge review</button></div></div></article>) : <div className="admin-empty"><ShieldCheck size={20} /><span>No account deletion requests are waiting for review.</span></div>}
          </section>
        </div>
        <p className="admin-payment-note"><CircleHelp size={15} />Payment records in this version remain not connected; administration cannot mark a transaction paid.</p>
      </main>
    </div>
  );
}
