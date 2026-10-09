import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  INITIAL_PAYMENT_STATUS,
  canChangeAccountType,
  canTransitionOrder,
  listingInputSchema,
  nextRequestStatus,
  orderTotalMinorUnits,
  priceNairaToMinorUnits,
  purchaseRequestInputSchema,
  reportInputSchema,
  slugify,
  verificationInputSchema,
} from "./marketplaceDomain";

function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

const validListing = {
  title: "Field tomatoes", category: "Vegetables", priceNaira: 960, priceUnit: "kg",
  quantityAvailable: 80, quantityUnit: "kg", minimumOrder: 5, location: "Kaduna, Nigeria",
  description: "Fresh field-grown tomatoes, graded and ready for collection.",
};

describe("marketplace contracts and state transitions", () => {
  it("accepts a valid listing and rejects fractional inventory quantities", () => {
    expect(listingInputSchema.safeParse(validListing).success).toBe(true);
    expect(listingInputSchema.safeParse({ ...validListing, quantityAvailable: 4.5 }).success).toBe(false);
  });

  it("requires a positive integer request quantity and an explicit delivery preference", () => {
    const valid = { listingId: 3, quantity: 10, deliveryPreference: "pickup" as const };
    expect(purchaseRequestInputSchema.safeParse(valid).success).toBe(true);
    expect(purchaseRequestInputSchema.safeParse({ ...valid, quantity: 2.5 }).success).toBe(false);
    expect(purchaseRequestInputSchema.safeParse({ listingId: 3, quantity: 10 }).success).toBe(false);
  });

  it("allows only one response to a pending request", () => {
    expect(nextRequestStatus("pending", "accept")).toBe("accepted");
    expect(nextRequestStatus("pending", "decline")).toBe("declined");
    expect(nextRequestStatus("pending", "cancel")).toBe("cancelled");
    expect(() => nextRequestStatus("accepted", "decline")).toThrow("no longer pending");
  });

  it("enforces actor-specific order progression and terminal states", () => {
    expect(canTransitionOrder("confirmed", "preparing", "seller")).toBe(true);
    expect(canTransitionOrder("confirmed", "preparing", "buyer")).toBe(false);
    expect(canTransitionOrder("confirmed", "cancelled", "buyer")).toBe(true);
    expect(canTransitionOrder("in_transit", "completed", "seller")).toBe(true);
    expect(canTransitionOrder("completed", "preparing", "seller")).toBe(false);
  });

  it("never initializes orders as paid and creates a concise safe listing slug", () => {
    expect(INITIAL_PAYMENT_STATUS).toBe("not_connected");
    expect(slugify("  Fresh Tomatoes — Kaduna! ")).toBe("fresh-tomatoes-kaduna");
  });

  it("keeps an established marketplace account type stable while permitting first-time selection", () => {
    expect(canChangeAccountType(null, "seller")).toBe(true);
    expect(canChangeAccountType("seller", "seller")).toBe(true);
    expect(canChangeAccountType("seller", "buyer")).toBe(false);
  });

  it("stores prices above signed INT range safely and rejects unsafe totals", () => {
    const unitMinor = priceNairaToMinorUnits(100_000_000);
    expect(unitMinor).toBe(10_000_000_000);
    expect(orderTotalMinorUnits(unitMinor, 1)).toBe(10_000_000_000);
    expect(() => orderTotalMinorUnits(unitMinor, 1_000_000)).toThrow("outside the supported range");
  });

  it("allows only reviewed identity outcomes through the administrator contract", () => {
    expect(verificationInputSchema.safeParse({ userId: 7, status: "verified" }).success).toBe(true);
    expect(verificationInputSchema.safeParse({ userId: 7, status: "pending" }).success).toBe(false);
  });

  it("requires a report to identify a listing or seller", () => {
    expect(reportInputSchema.safeParse({ reason: "Misleading details" }).success).toBe(false);
    expect(reportInputSchema.safeParse({ listingId: 4, reason: "Misleading details" }).success).toBe(true);
  });

  it("rejects unauthenticated listing creation and non-admin access before database work", async () => {
    const unauthenticated = appRouter.createCaller(context(null));
    await expect(unauthenticated.marketplace.createListing(validListing)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const regularUser: NonNullable<TrpcContext["user"]> = {
      id: 5, openId: "regular-user", email: "buyer@example.test", name: "Buyer",
      loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller(context(regularUser));
    await expect(caller.marketplace.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
