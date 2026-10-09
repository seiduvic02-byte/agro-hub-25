import { z } from "zod";

export const accountTypeSchema = z.enum(["buyer", "seller"]);
export function canChangeAccountType(current: "buyer" | "seller" | null, next: "buyer" | "seller") {
  return current === null || current === next;
}

export const profileInputSchema = z.object({
  accountType: accountTypeSchema,
  displayName: z.string().trim().min(2).max(160),
  businessName: z.string().trim().max(180).optional().or(z.literal("")),
  location: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(1200).optional().or(z.literal("")),
});

export const privacySettingsSchema = z.object({
  profileVisible: z.boolean(),
  showDisplayName: z.boolean(),
  showBusinessName: z.boolean(),
  showLocation: z.boolean(),
  showBio: z.boolean(),
  contactInfo: z.string().trim().max(240).optional().or(z.literal("")),
  showContactInfo: z.boolean(),
  shareBusinessWithSellers: z.boolean(),
  activityEmails: z.boolean(),
  marketingEmails: z.boolean(),
});

export const listingInputSchema = z.object({
  title: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(60),
  priceNaira: z.number().finite().positive().max(100000000),
  priceUnit: z.string().trim().min(1).max(40),
  quantityAvailable: z.number().int().positive().max(100000000),
  quantityUnit: z.string().trim().min(1).max(30),
  minimumOrder: z.number().int().positive().max(100000000),
  location: z.string().trim().min(2).max(120),
  description: z.string().trim().min(8).max(4000),
  imageUrl: z.string().trim().max(512).optional().or(z.literal("")),
});

export const listingIdSchema = z.object({ id: z.number().int().positive() });
export const slugSchema = z.object({ slug: z.string().trim().min(1).max(220) });

export const listingSearchSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(60).optional(),
  location: z.string().trim().max(120).optional(),
});

export const purchaseRequestInputSchema = z.object({
  listingId: z.number().int().positive(),
  quantity: z.number().int().positive().max(100000000),
  proposedPriceNaira: z.number().finite().positive().max(100000000).optional(),
  deliveryPreference: z.enum(["pickup", "seller_delivery"]),
  buyerNote: z.string().trim().max(1200).optional().or(z.literal("")),
});

export const requestResponseSchema = z.object({
  id: z.number().int().positive(),
  response: z.enum(["accept", "decline"]),
});

export const messageInputSchema = z.object({
  conversationId: z.number().int().positive(),
  body: z.string().trim().min(1).max(2000),
});

export const reportInputSchema = z.object({
  listingId: z.number().int().positive().optional(),
  reportedUserId: z.number().int().positive().optional(),
  conversationId: z.number().int().positive().optional(),
  reason: z.string().trim().min(3).max(80),
  details: z.string().trim().max(1200).optional().or(z.literal("")),
}).refine(value => value.listingId !== undefined || value.reportedUserId !== undefined || value.conversationId !== undefined, {
  message: "Choose a listing, seller or conversation to report",
});

export const blockConversationSchema = z.object({ conversationId: z.number().int().positive() });
export const unblockUserSchema = z.object({ userId: z.number().int().positive() });
export const deletionRequestSchema = z.object({ id: z.number().int().positive() });

export function isBlockedEitherDirection(
  relationships: readonly { blockerUserId: number; blockedUserId: number }[],
  firstUserId: number,
  secondUserId: number,
) {
  return relationships.some(({ blockerUserId, blockedUserId }) =>
    (blockerUserId === firstUserId && blockedUserId === secondUserId) ||
    (blockerUserId === secondUserId && blockedUserId === firstUserId),
  );
}

export const orderStatusInputSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["preparing", "ready", "in_transit", "completed", "cancelled"]),
});

export const moderationInputSchema = z.object({
  listingId: z.number().int().positive(),
  decision: z.enum(["approve", "reject"]),
});

export const verificationInputSchema = z.object({
  userId: z.number().int().positive(),
  status: z.enum(["verified", "needs_changes"]),
});

export const reportResolutionSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["resolved", "dismissed"]),
});

export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled";
export type RequestAction = "accept" | "decline" | "cancel";
export type OrderStatus = "confirmed" | "preparing" | "ready" | "in_transit" | "completed" | "cancelled";

export function nextRequestStatus(current: RequestStatus, action: RequestAction): RequestStatus {
  if (current !== "pending") throw new Error("This request is no longer pending");
  if (action === "accept") return "accepted";
  if (action === "decline") return "declined";
  return "cancelled";
}

const sellerOrderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["in_transit", "cancelled"],
  in_transit: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(current: OrderStatus, next: OrderStatus, actor: "buyer" | "seller"): boolean {
  if (actor === "buyer") return current === "confirmed" && next === "cancelled";
  return sellerOrderTransitions[current].includes(next);
}

export function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "produce";
}

/** This project intentionally has no payment provider: callers can never use this to record a successful charge. */
export const INITIAL_PAYMENT_STATUS = "not_connected" as const;

export function priceNairaToMinorUnits(priceNaira: number) {
  const amountMinor = Math.round(priceNaira * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Price is outside the supported range");
  }
  return amountMinor;
}

export function orderTotalMinorUnits(unitPriceMinor: number, quantity: number) {
  const totalMinor = unitPriceMinor * quantity;
  if (!Number.isSafeInteger(totalMinor) || totalMinor <= 0) {
    throw new Error("Order total is outside the supported range");
  }
  return totalMinor;
}
