import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CircleHelp, Cookie, Download, LockKeyhole, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { COOKIE_PREFERENCES_OPEN_EVENT, readCookiePreferences } from "@/lib/cookie-preferences";

type PrivacyForm = {
  profileVisible: boolean;
  showDisplayName: boolean;
  showBusinessName: boolean;
  showLocation: boolean;
  showBio: boolean;
  contactInfo: string;
  showContactInfo: boolean;
  shareBusinessWithSellers: boolean;
  activityEmails: boolean;
  marketingEmails: boolean;
};

const emptyPrivacyForm: PrivacyForm = {
  profileVisible: false,
  showDisplayName: false,
  showBusinessName: false,
  showLocation: false,
  showBio: false,
  contactInfo: "",
  showContactInfo: false,
  shareBusinessWithSellers: false,
  activityEmails: false,
  marketingEmails: false,
};

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="privacy-toggle-row">
      <span className="privacy-toggle-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="privacy-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          aria-label={label}
        />
        <i aria-hidden="true" />
      </span>
    </label>
  );
}

function PrivacyPanel({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`workspace-panel privacy-panel ${className}`}>
      <div className="privacy-panel-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function PrivacyCenter({
  onEditProfile,
  onViewTransactions,
}: {
  onEditProfile: () => void;
  onViewTransactions: () => void;
}) {
  const utils = trpc.useUtils();
  const profile = trpc.marketplace.profile.useQuery(undefined, { retry: false });
  const deletion = trpc.marketplace.account.deletionRequest.useQuery(undefined, { retry: false });
  const blockedUsers = trpc.marketplace.conversations.blockedUsers.useQuery(undefined, { retry: false });
  const [form, setForm] = useState<PrivacyForm>(emptyPrivacyForm);

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      profileVisible: profile.data.profileVisible,
      showDisplayName: profile.data.showDisplayName,
      showBusinessName: profile.data.showBusinessName,
      showLocation: profile.data.showLocation,
      showBio: profile.data.showBio,
      contactInfo: profile.data.contactInfo ?? "",
      showContactInfo: profile.data.showContactInfo,
      shareBusinessWithSellers: profile.data.shareBusinessWithSellers,
      activityEmails: profile.data.activityEmails,
      marketingEmails: profile.data.marketingEmails,
    });
  }, [profile.data]);

  const savePrivacy = trpc.marketplace.privacy.update.useMutation({
    onSuccess: async () => {
      toast.success("Privacy and notification preferences saved");
      await Promise.all([
        utils.marketplace.profile.invalidate(),
        utils.marketplace.search.invalidate(),
        utils.marketplace.listingBySlug.invalidate(),
        utils.marketplace.sellerById.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const exportData = trpc.marketplace.privacy.exportMine.useQuery(undefined, {
    enabled: false,
    retry: false,
  });
  const requestDeletion = trpc.marketplace.account.requestDeletion.useMutation({
    onSuccess: async () => {
      toast.success("Account deletion request submitted for review");
      await utils.marketplace.account.deletionRequest.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const cancelDeletion = trpc.marketplace.account.cancelDeletion.useMutation({
    onSuccess: async () => {
      toast.success("Deletion request withdrawn");
      await utils.marketplace.account.deletionRequest.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const unblock = trpc.marketplace.conversations.unblock.useMutation({
    onSuccess: async () => {
      toast.success("Member unblocked");
      await Promise.all([
        utils.marketplace.conversations.blockedUsers.invalidate(),
        utils.marketplace.conversations.list.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });

  const update = (key: keyof PrivacyForm, value: boolean | string) => {
    setForm(current => ({ ...current, [key]: value }));
  };
  const submitPrivacy = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    savePrivacy.mutate(form);
  };
  const downloadMyData = async () => {
    try {
      const result = await exportData.refetch();
      if (!result.data) throw new Error("No export data was returned");
      const payload = {
        ...result.data,
        localCookiePreferences: readCookiePreferences(),
        exportNote: "Order/payment entries are marketplace records only. Agro Hub does not process or confirm payments in this version.",
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `agro-hub-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data export has been downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your data export could not be created");
    }
  };
  const openCookies = () => window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
  const deletionStatus = deletion.data?.status;
  const deletionIsActive = deletionStatus === "open" || deletionStatus === "acknowledged";

  if (profile.isLoading) {
    return <div className="workspace-loading"><div className="loading-dots" />Loading privacy settings…</div>;
  }
  if (!profile.data) {
    return <div className="inline-notice">Create a marketplace profile before managing profile privacy settings.</div>;
  }

  return (
    <section className="workspace-content privacy-center">
      <div className="panel-heading panel-heading-wide">
        <div>
          <span className="eyebrow">YOUR SETTINGS, YOUR CHOICE</span>
          <h2>Privacy &amp; data</h2>
          <p>Choose what others can see, manage how we contact you, and request a copy or review of your account data.</p>
        </div>
        <ShieldCheck className="privacy-heading-icon" size={28} />
      </div>

      <div className="privacy-center-grid">
        <form className="workspace-panel privacy-panel privacy-form-panel" onSubmit={submitPrivacy}>
          <div className="privacy-panel-heading">
            <span className="eyebrow">PROFILE VISIBILITY</span>
            <h3>{profile.data.accountType === "seller" ? "Seller profile" : "Buyer profile"}</h3>
            <p>
              {profile.data.accountType === "seller"
                ? "Your public profile is separate from individual public listings. Hidden fields are filtered by the server from public pages and search results."
                : "Buyer profiles are not published as public profile pages. You can choose whether to share your business name with sellers handling your requests."}
            </p>
          </div>

          {profile.data.accountType === "seller" ? (
            <div className="privacy-toggle-list">
              <ToggleRow
                label="Make my seller profile public"
                detail="Allow a public grower profile page to appear when you have live listings. Turn off to hide your profile page and identity from public results."
                checked={form.profileVisible}
                onChange={value => update("profileVisible", value)}
              />
              <ToggleRow label="Display my name" detail="Show your display name on public listings and profile." checked={form.showDisplayName} onChange={value => update("showDisplayName", value)} />
              <ToggleRow label="Display my farm or business name" detail="Show the business name on public listings and profile." checked={form.showBusinessName} onChange={value => update("showBusinessName", value)} />
              <ToggleRow label="Display my profile location" detail="Show the location from your seller profile. Listing locations remain part of each public listing." checked={form.showLocation} onChange={value => update("showLocation", value)} />
              <ToggleRow label="Display my introduction" detail="Show your seller-profile bio to marketplace visitors." checked={form.showBio} onChange={value => update("showBio", value)} />
              <label className="field-label privacy-contact-field">
                Contact information <span className="optional-label">Optional</span>
                <input maxLength={240} value={form.contactInfo} onChange={event => update("contactInfo", event.target.value)} placeholder="Phone, email or preferred contact method" />
                <small>This information is private unless you turn on the control below.</small>
              </label>
              <ToggleRow label="Display my contact information publicly" detail="Allow this contact field to appear on your public seller profile. Keep it off to use in-app conversations only." checked={form.showContactInfo} onChange={value => update("showContactInfo", value)} />
            </div>
          ) : (
            <div className="privacy-toggle-list">
              <ToggleRow label="Share my business name with sellers" detail="Sellers handling your purchase requests may see your business name. This does not publish a public buyer profile." checked={form.shareBusinessWithSellers} onChange={value => update("shareBusinessWithSellers", value)} />
            </div>
          )}

          <div className="privacy-divider" />
          <div className="privacy-panel-heading">
            <span className="eyebrow">NOTIFICATIONS</span>
            <h3>Email preferences</h3>
            <p>Agro Hub does not currently send activity or marketing emails. These choices are saved for future use only; turning them on does not send email today. Transactional messages remain available in your workspace.</p>
          </div>
          <div className="privacy-toggle-list">
            <ToggleRow label="Activity emails" detail="Saved preference only; Agro Hub currently does not send activity emails." checked={form.activityEmails} onChange={value => update("activityEmails", value)} />
            <ToggleRow label="Marketing emails" detail="Saved preference only; Agro Hub currently does not send marketing emails." checked={form.marketingEmails} onChange={value => update("marketingEmails", value)} />
          </div>
          <div className="privacy-save-row">
            <span className="quiet-note">Changes are saved to your account.</span>
            <button className="button button-primary" type="submit" disabled={savePrivacy.isPending}>
              {savePrivacy.isPending ? "Saving…" : "Save privacy settings"} <ArrowRight size={15} />
            </button>
          </div>
        </form>

        <div className="privacy-side-stack">
          <PrivacyPanel eyebrow="ACCOUNT DETAILS" title="Personal information">
            <p className="privacy-card-copy">Edit your name, business name, location and introduction. Your account type is fixed after profile creation.</p>
            <button className="button button-outline button-small" type="button" onClick={onEditProfile}><UserRound size={15} /> Edit personal information</button>
          </PrivacyPanel>

          <PrivacyPanel eyebrow="DATA ACCESS" title="Download your information">
            <p className="privacy-card-copy">Get a JSON copy of your profile, listings, saved growers, requests, order/payment records, conversations, reports, blocks and preferences.</p>
            <button className="button button-outline button-small" type="button" onClick={() => void downloadMyData()} disabled={exportData.isFetching}>
              <Download size={15} /> {exportData.isFetching ? "Preparing export…" : "Download my data"}
            </button>
          </PrivacyPanel>

          <PrivacyPanel eyebrow="COOKIE CHOICES" title="Manage this browser">
            <p className="privacy-card-copy">Necessary cookies support sign-in and security. Optional analytics and marketing choices are stored on this device and default to off.</p>
            <button className="button button-outline button-small" type="button" onClick={openCookies}><Cookie size={15} /> Cookie preferences</button>
          </PrivacyPanel>

          <PrivacyPanel eyebrow="SECURITY" title="Manage account credentials">
            <p className="privacy-card-copy">Sign-in is handled by your Manus account. Agro Hub does not store a separate password or credential.</p>
            <a className="button button-outline button-small" href="https://manus.im" rel="noreferrer">
              <LockKeyhole size={15} /> Open Manus account <ArrowRight size={14} />
            </a>
          </PrivacyPanel>

          <PrivacyPanel eyebrow="PAYMENT RECORDS" title="View transactions">
            <p className="privacy-card-copy">Order totals and payment-status fields are records only. No payment provider is connected, and Agro Hub cannot mark a transfer as paid.</p>
            <button className="button button-outline button-small" type="button" onClick={onViewTransactions}><CircleHelp size={15} /> View order/payment records</button>
          </PrivacyPanel>

          <PrivacyPanel eyebrow="CHAT CONTROLS" title="Blocked members">
            <p className="privacy-card-copy">Blocking prevents new requests and messages between you and that member. Your existing records are retained.</p>
            {blockedUsers.isLoading ? <small className="quiet-note">Loading blocked members…</small> : blockedUsers.data?.length ? (
              <ul className="blocked-member-list">
                {blockedUsers.data.map(member => (
                  <li key={member.userId}>
                    <span><strong>{member.businessName || member.displayName || `Member #${member.userId}`}</strong><small>Blocked {new Date(member.createdAt).toLocaleDateString()}</small></span>
                    <button className="button button-soft button-small" type="button" disabled={unblock.isPending} onClick={() => unblock.mutate({ userId: member.userId })}>Unblock</button>
                  </li>
                ))}
              </ul>
            ) : <small className="quiet-note">You have not blocked any members.</small>}
          </PrivacyPanel>

          <PrivacyPanel eyebrow="ACCOUNT CONTROL" title="Request account deletion" className="privacy-deletion-panel">
            <p className="privacy-card-copy">Submit a deletion request for administrator review. This creates a request record only; it does not immediately delete your account or order/payment history.</p>
            {deletionIsActive && <p className="privacy-deletion-status"><ShieldCheck size={15} /> Request {deletion.data?.id} is {deletionStatus}. You can withdraw it here.</p>}
            {deletionStatus === "cancelled" && <p className="quiet-note">Your latest deletion request was withdrawn. You may submit another if needed.</p>}
            <div className="privacy-delete-actions">
              {deletionIsActive ? (
                <button className="button button-soft button-small" type="button" disabled={cancelDeletion.isPending} onClick={() => {
                  if (window.confirm("Withdraw your account deletion request? No account data will be deleted by this action.")) cancelDeletion.mutate();
                }}>
                  {cancelDeletion.isPending ? "Withdrawing…" : "Withdraw request"}
                </button>
              ) : (
                <button className="button button-danger-outline button-small" type="button" disabled={requestDeletion.isPending || deletion.isLoading} onClick={() => {
                  if (window.confirm("Submit an account deletion request for administrator review? This will not delete your account or transaction history automatically.")) requestDeletion.mutate();
                }}>
                  <Trash2 size={15} /> {requestDeletion.isPending ? "Submitting…" : "Request account deletion"}
                </button>
              )}
            </div>
          </PrivacyPanel>
        </div>
      </div>
      <p className="privacy-footer-note"><ShieldCheck size={15} /> Privacy settings are enforced by the server for public seller profiles, search results and in-app sharing. Administrators retain restricted role-based access to operational review queues.</p>
    </section>
  );
}
