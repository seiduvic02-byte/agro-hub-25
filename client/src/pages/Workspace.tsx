import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Heart,
  Inbox,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Store,
  UserRound,
  Wheat,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import PrivacyCenter from "@/components/PrivacyCenter";
import { formatDate, formatNaira } from "@/lib/marketplace-format";
import { marketplaceCategories } from "@shared/marketplace";
import { updatePageMetadata } from "@/lib/page-metadata";

type WorkspaceTab =
  | "overview"
  | "listings"
  | "requests"
  | "orders"
  | "messages"
  | "saved"
  | "profile"
  | "privacy";
type ListingFormValues = {
  title: string;
  category: string;
  priceNaira: string;
  priceUnit: string;
  quantityAvailable: string;
  quantityUnit: string;
  minimumOrder: string;
  location: string;
  description: string;
  imageUrl: string;
};
type EditableListing = {
  id: number;
  title: string;
  category: string;
  priceMinor: number;
  priceUnit: string;
  quantityAvailable: number;
  quantityUnit: string;
  minimumOrder: number;
  location: string;
  description: string;
  imageUrl: string | null;
  status: string;
};

const photoChoices = [
  ["/produce/tomatoes.jpg", "Tomatoes"],
  ["/produce/rice.jpg", "Rice"],
  ["/produce/cassava.jpg", "Cassava"],
  ["/produce/pepper.jpg", "Peppers"],
  ["/produce/maize.jpg", "Maize"],
  ["/produce/plantain.jpg", "Plantain"],
  ["/produce/okra.jpg", "Okra"],
  ["/produce/sorghum.jpg", "Grains"],
] as const;

  function accountPath(role: string) {
  return role === "seller" ? "Farmer workspace" : "Buyer workspace";
}

function StatusBadge({ value }: { value: string }) {
  const labels: Record<string, string> = {
    pending: "In review",
    active: "Live",
    paused: "Paused",
    rejected: "Needs changes",
    accepted: "Accepted",
    declined: "Declined",
    cancelled: "Cancelled",
    confirmed: "Order confirmed",
    preparing: "Preparing",
    ready: "Ready for pickup",
    in_transit: "In transit",
    completed: "Completed",
    not_started: "Not reviewed",
    verified: "Identity reviewed",
    needs_changes: "Update requested",
    open: "Open",
  };
  const tone = ["active", "accepted", "verified", "completed"].includes(value)
    ? "success"
    : [
          "pending",
          "confirmed",
          "preparing",
          "ready",
          "in_transit",
          "open",
        ].includes(value)
      ? "pending"
      : "muted";
  return (
    <span className={`status-badge status-${tone}`}>
      <i />
      {labels[value] ?? value.replaceAll("_", " ")}
    </span>
  );
}

function ProfileSetup({
  name,
  onComplete,
  loading,
}: {
  name: string;
  onComplete: () => void;
  loading: boolean;
}) {
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [displayName, setDisplayName] = useState(name || "");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const save = trpc.marketplace.saveProfile.useMutation({
    onSuccess: async () => {
      toast.success("Your marketplace profile is ready");
      await onComplete();
    },
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ accountType, displayName, businessName, location, bio });
  };
  return (
    <div className="profile-setup-card">
      <div className="setup-intro">
        <span className="eyebrow">WELCOME TO AGRO HUB</span>
        <h1>
          Let's get you <em>started.</em>
        </h1>
        <p>
          Choose how you'll use the marketplace. You can update your profile
          details later.
        </p>
      </div>
      <form className="form-stack" onSubmit={submit}>
        <fieldset className="role-choice-field">
          <legend className="field-label">I want to…</legend>
          <div className="role-choice-grid">
            <button
              type="button"
              className={`role-choice ${accountType === "buyer" ? "selected" : ""}`}
              onClick={() => setAccountType("buyer")}
            >
              <ShoppingChoice
                icon={<Store size={21} />}
                title="Buy produce"
                copy="Find crops and request quantities."
              />
            </button>
            <button
              type="button"
              className={`role-choice ${accountType === "seller" ? "selected" : ""}`}
              onClick={() => setAccountType("seller")}
            >
              <ShoppingChoice
                icon={<Sprout size={21} />}
                title="Sell my harvest"
                copy="List what you're growing."
              />
            </button>
          </div>
        </fieldset>
        <label className="field-label">
          Your name
          <input
            required
            minLength={2}
            maxLength={160}
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
            placeholder="Name to show on your profile"
          />
        </label>
        {accountType === "seller" && (
          <label className="field-label">
            Farm or business name{" "}
            <span className="optional-label">Optional</span>
            <input
              maxLength={180}
              value={businessName}
              onChange={event => setBusinessName(event.target.value)}
              placeholder="Your farm or cooperative"
            />
          </label>
        )}
        <label className="field-label">
          State or town
          <input
            required
            minLength={2}
            maxLength={120}
            value={location}
            onChange={event => setLocation(event.target.value)}
            placeholder="e.g. Kaduna, Kaduna State"
          />
        </label>
        <label className="field-label">
          A short introduction <span className="optional-label">Optional</span>
          <textarea
            rows={3}
            maxLength={1200}
            value={bio}
            onChange={event => setBio(event.target.value)}
            placeholder={
              accountType === "seller"
                ? "What do you grow and when is it available?"
                : "What are you looking to source?"
            }
          />
        </label>
        <p className="quiet-note">
          <ShieldCheck size={15} />
          Administrator status is assigned by the platform and cannot be
          selected here.
        </p>
        <button
          className="button button-primary button-wide"
          type="submit"
          disabled={save.isPending || loading}
        >
          {save.isPending ? (
            "Saving profile…"
          ) : (
            <>
              Create my {accountType === "seller" ? "farmer" : "buyer"} profile{" "}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function ShoppingChoice({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <>
      <span className="choice-icon">{icon}</span>
      <strong>{title}</strong>
      <small>{copy}</small>
    </>
  );
}

function ListingEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: EditableListing;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const defaultValues: ListingFormValues = initial
    ? {
        title: initial.title,
        category: initial.category,
        priceNaira: String(initial.priceMinor / 100),
        priceUnit: initial.priceUnit,
        quantityAvailable: String(initial.quantityAvailable),
        quantityUnit: initial.quantityUnit,
        minimumOrder: String(initial.minimumOrder),
        location: initial.location,
        description: initial.description,
        imageUrl: initial.imageUrl || "/produce/tomatoes.jpg",
      }
    : {
        title: "",
        category: "Vegetables",
        priceNaira: "",
        priceUnit: "kg",
        quantityAvailable: "",
        quantityUnit: "kg",
        minimumOrder: "1",
        location: "",
        description: "",
        imageUrl: "/produce/tomatoes.jpg",
      };
  const [values, setValues] = useState(defaultValues);
  const utils = trpc.useUtils();
  const onSuccess = async () => {
    toast.success(
      initial ? "Listing updated" : "Listing submitted for review",
      {
        description:
          "Edits and new listings are reviewed before appearing as live stock.",
      }
    );
    await utils.marketplace.myListings.invalidate();
    await utils.marketplace.search.invalidate();
    onSaved();
  };
  const create = trpc.marketplace.createListing.useMutation({
    onSuccess,
    onError: error => toast.error(error.message),
  });
  const update = trpc.marketplace.updateListing.useMutation({
    onSuccess,
    onError: error => toast.error(error.message),
  });
  const set = (key: keyof ListingFormValues, value: string) =>
    setValues(current => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      title: values.title,
      category: values.category,
      priceNaira: Number(values.priceNaira),
      priceUnit: values.priceUnit,
      quantityAvailable: Number(values.quantityAvailable),
      quantityUnit: values.quantityUnit,
      minimumOrder: Number(values.minimumOrder),
      location: values.location,
      description: values.description,
      imageUrl: values.imageUrl,
    };
    if (initial) update.mutate({ id: initial.id, ...payload });
    else create.mutate(payload);
  };
  const isPending = create.isPending || update.isPending;
  return (
    <form className="form-stack listing-editor" onSubmit={submit}>
      <div className="editor-heading">
        <span className="eyebrow">
          {initial ? "UPDATE YOUR OFFER" : "NEW PRODUCE LISTING"}
        </span>
        <h2>{initial ? "Edit listing" : "Tell buyers what's growing."}</h2>
        <p>
          New listings and material edits go to review before they appear
          publicly.
        </p>
      </div>
      <label className="field-label">
        Produce name
        <input
          required
          minLength={3}
          maxLength={180}
          value={values.title}
          onChange={event => set("title", event.target.value)}
          placeholder="e.g. Fresh field tomatoes"
        />
      </label>
      <div className="form-row">
        <label className="field-label">
          Category
          <select
            value={values.category}
            onChange={event => set("category", event.target.value)}
          >
            {marketplaceCategories
              .filter(item => item !== "All produce")
              .map(item => (
                <option key={item}>{item}</option>
              ))}
          </select>
        </label>
        <label className="field-label">
          Location
          <input
            required
            minLength={2}
            maxLength={120}
            value={values.location}
            onChange={event => set("location", event.target.value)}
            placeholder="State or town"
          />
        </label>
      </div>
      <div className="form-row form-row-three">
        <label className="field-label">
          Price (₦)
          <input
            type="number"
            min="1"
            step="1"
            required
            value={values.priceNaira}
            onChange={event => set("priceNaira", event.target.value)}
            placeholder="e.g. 1200"
          />
        </label>
        <label className="field-label">
          Price unit
          <input
            required
            maxLength={40}
            value={values.priceUnit}
            onChange={event => set("priceUnit", event.target.value)}
            placeholder="kg"
          />
        </label>
        <label className="field-label">
          Available quantity
          <input
            type="number"
            min="1"
            step="1"
            required
            value={values.quantityAvailable}
            onChange={event => set("quantityAvailable", event.target.value)}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="field-label">
          Quantity unit
          <input
            required
            maxLength={30}
            value={values.quantityUnit}
            onChange={event => set("quantityUnit", event.target.value)}
            placeholder="kg"
          />
        </label>
        <label className="field-label">
          Minimum order
          <input
            type="number"
            min="1"
            step="1"
            required
            value={values.minimumOrder}
            onChange={event => set("minimumOrder", event.target.value)}
          />
        </label>
      </div>
      <label className="field-label">
        Crop reference image
        <select
          value={values.imageUrl}
          onChange={event => set("imageUrl", event.target.value)}
        >
          {photoChoices.map(([url, label]) => (
            <option key={url} value={url}>
              {label}
            </option>
          ))}
        </select>
        <small>
          This is an illustrative crop image, not a photograph of your specific
          harvest.
        </small>
      </label>
      <label className="field-label">
        Description
        <textarea
          required
          minLength={8}
          maxLength={4000}
          rows={4}
          value={values.description}
          onChange={event => set("description", event.target.value)}
          placeholder="Share the grade, harvest timing, packing, or pickup details."
        />
      </label>
      <p className="quiet-note">
        <CircleHelp size={15} />
        Prices are shown as per the price unit you choose. Buyers arrange
        payment with you separately.
      </p>
      <div className="form-actions">
        <button type="button" className="button button-soft" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="button button-primary"
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Saving…"
            : initial
              ? "Save changes"
              : "Submit for review"}
        </button>
      </div>
    </form>
  );
}

function EmptyPanel({
  icon,
  title,
  copy,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-panel">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function OrderCard({
  order,
  accountType,
  onStatus,
}: {
  order: {
    id: number;
    orderNumber: string;
    listingTitle: string;
    listingSlug: string;
    quantity: number;
    quantityUnit: string;
    totalMinor: number;
    status: string;
    createdAt: Date | string;
    otherPartyName: string | null;
    paymentStatus: string | null;
  };
  accountType: "buyer" | "seller";
  onStatus: (
    id: number,
    status: "preparing" | "ready" | "in_transit" | "completed" | "cancelled"
  ) => void;
}) {
  const timeline = trpc.marketplace.orders.timeline.useQuery(
    { orderId: order.id },
    { retry: false }
  );
  const nextSellerStatus: Record<
    string,
    "preparing" | "ready" | "in_transit" | "completed" | undefined
  > = {
    confirmed: "preparing",
    preparing: "ready",
    ready: "in_transit",
    in_transit: "completed",
  };
  const next = nextSellerStatus[order.status];
  return (
    <article className="workspace-card order-card">
      <div className="workspace-card-head">
        <div>
          <span className="order-number">{order.orderNumber}</span>
          <h3>{order.listingTitle}</h3>
        </div>
        <StatusBadge value={order.status} />
      </div>
      <div className="order-meta">
        <span>
          {order.quantity.toLocaleString()} {order.quantityUnit}
        </span>
        <span>
          {accountType === "buyer" ? "Seller" : "Buyer"}:{" "}
          {order.otherPartyName || "Marketplace member"}
        </span>
        <span>{formatDate(order.createdAt)}</span>
      </div>
      <div className="order-card-bottom">
        <strong>{formatNaira(order.totalMinor / 100)}</strong>
        <span className="payment-status">
          <CircleHelp size={14} />
          Payment{" "}
          {order.paymentStatus === "pending" ? "pending" : "not connected"}
        </span>
      </div>
      <div className="timeline-list">
        {timeline.data?.map((event, index) => (
          <span key={`${event.toStatus}-${index}`}>
            <i />
            {event.toStatus.replaceAll("_", " ")}
            <small>{formatDate(event.createdAt)}</small>
          </span>
        ))}
      </div>
      <div className="workspace-card-actions">
        {accountType === "seller" && next && (
          <button
            className="button button-outline button-small"
            type="button"
            onClick={() => onStatus(order.id, next)}
          >
            Mark {next.replaceAll("_", " ")} <ChevronRight size={14} />
          </button>
        )}
        {accountType === "buyer" && order.status === "confirmed" && (
          <button
            className="button button-outline button-small"
            type="button"
            onClick={() => onStatus(order.id, "cancelled")}
          >
            Cancel order
          </button>
        )}
        <Link className="text-link" href={`/produce/${order.listingSlug}`}>
          View produce <ArrowRight size={15} />
        </Link>
      </div>
      <p className="payment-disclaimer">
        Payment is not collected or confirmed by Agro Hub. Arrange it directly
        with the seller.
      </p>
    </article>
  );
}

export default function Workspace() {
  const [profileType, setProfileType] = useState<"farmer" | "buyer">("farmer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  const auth = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const profile = trpc.marketplace.profile.useQuery(undefined, {
    enabled: Boolean(auth.data),
    retry: false,
  });
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [listingEditor, setListingEditor] = useState<
    EditableListing | "new" | null
  >(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [messageBody, setMessageBody] = useState("");
  const [reportConversationId, setReportConversationId] = useState<number | null>(null);
  const [chatReportReason, setChatReportReason] = useState("Unwanted contact or harassment");
  const [chatReportDetails, setChatReportDetails] = useState("");
  const utils = trpc.useUtils();
  const isSeller = profile.data?.accountType === "seller";
  const isBuyer = profile.data?.accountType === "buyer";
  const listings = trpc.marketplace.myListings.useQuery(undefined, {
    enabled: Boolean(isSeller),
    retry: false,
  });
  const requests = trpc.marketplace.requests.mine.useQuery(undefined, {
    enabled: Boolean(profile.data),
    retry: false,
  });
  const orders = trpc.marketplace.orders.mine.useQuery(undefined, {
    enabled: Boolean(profile.data),
    retry: false,
  });
  const saved = trpc.marketplace.savedSuppliers.list.useQuery(undefined, {
    enabled: Boolean(isBuyer),
    retry: false,
  });
  const conversations = trpc.marketplace.conversations.list.useQuery(
    undefined,
    {
      enabled: Boolean(profile.data),
      retry: false,
      refetchInterval: tab === "messages" ? 15_000 : false,
    }
  );
  useEffect(() => {
    updatePageMetadata(
      "Your Agro Hub workspace",
      "Manage marketplace listings, purchase requests, orders, saved growers, and conversations.",
      true
    );
  }, []);
  useEffect(() => {
    if (selectedConversationId === null && conversations.data?.length)
      setSelectedConversationId(conversations.data[0]!.id);
  }, [conversations.data, selectedConversationId]);
  const messages = trpc.marketplace.conversations.messages.useQuery(
    { conversationId: selectedConversationId ?? 0 },
    {
      enabled: selectedConversationId !== null,
      retry: false,
      refetchInterval: tab === "messages" ? 5_000 : false,
    }
  );
  const sendMessage = trpc.marketplace.conversations.send.useMutation({
    onSuccess: async () => {
      setMessageBody("");
      await utils.marketplace.conversations.messages.invalidate();
      await utils.marketplace.conversations.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const reportConversation = trpc.marketplace.report.useMutation({
    onSuccess: () => {
      toast.success("Conversation report sent for administrator review");
      setReportConversationId(null);
      setChatReportDetails("");
    },
    onError: error => toast.error(error.message),
  });
  const blockConversation = trpc.marketplace.conversations.block.useMutation({
    onSuccess: async () => {
      toast.success("Member blocked; new requests and messages are disabled");
      await Promise.all([
        utils.marketplace.conversations.list.invalidate(),
        utils.marketplace.conversations.blockedUsers.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const unblockConversation = trpc.marketplace.conversations.unblock.useMutation({
    onSuccess: async () => {
      toast.success("Member unblocked");
      await Promise.all([
        utils.marketplace.conversations.list.invalidate(),
        utils.marketplace.conversations.blockedUsers.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const respondRequest = trpc.marketplace.requests.respond.useMutation({
    onSuccess: async result => {
      toast.success(
        result.status === "accepted"
          ? "Request accepted; an order was created."
          : "Request declined."
      );
      await utils.marketplace.requests.mine.invalidate();
      await utils.marketplace.orders.mine.invalidate();
      await utils.marketplace.conversations.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateOrder = trpc.marketplace.orders.updateStatus.useMutation({
    onSuccess: async () => {
      toast.success("Order status updated");
      await utils.marketplace.orders.mine.invalidate();
      await utils.marketplace.orders.timeline.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const availability = trpc.marketplace.setListingAvailability.useMutation({
    onSuccess: async result => {
      toast.success(
        result.status === "paused" ? "Listing paused" : "Listing is live again"
      );
      await utils.marketplace.myListings.invalidate();
      await utils.marketplace.search.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const toggleSupplier = trpc.marketplace.savedSuppliers.toggle.useMutation({
    onSuccess: async result => {
      toast.success(result.saved ? "Supplier saved" : "Supplier removed");
      await utils.marketplace.savedSuppliers.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
      toast.success("Signed out");
    },
  });
  const currentProfile = profile.data;
  async function submitEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      toast.error("Sign-in is temporarily unavailable. Please try again later.");
      return;
    }
    setSignInBusy(true);
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSignInBusy(false);
    if (result.error) {
      const message = result.error.message.toLowerCase();
      toast.error(message.includes("email not confirmed") ? "Please confirm your email before signing in." : message.includes("invalid login credentials") ? "Invalid email or password." : "We could not complete sign-in. Please try again.");
      return;
    }
    window.location.reload();
  }
  const navItems = useMemo(() => {
    const common: { id: WorkspaceTab; label: string; icon: typeof Store }[] = [
      { id: "overview", label: "Overview", icon: Store },
      ...(isSeller
        ? [{ id: "listings" as const, label: "My listings", icon: Package }]
        : [{ id: "saved" as const, label: "Saved growers", icon: Heart }]),
      {
        id: "requests",
        label: isSeller ? "Enquiries" : "Requests",
        icon: Inbox,
      },
      { id: "orders", label: "Orders", icon: ClipboardList },
      { id: "messages", label: "Messages", icon: MessageCircle },
      { id: "profile", label: "My profile", icon: UserRound },
      { id: "privacy", label: "Privacy & data", icon: ShieldCheck },
    ];
    return common;
  }, [isSeller]);

  if (auth.isLoading)
    return (
      <div className="workspace-loading">
        <div className="loading-dots" />
        Loading your workspace…
      </div>
    );
  if (!auth.data)
    return (
      <div className="workspace-auth-shell">
        <Link href="/" className="workspace-back">
          <ArrowLeft size={16} /> Agro Hub home
        </Link>
        <div className="workspace-signin-card">
          <span className="workspace-brand-icon">
            <Sprout size={25} />
          </span>
          <span className="eyebrow">WELCOME TO AGRO HUB</span>
          <h1>
            How will you <em>participate?</em>
          </h1>
          <p>
            Choose your profile, then sign in securely with your email and password.
          </p>
          <div className="profile-choice-grid profile-selection-grid" role="group" aria-label="Choose a profile">
            <button type="button" className={`profile-choice ${profileType === "farmer" ? "selected" : ""}`} onClick={() => setProfileType("farmer")} aria-pressed={profileType === "farmer"}>
              <span className="profile-choice-icon"><Sprout size={22} /></span>
              <span><strong>Farmer</strong><small>List your harvest, respond to enquiries and manage orders.</small></span>
              <ArrowRight className="profile-choice-arrow" size={16} />
            </button>
            <button type="button" className={`profile-choice ${profileType === "buyer" ? "selected" : ""}`} onClick={() => setProfileType("buyer")} aria-pressed={profileType === "buyer"}>
              <span className="profile-choice-icon"><ShoppingBasket size={22} /></span>
              <span><strong>Buyer</strong><small>Discover growers, request produce and track your orders.</small></span>
              <ArrowRight className="profile-choice-arrow" size={16} />
            </button>
          </div>
          <form className="profile-email-form" onSubmit={submitEmailSignIn}>
            <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Your password" autoComplete="current-password" required /></label>
            <button type="submit" className="button button-primary profile-continue" disabled={signInBusy}>
              {signInBusy ? "Signing in…" : `Sign in as ${profileType === "farmer" ? "a farmer" : "a buyer"}`} {!signInBusy && <ArrowRight size={16} />}
            </button>
          </form>
          <span className="signin-provider-note">Use the email and password linked to your Agro Hub account.</span>
          <Link className="text-link" href="/">Return to explore produce</Link>
        </div>
      </div>
    );
  if (auth.data.role === "admin")
    return (
      <div className="workspace-auth-shell">
        <div className="workspace-signin-card">
          <span className="workspace-brand-icon">
            <ShieldCheck size={25} />
          </span>
          <span className="eyebrow">ADMINISTRATOR ACCOUNT</span>
          <h1>
            Your workspace is <em>ready.</em>
          </h1>
          <p>
            Use the marketplace administration console to review listings,
            seller identities and reports.
          </p>
          <Link className="button button-primary" href="/admin">
            Open admin console <ArrowRight size={16} />
          </Link>
          <Link className="text-link" href="/">
            Back to public marketplace
          </Link>
        </div>
      </div>
    );
  if (profile.isLoading)
    return (
      <div className="workspace-loading">
        <div className="loading-dots" />
        Loading your profile…
      </div>
    );
  if (!currentProfile)
    return (
      <div className="workspace-auth-shell">
        <Link href="/" className="workspace-back">
          <ArrowLeft size={16} /> Agro Hub home
        </Link>
        <ProfileSetup
          name={auth.data.name || ""}
          loading={false}
          onComplete={async () => {
            await utils.marketplace.profile.invalidate();
          }}
        />
      </div>
    );
  const activeListings = (listings.data ?? []).filter(
    item => item.status === "active"
  ).length;
  const pendingRequests = (requests.data ?? []).filter(
    item => item.status === "pending"
  ).length;
  const openOrders = (orders.data ?? []).filter(
    item => !["completed", "cancelled"].includes(item.status)
  ).length;
  const greeting = currentProfile.displayName.split(" ")[0] || "there";
  const selectedThread = conversations.data?.find(item => item.id === selectedConversationId);
  const messagingBlocked = Boolean(selectedThread?.blockedByMe || selectedThread?.blockedMe);
  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedConversationId || !messageBody.trim()) return;
    sendMessage.mutate({
      conversationId: selectedConversationId,
      body: messageBody.trim(),
    });
  };
  const submitConversationReport = (event: FormEvent) => {
    event.preventDefault();
    if (reportConversationId === null) return;
    reportConversation.mutate({
      conversationId: reportConversationId,
      reason: chatReportReason,
      details: chatReportDetails.trim() || undefined,
    });
  };
  const refreshData = () => {
    void utils.marketplace.profile.invalidate();
    void utils.marketplace.myListings.invalidate();
    void utils.marketplace.requests.mine.invalidate();
    void utils.marketplace.orders.mine.invalidate();
  };

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <Link href="/" className="brand-lockup">
          <img
            className="brand-mark"
            src="/brand/mark.webp"
            alt=""
          />
          <span className="brand-wordmark">
            agro<span>hub</span>
            <small>FARM TO MARKET</small>
          </span>
        </Link>
        <div className="workspace-user">
          <div className="workspace-avatar">
            {currentProfile.displayName.slice(0, 1).toUpperCase()}
          </div>
          <span>
            <strong>{currentProfile.displayName}</strong>
            <small>{accountPath(currentProfile.accountType)}</small>
          </span>
        </div>
        <nav className="workspace-nav" aria-label="Workspace sections">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`workspace-nav-item ${tab === id ? "active" : ""}`}
              onClick={() => {
                setTab(id);
                setListingEditor(null);
              }}
            >
              <Icon size={17} />
              {label}
              {id === "requests" && pendingRequests > 0 && (
                <span className="nav-count">{pendingRequests}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="workspace-nav-item">
            <ArrowLeft size={17} />
            Explore produce
          </Link>
          <button
            className="workspace-nav-item"
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut size={17} />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <main className="workspace-main">
        <header className="workspace-topbar">
          <div>
            <span className="eyebrow">
              {currentProfile.accountType === "seller"
                ? "GROWER SPACE"
                : "BUYER SPACE"}
            </span>
            <h1>Good to see you, {greeting}.</h1>
          </div>
          <div className="workspace-top-actions">
            <button
              type="button"
              className="icon-button"
              onClick={refreshData}
              aria-label="Refresh workspace"
            >
              <RefreshCw size={17} />
            </button>
            {isSeller && (
              <button
                type="button"
                className="button button-primary button-small"
                onClick={() => setListingEditor("new")}
              >
                <Plus size={16} />
                New listing
              </button>
            )}
            <Link className="button button-outline button-small" href="/">
              Marketplace <ArrowRight size={14} />
            </Link>
          </div>
        </header>
        {tab === "overview" && (
          <section className="workspace-content">
            <div className="workspace-welcome-card">
              <div>
                <span className="eyebrow eyebrow-light">
                  {currentProfile.accountType === "seller"
                    ? "GROWING YOUR REACH"
                    : "BUYER DASHBOARD"}
                </span>
                <h2>
                  {currentProfile.accountType === "seller"
                    ? "Your farm, in one place."
                    : "Your sourcing, in one place."}
                </h2>
                <p>
                  {currentProfile.accountType === "seller"
                    ? "Keep listings current, answer enquiries, and track each accepted order."
                    : "Keep track of the growers you save, the requests you send, and orders sellers accept."}
                </p>
              </div>
              <span className="welcome-plant">
                <Sprout size={54} strokeWidth={1.2} />
              </span>
            </div>
            <div className="workspace-stat-grid">
              <article className="workspace-stat">
                <span>{isSeller ? "Live listings" : "Saved growers"}</span>
                <strong>
                  {isSeller ? activeListings : (saved.data?.length ?? 0)}
                </strong>
                <small>
                  {isSeller ? "Approved and available" : "Growers in your list"}
                </small>
              </article>
              <article className="workspace-stat">
                <span>{isSeller ? "Open enquiries" : "Open requests"}</span>
                <strong>{pendingRequests}</strong>
                <small>
                  {isSeller
                    ? "Waiting for your response"
                    : "Waiting for seller response"}
                </small>
              </article>
              <article className="workspace-stat">
                <span>Active orders</span>
                <strong>{openOrders}</strong>
                <small>Not yet completed or cancelled</small>
              </article>
            </div>
            <div className="workspace-content-grid">
              <section className="workspace-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">RECENT ACTIVITY</span>
                    <h2>{isSeller ? "Recent enquiries" : "Recent requests"}</h2>
                  </div>
                  <button
                    className="text-link button-plain"
                    type="button"
                    onClick={() => setTab("requests")}
                  >
                    See all <ArrowRight size={15} />
                  </button>
                </div>
                {requests.data?.length ? (
                  requests.data.slice(0, 4).map(item => (
                    <div className="activity-row" key={item.id}>
                      <span className="activity-icon">
                        <Inbox size={17} />
                      </span>
                      <span>
                        <strong>{item.listingTitle}</strong>
                        <small>
                          {item.quantity} {item.quantityUnit} ·{" "}
                          {item.otherPartyName || "Marketplace member"}
                        </small>
                      </span>
                      <StatusBadge value={item.status} />
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">
                    No requests yet. New buyer requests appear here.
                  </p>
                )}
              </section>
              <section className="workspace-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">ORDERS</span>
                    <h2>Keep it moving</h2>
                  </div>
                  <button
                    className="text-link button-plain"
                    type="button"
                    onClick={() => setTab("orders")}
                  >
                    See orders <ArrowRight size={15} />
                  </button>
                </div>
                {orders.data?.length ? (
                  orders.data.slice(0, 3).map(item => (
                    <div className="activity-row" key={item.id}>
                      <span className="activity-icon">
                        <Package size={17} />
                      </span>
                      <span>
                        <strong>{item.listingTitle}</strong>
                        <small>
                          {item.orderNumber} ·{" "}
                          {formatNaira(item.totalMinor / 100)}
                        </small>
                      </span>
                      <StatusBadge value={item.status} />
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">
                    An order record is created when a seller accepts a request.
                  </p>
                )}
              </section>
            </div>
            <div className="workspace-tip">
              <ShieldCheck size={18} />
              <span>
                <strong>Clear status, fewer surprises.</strong> Payment is not
                collected through Agro Hub. Arrange payment directly with the
                other party.
              </span>
            </div>
          </section>
        )}

        {tab === "listings" && isSeller && (
          <section className="workspace-content">
            <div className="panel-heading panel-heading-wide">
              <div>
                <span className="eyebrow">YOUR PRODUCE</span>
                <h2>Listings</h2>
                <p>
                  New listings and edits are reviewed before they appear in
                  public search.
                </p>
              </div>
              <button
                className="button button-primary"
                type="button"
                onClick={() => setListingEditor("new")}
              >
                <Plus size={16} />
                Add produce
              </button>
            </div>
            {listingEditor && (
              <div className="workspace-panel listing-editor-panel">
                <ListingEditor
                  key={listingEditor === "new" ? "new" : listingEditor.id}
                  initial={listingEditor === "new" ? undefined : listingEditor}
                  onCancel={() => setListingEditor(null)}
                  onSaved={() => {
                    setListingEditor(null);
                    void listings.refetch();
                  }}
                />
              </div>
            )}
            {listings.isLoading ? (
              <p className="muted-copy">Loading listings…</p>
            ) : listings.data?.length ? (
              <div className="seller-listings-grid">
                {listings.data.map(item => (
                  <article className="seller-listing-card" key={item.id}>
                    <img
                      src={item.imageUrl || "/produce/tomatoes.jpg"}
                      alt=""
                    />
                    <div className="seller-listing-card-main">
                      <div className="seller-listing-title">
                        <div>
                          <span className="category-label">
                            {item.category}
                          </span>
                          <h3>{item.title}</h3>
                        </div>
                        <StatusBadge value={item.status} />
                      </div>
                      <p>
                        {formatNaira(item.priceMinor / 100)} / {item.priceUnit}{" "}
                        · {item.quantityAvailable.toLocaleString()}{" "}
                        {item.quantityUnit} available
                      </p>
                      <small>
                        {item.location} · Updated {formatDate(item.updatedAt)}
                      </small>
                      <div className="workspace-card-actions">
                        <button
                          className="button button-outline button-small"
                          type="button"
                          onClick={() =>
                            setListingEditor(item as EditableListing)
                          }
                        >
                          Edit listing
                        </button>
                        {item.status === "active" && (
                          <button
                            className="button button-soft button-small"
                            type="button"
                            disabled={availability.isPending}
                            onClick={() =>
                              availability.mutate({
                                id: item.id,
                                status: "paused",
                              })
                            }
                          >
                            Pause availability
                          </button>
                        )}
                        {item.status === "paused" && (
                          <button
                            className="button button-outline button-small"
                            type="button"
                            disabled={availability.isPending}
                            onClick={() =>
                              availability.mutate({
                                id: item.id,
                                status: "active",
                              })
                            }
                          >
                            Resume listing
                          </button>
                        )}
                      </div>
                      <p className="illustration-disclaimer">
                        Crop photo is an illustration, not a photo of this
                        harvest.
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={<Wheat size={24} />}
                title="Your harvest starts here"
                copy="Create your first listing. Once reviewed, it can appear in the public marketplace."
                action={
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => setListingEditor("new")}
                  >
                    <Plus size={16} />
                    Create a listing
                  </button>
                }
              />
            )}
          </section>
        )}

        {tab === "saved" && isBuyer && (
          <section className="workspace-content">
            <div className="panel-heading panel-heading-wide">
              <div>
                <span className="eyebrow">YOUR SUPPLIERS</span>
                <h2>Saved growers</h2>
                <p>Keep growers you want to find again close at hand.</p>
              </div>
              <Link href="/#marketplace" className="button button-outline">
                Explore growers <ArrowRight size={15} />
              </Link>
            </div>
            {saved.data?.length ? (
              <div className="saved-grower-grid">
                {saved.data.map(item => (
                  <article
                    className="workspace-card saved-grower-card"
                    key={item.userId}
                  >
                    <div className="seller-avatar seller-avatar-large">
                      <Sprout size={20} />
                    </div>
                    <div>
                      <h3>{item.businessName || item.displayName}</h3>
                      <p>
                        <MapPin size={14} />
                        {item.location}
                      </p>
                      <StatusBadge value={item.verificationStatus} />
                      {item.bio && <small>{item.bio}</small>}
                      <Link className="text-link" href={`/seller/${item.userId}`}>
                        View grower profile <ArrowRight size={14} />
                      </Link>
                    </div>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() =>
                        toggleSupplier.mutate({ sellerUserId: item.userId })
                      }
                      aria-label={`Remove ${item.displayName}`}
                    >
                      <Heart size={17} fill="currentColor" />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={<Heart size={24} />}
                title="No saved growers yet"
                copy="Save a live listing's seller to come back to them later."
                action={
                  <Link className="button button-outline" href="/#marketplace">
                    Browse produce <ArrowRight size={15} />
                  </Link>
                }
              />
            )}
          </section>
        )}

        {tab === "requests" && (
          <section className="workspace-content">
            <div className="panel-heading panel-heading-wide">
              <div>
                <span className="eyebrow">
                  {isSeller ? "INCOMING ENQUIRIES" : "YOUR PURCHASE REQUESTS"}
                </span>
                <h2>{isSeller ? "Enquiries" : "Requests"}</h2>
                <p>
                  {isSeller
                    ? "Accepting a request creates a confirmed order record; payment remains separate."
                    : "A request becomes an order only after the seller accepts it."}
                </p>
              </div>
            </div>
            {requests.data?.length ? (
              <div className="request-list">
                {requests.data.map(item => (
                  <article
                    className="workspace-card request-card"
                    key={item.id}
                  >
                    <div className="workspace-card-head">
                      <div>
                        <span className="order-number">REQUEST #{item.id}</span>
                        <h3>{item.listingTitle}</h3>
                      </div>
                      <StatusBadge value={item.status} />
                    </div>
                    <div className="request-card-info">
                      <span>
                        <strong>
                          {item.quantity} {item.quantityUnit}
                        </strong>{" "}
                        requested
                      </span>
                      <span>
                        {isSeller ? "Buyer" : "Seller"}: {" "}
                        {item.otherPartyName || (isSeller ? "Private buyer" : "Marketplace seller")}
                      </span>
                      {isSeller && item.otherPartyBusinessName && (
                        <span>Buyer business name shared: {item.otherPartyBusinessName}</span>
                      )}
                      <span>
                        {item.deliveryPreference === "pickup"
                          ? "Pickup requested"
                          : "Ask about delivery"}
                      </span>
                      <span>Sent {formatDate(item.createdAt)}</span>
                    </div>
                    {item.proposedPriceMinor && (
                      <p className="muted-copy">
                        Proposed price:{" "}
                        {formatNaira(item.proposedPriceMinor / 100)} per unit
                      </p>
                    )}
                    {item.buyerNote && (
                      <blockquote className="request-note">
                        “{item.buyerNote}”
                      </blockquote>
                    )}
                    <div className="workspace-card-actions">
                      {isSeller && item.status === "pending" && (
                        <>
                          <button
                            className="button button-primary button-small"
                            type="button"
                            disabled={respondRequest.isPending}
                            onClick={() =>
                              respondRequest.mutate({
                                id: item.id,
                                response: "accept",
                              })
                            }
                          >
                            <Check size={15} />
                            Accept and create order
                          </button>
                          <button
                            className="button button-soft button-small"
                            type="button"
                            disabled={respondRequest.isPending}
                            onClick={() =>
                              respondRequest.mutate({
                                id: item.id,
                                response: "decline",
                              })
                            }
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {!isSeller && item.status === "pending" && (
                        <span className="muted-copy">
                          Waiting for the seller's response.
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={<Inbox size={24} />}
                title="No requests yet"
                copy={
                  isSeller
                    ? "Buyer enquiries for your live listings will appear here."
                    : "Requests you send to growers will appear here."
                }
                action={
                  !isSeller ? (
                    <Link
                      href="/#marketplace"
                      className="button button-outline"
                    >
                      Browse produce <ArrowRight size={15} />
                    </Link>
                  ) : undefined
                }
              />
            )}
          </section>
        )}

        {tab === "orders" && (
          <section className="workspace-content">
            <div className="panel-heading panel-heading-wide">
              <div>
                <span className="eyebrow">ORDER RECORDS</span>
                <h2>Your orders</h2>
                <p>
                  Track statuses agreed between the buyer and seller. Agro Hub
                  does not collect payment.
                </p>
              </div>
            </div>
            {orders.data?.length ? (
              <div className="request-list">
                {orders.data.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    accountType={currentProfile.accountType}
                    onStatus={(id, status) =>
                      updateOrder.mutate({ id, status })
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={<ClipboardList size={24} />}
                title="No order records yet"
                copy="An order record is created after a seller accepts a purchase request."
              />
            )}
          </section>
        )}

        {tab === "messages" && (
          <section className="workspace-content">
            <div className="panel-heading panel-heading-wide">
              <div>
                <span className="eyebrow">DIRECT CONVERSATIONS</span>
                <h2>Messages</h2>
                <p>
                  Discuss crop details and delivery directly with the other
                  party.
                </p>
              </div>
            </div>
            {conversations.data?.length ? (
              <div className="message-workspace">
                <div className="thread-list" aria-label="Conversations">
                  {conversations.data.map(thread => (
                    <button
                      key={thread.id}
                      type="button"
                      className={`thread-choice ${thread.id === selectedConversationId ? "selected" : ""}`}
                      onClick={() => setSelectedConversationId(thread.id)}
                    >
                      <span className="thread-avatar">
                        <Sprout size={17} />
                      </span>
                      <span>
                        <strong>{thread.listingTitle}</strong>
                        <small>
                          Produce conversation · {formatDate(thread.updatedAt)}
                        </small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
                <div className="thread-panel">
                  <div className="thread-panel-head">
                    <div>
                      <span className="eyebrow">ABOUT THIS LISTING</span>
                      <strong>
                        {conversations.data.find(
                          item => item.id === selectedConversationId
                        )?.listingTitle || "Conversation"}
                      </strong>
                    </div>
                    <div className="thread-panel-actions">
                      <button type="button" className="icon-button" onClick={() => void messages.refetch()} aria-label="Refresh conversation">
                        <RefreshCw size={15} />
                      </button>
                      {selectedThread && (
                        <>
                          <button type="button" className="button button-soft button-small" onClick={() => setReportConversationId(selectedThread.id)}>Report</button>
                          {selectedThread.blockedByMe ? (
                            <button type="button" className="button button-outline button-small" disabled={unblockConversation.isPending} onClick={() => unblockConversation.mutate({ userId: selectedThread.otherPartyUserId })}>Unblock</button>
                          ) : !selectedThread.blockedMe ? (
                            <button type="button" className="button button-soft button-small" disabled={blockConversation.isPending} onClick={() => {
                              if (window.confirm("Block this member? They will not be able to send you new purchase requests or messages. Existing records will remain.")) blockConversation.mutate({ conversationId: selectedThread.id });
                            }}>Block</button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                  {selectedThread?.blockedByMe && <p className="chat-block-notice">You blocked this member. New requests and messages are disabled.</p>}
                  {selectedThread?.blockedMe && <p className="chat-block-notice">This member has blocked you. You cannot send new messages in this conversation.</p>}
                  {reportConversationId !== null && reportConversationId === selectedConversationId && (
                    <form className="chat-report-form" onSubmit={submitConversationReport}>
                      <label className="field-label">Reason for report
                        <select value={chatReportReason} onChange={event => setChatReportReason(event.target.value)}>
                          <option>Unwanted contact or harassment</option>
                          <option>Spam or suspicious activity</option>
                          <option>Threatening or abusive message</option>
                          <option>Other conversation concern</option>
                        </select>
                      </label>
                      <label className="field-label">Details <span className="optional-label">Optional</span>
                        <textarea rows={3} maxLength={1200} value={chatReportDetails} onChange={event => setChatReportDetails(event.target.value)} placeholder="Tell the review team what happened." />
                      </label>
                      <div className="workspace-card-actions">
                        <button className="button button-primary button-small" type="submit" disabled={reportConversation.isPending}>{reportConversation.isPending ? "Sending…" : "Send report"}</button>
                        <button className="button button-soft button-small" type="button" onClick={() => setReportConversationId(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                  <div className="message-list">
                    {messages.data?.length ? (
                      messages.data.map(message => (
                        <div
                          key={message.id}
                          className={`chat-bubble ${message.senderUserId === auth.data!.id ? "mine" : "theirs"}`}
                        >
                          <p>{message.body}</p>
                          <time>{formatDate(message.createdAt)}</time>
                        </div>
                      ))
                    ) : (
                      <div className="thread-empty">
                        <MessageCircle size={22} />
                        <p>
                          Start the conversation. Keep any payment arrangements
                          between you and the seller.
                        </p>
                      </div>
                    )}
                  </div>
                  <form className="message-compose" onSubmit={submitMessage}>
                    <label className="sr-only" htmlFor="message-body">
                      Write a message
                    </label>
                    <input
                      id="message-body"
                      maxLength={2000}
                      value={messageBody}
                      onChange={event => setMessageBody(event.target.value)}
                      placeholder={messagingBlocked ? "Messaging is unavailable for this conversation." : "Write a message…"}
                      disabled={messagingBlocked}
                    />
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={!messageBody.trim() || sendMessage.isPending || messagingBlocked}
                      aria-label="Send message"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <EmptyPanel
                icon={<MessageCircle size={24} />}
                title="No conversations yet"
                copy="A conversation opens when a buyer sends a purchase request."
              />
            )}
          </section>
        )}

        {tab === "profile" && (
          <section className="workspace-content">
            <div className="panel-heading panel-heading-wide">
              <div>
                <span className="eyebrow">YOUR MARKETPLACE PROFILE</span>
                <h2>Profile details</h2>
                <p>
                  These details help the other party understand who they're
                  speaking with.
                </p>
              </div>
            </div>
            <ProfileEdit
              key={`${currentProfile.accountType}-${currentProfile.updatedAt}`}
              profile={currentProfile}
              onSaved={async () => {
                await utils.marketplace.profile.invalidate();
              }}
            />
          </section>
        )}
        {tab === "privacy" && (
          <PrivacyCenter
            onEditProfile={() => setTab("profile")}
            onViewTransactions={() => setTab("orders")}
          />
        )}
      </main>
    </div>
  );
}

function ProfileEdit({
  profile,
  onSaved,
}: {
  profile: {
    accountType: "buyer" | "seller";
    displayName: string;
    businessName: string | null;
    location: string;
    bio: string | null;
    verificationStatus: string;
  };
  onSaved: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [businessName, setBusinessName] = useState(profile.businessName || "");
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio || "");
  const save = trpc.marketplace.saveProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile saved");
      await onSaved();
    },
    onError: error => toast.error(error.message),
  });
  const utils = trpc.useUtils();
  const requestVerification = trpc.marketplace.submitVerification.useMutation({
    onSuccess: async () => {
      toast.success("Your identity-review request is in the administrator queue");
      await utils.marketplace.profile.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({
      accountType: profile.accountType,
      displayName,
      businessName,
      location,
      bio,
    });
  };
  return (
    <div className="workspace-panel profile-edit-panel">
      <form className="form-stack" onSubmit={submit}>
        <div className="profile-status-block">
          <span className="profile-kind-icon">
            {profile.accountType === "seller" ? (
              <Sprout size={19} />
            ) : (
              <Store size={19} />
            )}
          </span>
          <span>
            <strong>{accountPath(profile.accountType)}</strong>
            <small>Marketplace role</small>
          </span>
          <StatusBadge value={profile.verificationStatus} />
        </div>
        <label className="field-label">
          Display name
          <input
            required
            minLength={2}
            maxLength={160}
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
          />
        </label>
        {profile.accountType === "seller" && (
          <label className="field-label">
            Farm or business name
            <input
              maxLength={180}
              value={businessName}
              onChange={event => setBusinessName(event.target.value)}
            />
          </label>
        )}
        <label className="field-label">
          Location
          <input
            required
            minLength={2}
            maxLength={120}
            value={location}
            onChange={event => setLocation(event.target.value)}
          />
        </label>
        <label className="field-label">
          Introduction
          <textarea
            rows={4}
            maxLength={1200}
            value={bio}
            onChange={event => setBio(event.target.value)}
          />
        </label>
        {profile.accountType === "seller" && (
          <div className="verification-request-panel">
            <p className="quiet-note">
              <BadgeCheck size={15} />
              {profile.verificationStatus === "verified"
                ? "Your identity has been reviewed. This status is not a product or transaction guarantee."
                : profile.verificationStatus === "pending"
                  ? "Your identity-review request is waiting for an administrator."
                  : "Request an administrator identity review for your farmer profile."}
            </p>
            {(profile.verificationStatus === "not_started" ||
              profile.verificationStatus === "needs_changes") && (
              <button
                className="button button-outline"
                type="button"
                disabled={requestVerification.isPending}
                onClick={() => requestVerification.mutate()}
              >
                {requestVerification.isPending ? "Submitting…" : "Request identity review"}
              </button>
            )}
          </div>
        )}
        <button
          className="button button-primary"
          type="submit"
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
