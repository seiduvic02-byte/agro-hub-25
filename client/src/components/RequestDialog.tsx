import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatNaira } from "@/lib/marketplace-format";
import type { MarketplaceItem } from "@shared/marketplace";

type RequestDialogProps = {
  item: MarketplaceItem | null;
  onClose: () => void;
};

export default function RequestDialog({ item, onClose }: RequestDialogProps) {
  const auth = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const profile = trpc.marketplace.profile.useQuery(undefined, { enabled: Boolean(auth.data), retry: false });
  const utils = trpc.useUtils();
  const [quantity, setQuantity] = useState("");
  const [offer, setOffer] = useState("");
  const [deliveryPreference, setDeliveryPreference] = useState<"pickup" | "seller_delivery">("pickup");
  const [buyerNote, setBuyerNote] = useState("");
  const request = trpc.marketplace.requests.create.useMutation({
    onSuccess: async () => {
      toast.success("Request sent to the seller", { description: "Your order is not confirmed until the seller accepts." });
      await utils.marketplace.search.invalidate();
      await utils.marketplace.requests.mine.invalidate();
      await utils.marketplace.conversations.list.invalidate();
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    setQuantity(item ? String(item.minimumOrder) : "");
    setOffer("");
    setBuyerNote("");
    setDeliveryPreference("pickup");
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEscape);
    document.body.classList.add("dialog-open");
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.classList.remove("dialog-open");
    };
  }, [item, onClose]);

  if (!item) return null;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.data) {
      try { startLogin(); } catch { toast.error("Sign-in is not available yet. Please try again later."); }
      return;
    }
    if (!profile.data) {
      toast.message("Complete a buyer profile before sending a request.");
      window.location.assign("/workspace");
      return;
    }
    if (profile.data.accountType !== "buyer") {
      toast.error("Use a buyer profile to request produce.");
      return;
    }
    request.mutate({
      listingId: item.id,
      quantity: Number(quantity),
      proposedPriceNaira: offer.trim() ? Number(offer) : undefined,
      deliveryPreference,
      buyerNote: buyerNote.trim() || undefined,
    });
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="request-dialog" role="dialog" aria-modal="true" aria-labelledby="request-title">
        <div className="dialog-head">
          <div>
            <p className="eyebrow">CONTACT THE GROWER</p>
            <h2 id="request-title">Request {item.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close request form"><X size={19} /></button>
        </div>
        <div className="request-summary">
          <img src={item.imageUrl ?? "/produce/tomatoes.jpg"} alt="" />
          <div><strong>{formatNaira(item.priceMinor / 100)} <small>/ {item.priceUnit}</small></strong><span>{item.quantityAvailable.toLocaleString()} {item.quantityUnit} listed · minimum {item.minimumOrder} {item.quantityUnit}</span><span>{item.location}</span></div>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field-label">Quantity ({item.quantityUnit})
            <input type="number" min={item.minimumOrder} max={item.quantityAvailable} step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} />
            <small>Minimum order: {item.minimumOrder} {item.quantityUnit}</small>
          </label>
          <label className="field-label">Offer per {item.priceUnit} <span className="optional-label">Optional</span>
            <span className="currency-input"><span>₦</span><input type="number" min="1" step="1" value={offer} onChange={event => setOffer(event.target.value)} placeholder={(item.priceMinor / 100).toString()} /></span>
            <small>Leave blank to request at the listed price.</small>
          </label>
          <label className="field-label">Preferred delivery
            <select value={deliveryPreference} onChange={event => setDeliveryPreference(event.target.value as "pickup" | "seller_delivery")}>
              <option value="pickup">I can arrange pickup</option>
              <option value="seller_delivery">Ask the seller about delivery</option>
            </select>
          </label>
          <label className="field-label">Message to the seller <span className="optional-label">Optional</span>
            <textarea rows={3} maxLength={1200} value={buyerNote} onChange={event => setBuyerNote(event.target.value)} placeholder="Share your timing, packing or delivery requirements." />
          </label>
          <p className="quiet-note"><Check size={15} /> No payment is taken here. The seller reviews your request before an order is created.</p>
          <button className="button button-primary button-wide" type="submit" disabled={request.isPending || item.isExample}>
            {request.isPending ? "Sending request…" : <>Send purchase request <ArrowUpRight size={17} /></>}
          </button>
        </form>
      </section>
    </div>
  );
}
