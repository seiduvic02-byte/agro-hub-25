import { and, desc, eq, gt, inArray, like, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  conversationMessages,
  accountDeletionRequests,
  blockedUsers,
  conversations,
  listingModerationEvents,
  listings,
  marketplaceProfiles,
  marketplaceReports,
  orderEvents,
  orders,
  paymentRecords,
  profileVerificationEvents,
  purchaseRequests,
  savedSuppliers,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { canChangeAccountType, canTransitionOrder, INITIAL_PAYMENT_STATUS, isBlockedEitherDirection, nextRequestStatus, orderTotalMinorUnits, priceNairaToMinorUnits, slugify, type OrderStatus, type RequestStatus } from "./marketplaceDomain";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Marketplace storage is not available");
  return db;
}

function localImageOrNull(value: string | undefined) {
  if (!value) return null;
  return /^\/(?!\/)[a-zA-Z0-9/_\-.]+$/.test(value) ? value : null;
}

export async function getProfile(userId: number) {
  const db = requireDb(await getDb());
  const [profile] = await db.select().from(marketplaceProfiles).where(eq(marketplaceProfiles.userId, userId)).limit(1);
  return profile ?? null;
}

export async function saveProfile(userId: number, input: {
  accountType: "buyer" | "seller";
  displayName: string;
  businessName?: string;
  location: string;
  bio?: string;
}) {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [existing] = await tx.select().from(marketplaceProfiles)
      .where(eq(marketplaceProfiles.userId, userId)).limit(1).for("update");
    if (existing && !canChangeAccountType(existing.accountType, input.accountType)) {
      throw new Error("Account type cannot be changed after profile creation");
    }
    const values = {
      displayName: input.displayName,
      businessName: input.businessName || null,
      location: input.location,
      bio: input.bio || null,
      updatedAt: new Date(),
    };
    if (existing) {
      await tx.update(marketplaceProfiles).set(values).where(eq(marketplaceProfiles.userId, userId));
    } else {
      await tx.insert(marketplaceProfiles).values({
        userId,
        accountType: input.accountType,
        ...values,
        profileVisible: false,
        showDisplayName: false,
        showBusinessName: false,
        showLocation: false,
        showBio: false,
        showContactInfo: false,
        shareBusinessWithSellers: false,
        activityEmails: false,
        marketingEmails: false,
      });
    }
    const [profile] = await tx.select().from(marketplaceProfiles).where(eq(marketplaceProfiles.userId, userId)).limit(1);
    return profile ?? null;
  });
}

export async function updatePrivacySettings(userId: number, input: {
  profileVisible: boolean;
  showDisplayName: boolean;
  showBusinessName: boolean;
  showLocation: boolean;
  showBio: boolean;
  contactInfo?: string;
  showContactInfo: boolean;
  shareBusinessWithSellers: boolean;
  activityEmails: boolean;
  marketingEmails: boolean;
}) {
  const db = requireDb(await getDb());
  const [profile] = await db.select({ accountType: marketplaceProfiles.accountType }).from(marketplaceProfiles)
    .where(eq(marketplaceProfiles.userId, userId)).limit(1);
  if (!profile) throw new Error("Marketplace profile not found");
  const isSeller = profile.accountType === "seller";
  await db.update(marketplaceProfiles).set({
    profileVisible: isSeller && input.profileVisible,
    showDisplayName: isSeller && input.showDisplayName,
    showBusinessName: isSeller && input.showBusinessName,
    showLocation: isSeller && input.showLocation,
    showBio: isSeller && input.showBio,
    contactInfo: input.contactInfo?.trim() || null,
    showContactInfo: isSeller && input.showContactInfo && Boolean(input.contactInfo?.trim()),
    shareBusinessWithSellers: !isSeller && input.shareBusinessWithSellers,
    activityEmails: input.activityEmails,
    marketingEmails: input.marketingEmails,
    updatedAt: new Date(),
  }).where(eq(marketplaceProfiles.userId, userId));
  return getProfile(userId);
}

export async function searchListings(filters: { query?: string; category?: string; location?: string }) {
  const db = requireDb(await getDb());
  const conditions = [eq(listings.status, "active"), gt(listings.quantityAvailable, 0), eq(marketplaceProfiles.accountType, "seller")];
  const query = filters.query?.trim();
  if (query) {
    const term = `%${query.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(or(
      like(listings.title, term),
      like(listings.description, term),
      like(listings.category, term),
      like(listings.location, term),
      and(eq(marketplaceProfiles.profileVisible, true), eq(marketplaceProfiles.showDisplayName, true), like(marketplaceProfiles.displayName, term)),
      and(eq(marketplaceProfiles.profileVisible, true), eq(marketplaceProfiles.showBusinessName, true), like(marketplaceProfiles.businessName, term)),
    )!);
  }
  if (filters.category && filters.category !== "All") conditions.push(eq(listings.category, filters.category));
  if (filters.location) conditions.push(like(listings.location, `%${filters.location.trim()}%`));
  return db.select({
    id: listings.id,
    slug: listings.slug,
    title: listings.title,
    category: listings.category,
    priceMinor: listings.priceMinor,
    priceUnit: listings.priceUnit,
    quantityAvailable: listings.quantityAvailable,
    quantityUnit: listings.quantityUnit,
    minimumOrder: listings.minimumOrder,
    location: listings.location,
    description: listings.description,
    imageUrl: listings.imageUrl,
    sellerUserId: sql<number | null>`case when ${marketplaceProfiles.profileVisible} = 1 then ${listings.sellerUserId} else null end`,
    sellerName: sql<string>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showDisplayName} = 1 then ${marketplaceProfiles.displayName} else 'Marketplace seller' end`,
    sellerBusinessName: sql<string | null>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showBusinessName} = 1 then ${marketplaceProfiles.businessName} else null end`,
    sellerVerificationStatus: marketplaceProfiles.verificationStatus,
  }).from(listings)
    .innerJoin(marketplaceProfiles, eq(marketplaceProfiles.userId, listings.sellerUserId))
    .where(and(...conditions))
    .orderBy(desc(listings.createdAt))
    .limit(48);
}

export async function getPublicListing(slug: string) {
  const db = requireDb(await getDb());
  const [listing] = await db.select({
    id: listings.id,
    slug: listings.slug,
    title: listings.title,
    category: listings.category,
    priceMinor: listings.priceMinor,
    priceUnit: listings.priceUnit,
    quantityAvailable: listings.quantityAvailable,
    quantityUnit: listings.quantityUnit,
    minimumOrder: listings.minimumOrder,
    location: listings.location,
    description: listings.description,
    imageUrl: listings.imageUrl,
    sellerUserId: sql<number | null>`case when ${marketplaceProfiles.profileVisible} = 1 then ${listings.sellerUserId} else null end`,
    sellerName: sql<string>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showDisplayName} = 1 then ${marketplaceProfiles.displayName} else 'Marketplace seller' end`,
    sellerBusinessName: sql<string | null>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showBusinessName} = 1 then ${marketplaceProfiles.businessName} else null end`,
    sellerBio: sql<string | null>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showBio} = 1 then ${marketplaceProfiles.bio} else null end`,
    sellerContactInfo: sql<string | null>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showContactInfo} = 1 then ${marketplaceProfiles.contactInfo} else null end`,
    sellerVerificationStatus: marketplaceProfiles.verificationStatus,
  }).from(listings)
    .innerJoin(marketplaceProfiles, eq(marketplaceProfiles.userId, listings.sellerUserId))
    .where(and(eq(listings.slug, slug), eq(listings.status, "active"), gt(listings.quantityAvailable, 0), eq(marketplaceProfiles.accountType, "seller")))
    .limit(1);
  return listing ?? null;
}

export async function getPublicSeller(userId: number) {
  const db = requireDb(await getDb());
  const [profile] = await db.select({
    userId: marketplaceProfiles.userId,
    displayName: sql<string>`case when ${marketplaceProfiles.showDisplayName} = 1 then ${marketplaceProfiles.displayName} else 'Marketplace seller' end`,
    businessName: sql<string | null>`case when ${marketplaceProfiles.showBusinessName} = 1 then ${marketplaceProfiles.businessName} else null end`,
    location: sql<string | null>`case when ${marketplaceProfiles.showLocation} = 1 then ${marketplaceProfiles.location} else null end`,
    bio: sql<string | null>`case when ${marketplaceProfiles.showBio} = 1 then ${marketplaceProfiles.bio} else null end`,
    contactInfo: sql<string | null>`case when ${marketplaceProfiles.showContactInfo} = 1 then ${marketplaceProfiles.contactInfo} else null end`,
    verificationStatus: marketplaceProfiles.verificationStatus,
  }).from(marketplaceProfiles)
    .where(and(eq(marketplaceProfiles.userId, userId), eq(marketplaceProfiles.accountType, "seller"), eq(marketplaceProfiles.profileVisible, true)))
    .limit(1);
  if (!profile) return null;
  const activeListings = await db.select({
    id: listings.id,
    slug: listings.slug,
    title: listings.title,
    category: listings.category,
    priceMinor: listings.priceMinor,
    priceUnit: listings.priceUnit,
    quantityAvailable: listings.quantityAvailable,
    quantityUnit: listings.quantityUnit,
    location: listings.location,
    description: listings.description,
    imageUrl: listings.imageUrl,
  }).from(listings)
    .where(and(eq(listings.sellerUserId, userId), eq(listings.status, "active"), gt(listings.quantityAvailable, 0)))
    .orderBy(desc(listings.createdAt)).limit(48);
  return { ...profile, listings: activeListings };
}

export async function getSellerListings(userId: number) {
  const db = requireDb(await getDb());
  return db.select().from(listings).where(eq(listings.sellerUserId, userId)).orderBy(desc(listings.updatedAt));
}

export async function createListing(userId: number, input: {
  title: string; category: string; priceNaira: number; priceUnit: string;
  quantityAvailable: number; quantityUnit: string; minimumOrder: number;
  location: string; description: string; imageUrl?: string;
}) {
  const db = requireDb(await getDb());
  const [profile] = await db.select().from(marketplaceProfiles).where(eq(marketplaceProfiles.userId, userId)).limit(1);
  if (!profile || profile.accountType !== "seller") throw new Error("A farmer/seller profile is required to create listings");
  const ids = await db.insert(listings).values({
    slug: `${slugify(input.title)}-${nanoid(6).toLowerCase()}`,
    sellerUserId: userId,
    title: input.title,
    category: input.category,
    priceMinor: priceNairaToMinorUnits(input.priceNaira),
    priceUnit: input.priceUnit,
    quantityAvailable: input.quantityAvailable,
    quantityUnit: input.quantityUnit,
    minimumOrder: input.minimumOrder,
    location: input.location,
    description: input.description,
    imageUrl: localImageOrNull(input.imageUrl),
    status: "pending",
  }).$returningId();
  const [created] = ids.length ? await db.select().from(listings).where(eq(listings.id, ids[0]!.id)).limit(1) : [];
  if (!created) throw new Error("The listing could not be saved");
  return created;
}

export async function updateListing(userId: number, id: number, input: {
  title: string; category: string; priceNaira: number; priceUnit: string;
  quantityAvailable: number; quantityUnit: string; minimumOrder: number;
  location: string; description: string; imageUrl?: string;
}) {
  const db = requireDb(await getDb());
  const [existing] = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.sellerUserId, userId))).limit(1);
  if (!existing) throw new Error("Listing not found or not owned by this seller");
  await db.update(listings).set({
    title: input.title,
    category: input.category,
    priceMinor: priceNairaToMinorUnits(input.priceNaira),
    priceUnit: input.priceUnit,
    quantityAvailable: input.quantityAvailable,
    quantityUnit: input.quantityUnit,
    minimumOrder: input.minimumOrder,
    location: input.location,
    description: input.description,
    imageUrl: localImageOrNull(input.imageUrl),
    status: existing.status === "active" ? "pending" : existing.status,
    updatedAt: new Date(),
  }).where(and(eq(listings.id, id), eq(listings.sellerUserId, userId)));
  const [updated] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return updated ?? null;
}

export async function setListingAvailability(userId: number, id: number, status: "active" | "paused") {
  const db = requireDb(await getDb());
  const [existing] = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.sellerUserId, userId))).limit(1);
  if (!existing) throw new Error("Listing not found or not owned by this seller");
  if (existing.status !== "active" && existing.status !== "paused") throw new Error("Only approved listings can be paused or resumed");
  await db.update(listings).set({ status, updatedAt: new Date() }).where(eq(listings.id, id));
  const [updated] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return updated ?? null;
}

export async function toggleSavedSupplier(buyerUserId: number, sellerUserId: number) {
  const db = requireDb(await getDb());
  const [buyer] = await db.select().from(marketplaceProfiles).where(eq(marketplaceProfiles.userId, buyerUserId)).limit(1);
  if (!buyer || buyer.accountType !== "buyer") throw new Error("A buyer profile is required to save suppliers");
  if (buyerUserId === sellerUserId) throw new Error("You cannot save your own supplier profile");
  const [seller] = await db.select().from(marketplaceProfiles).where(eq(marketplaceProfiles.userId, sellerUserId)).limit(1);
  if (!seller || seller.accountType !== "seller") throw new Error("Supplier not found");
  const [saved] = await db.select().from(savedSuppliers).where(and(eq(savedSuppliers.buyerUserId, buyerUserId), eq(savedSuppliers.sellerUserId, sellerUserId))).limit(1);
  if (saved) {
    await db.delete(savedSuppliers).where(eq(savedSuppliers.id, saved.id));
    return { saved: false };
  }
  await db.insert(savedSuppliers).values({ buyerUserId, sellerUserId });
  return { saved: true };
}

export async function getSavedSuppliers(buyerUserId: number) {
  const db = requireDb(await getDb());
  return db.select({
    userId: marketplaceProfiles.userId,
    displayName: sql<string>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showDisplayName} = 1 then ${marketplaceProfiles.displayName} else 'Marketplace seller' end`,
    businessName: sql<string | null>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showBusinessName} = 1 then ${marketplaceProfiles.businessName} else null end`,
    location: sql<string | null>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showLocation} = 1 then ${marketplaceProfiles.location} else null end`,
    bio: sql<string | null>`case when ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showBio} = 1 then ${marketplaceProfiles.bio} else null end`,
    verificationStatus: marketplaceProfiles.verificationStatus,
  }).from(savedSuppliers)
    .innerJoin(marketplaceProfiles, eq(marketplaceProfiles.userId, savedSuppliers.sellerUserId))
    .where(eq(savedSuppliers.buyerUserId, buyerUserId))
    .orderBy(desc(savedSuppliers.createdAt));
}

export async function createPurchaseRequest(buyerUserId: number, input: {
  listingId: number; quantity: number; proposedPriceNaira?: number;
  deliveryPreference: "pickup" | "seller_delivery"; buyerNote?: string;
}) {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [buyer] = await tx.select().from(marketplaceProfiles).where(eq(marketplaceProfiles.userId, buyerUserId)).limit(1);
    if (!buyer || buyer.accountType !== "buyer") throw new Error("Complete a buyer profile before requesting produce");
    const [listing] = await tx.select().from(listings)
      .where(and(eq(listings.id, input.listingId), eq(listings.status, "active"), gt(listings.quantityAvailable, 0)))
      .limit(1).for("update");
    if (!listing) throw new Error("This listing is no longer available");
    const [seller] = await tx.select({ accountType: marketplaceProfiles.accountType }).from(marketplaceProfiles)
      .where(eq(marketplaceProfiles.userId, listing.sellerUserId)).limit(1);
    if (!seller || seller.accountType !== "seller") throw new Error("This listing is no longer available");
    const blockRows = await tx.select({
      blockerUserId: blockedUsers.blockerUserId,
      blockedUserId: blockedUsers.blockedUserId,
    }).from(blockedUsers).where(or(
      and(eq(blockedUsers.blockerUserId, buyerUserId), eq(blockedUsers.blockedUserId, listing.sellerUserId)),
      and(eq(blockedUsers.blockerUserId, listing.sellerUserId), eq(blockedUsers.blockedUserId, buyerUserId)),
    )!).limit(2);
    if (isBlockedEitherDirection(blockRows, buyerUserId, listing.sellerUserId)) {
      throw new Error("This member is blocked; new purchase requests are unavailable");
    }
    if (input.quantity < listing.minimumOrder) throw new Error(`Minimum order is ${listing.minimumOrder} ${listing.quantityUnit}`);
    if (input.quantity > listing.quantityAvailable) throw new Error("Requested quantity exceeds current availability");
    const ids = await tx.insert(purchaseRequests).values({
      buyerUserId,
      sellerUserId: listing.sellerUserId,
      listingId: listing.id,
      quantity: input.quantity,
      quantityUnit: listing.quantityUnit,
      proposedPriceMinor: input.proposedPriceNaira !== undefined ? priceNairaToMinorUnits(input.proposedPriceNaira) : null,
      deliveryPreference: input.deliveryPreference,
      buyerNote: input.buyerNote || null,
      status: "pending",
    }).$returningId();
    const requestId = ids[0]?.id;
    if (!requestId) throw new Error("The request could not be saved");
    await tx.insert(conversations).values({
      listingId: listing.id,
      buyerUserId,
      sellerUserId: listing.sellerUserId,
    }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
    const [conversation] = await tx.select().from(conversations)
      .where(and(eq(conversations.listingId, listing.id), eq(conversations.buyerUserId, buyerUserId)))
      .limit(1).for("update");
    if (!conversation) throw new Error("The conversation could not be created");
    if (input.buyerNote?.trim()) {
      await tx.insert(conversationMessages).values({
        conversationId: conversation.id,
        senderUserId: buyerUserId,
        body: input.buyerNote.trim(),
      });
      await tx.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversation.id));
    }
    return { id: requestId, conversationId: conversation.id };
  });
}

export async function respondToPurchaseRequest(sellerUserId: number, id: number, response: "accept" | "decline") {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [request] = await tx.select().from(purchaseRequests).where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.sellerUserId, sellerUserId))).limit(1).for("update");
    if (!request) throw new Error("Request not found or not assigned to this seller");
    if (response === "accept") {
      const blockRows = await tx.select({
        blockerUserId: blockedUsers.blockerUserId,
        blockedUserId: blockedUsers.blockedUserId,
      }).from(blockedUsers).where(or(
        and(eq(blockedUsers.blockerUserId, sellerUserId), eq(blockedUsers.blockedUserId, request.buyerUserId)),
        and(eq(blockedUsers.blockerUserId, request.buyerUserId), eq(blockedUsers.blockedUserId, sellerUserId)),
      )!).limit(2);
      if (isBlockedEitherDirection(blockRows, sellerUserId, request.buyerUserId)) {
        throw new Error("This member is blocked; the request cannot be accepted");
      }
    }
    const next = nextRequestStatus(request.status as RequestStatus, response);
    if (next === "declined") {
      await tx.update(purchaseRequests).set({ status: "declined", updatedAt: new Date() }).where(eq(purchaseRequests.id, id));
      return { status: "declined" as const, orderId: null };
    }
    const [listing] = await tx.select().from(listings).where(eq(listings.id, request.listingId)).limit(1).for("update");
    if (!listing || listing.status !== "active" || listing.quantityAvailable < request.quantity) {
      throw new Error("Availability changed; update the listing before accepting this request");
    }
    const agreedUnitPrice = request.proposedPriceMinor ?? listing.priceMinor;
    const totalMinor = orderTotalMinorUnits(agreedUnitPrice, request.quantity);
    const orderIds = await tx.insert(orders).values({
      orderNumber: `AG-${nanoid(8).toUpperCase()}`,
      requestId: request.id,
      listingId: listing.id,
      buyerUserId: request.buyerUserId,
      sellerUserId,
      quantity: request.quantity,
      quantityUnit: request.quantityUnit,
      totalMinor,
      status: "confirmed",
    }).$returningId();
    if (!orderIds[0]) throw new Error("Order could not be created");
    const orderId = orderIds[0].id;
    const remaining = listing.quantityAvailable - request.quantity;
    await tx.update(listings).set({ quantityAvailable: remaining, status: remaining === 0 ? "paused" : listing.status, updatedAt: new Date() }).where(eq(listings.id, listing.id));
    await tx.update(purchaseRequests).set({ status: "accepted", updatedAt: new Date() }).where(eq(purchaseRequests.id, request.id));
    await tx.insert(paymentRecords).values({ orderId, amountMinor: totalMinor, currency: "NGN", provider: "not_connected", status: INITIAL_PAYMENT_STATUS });
    await tx.insert(orderEvents).values({ orderId, actorUserId: sellerUserId, fromStatus: null, toStatus: "confirmed", note: "Order created after seller acceptance" });
    await tx.update(conversations).set({ orderId, updatedAt: new Date() }).where(and(eq(conversations.listingId, listing.id), eq(conversations.buyerUserId, request.buyerUserId)));
    return { status: "accepted" as const, orderId };
  });
}

export async function getRequestsForUser(userId: number, accountType: "buyer" | "seller") {
  const db = requireDb(await getDb());
  const where = accountType === "buyer" ? eq(purchaseRequests.buyerUserId, userId) : eq(purchaseRequests.sellerUserId, userId);
  const otherUserId = accountType === "buyer" ? purchaseRequests.sellerUserId : purchaseRequests.buyerUserId;
  return db.select({
    id: purchaseRequests.id,
    listingId: purchaseRequests.listingId,
    listingSlug: listings.slug,
    listingTitle: listings.title,
    quantity: purchaseRequests.quantity,
    quantityUnit: purchaseRequests.quantityUnit,
    proposedPriceMinor: purchaseRequests.proposedPriceMinor,
    deliveryPreference: purchaseRequests.deliveryPreference,
    buyerNote: purchaseRequests.buyerNote,
    status: purchaseRequests.status,
    createdAt: purchaseRequests.createdAt,
      otherPartyName: sql<string>`case when ${marketplaceProfiles.accountType} = 'buyer' then 'Private buyer' when ${marketplaceProfiles.accountType} = 'seller' and (${marketplaceProfiles.profileVisible} = 0 or ${marketplaceProfiles.showDisplayName} = 0) then 'Marketplace seller' else ${marketplaceProfiles.displayName} end`,
      otherPartyBusinessName: sql<string | null>`case when ${marketplaceProfiles.accountType} = 'buyer' and ${marketplaceProfiles.shareBusinessWithSellers} = 1 then ${marketplaceProfiles.businessName} when ${marketplaceProfiles.accountType} = 'seller' and ${marketplaceProfiles.profileVisible} = 1 and ${marketplaceProfiles.showBusinessName} = 1 then ${marketplaceProfiles.businessName} else null end`,
      otherPartyUserId: otherUserId,
  }).from(purchaseRequests)
    .innerJoin(listings, eq(listings.id, purchaseRequests.listingId))
    .leftJoin(marketplaceProfiles, eq(marketplaceProfiles.userId, otherUserId))
    .where(where)
    .orderBy(desc(purchaseRequests.createdAt))
    .limit(80);
}

export async function listOrdersForUser(userId: number, accountType: "buyer" | "seller") {
  const db = requireDb(await getDb());
  const where = accountType === "buyer" ? eq(orders.buyerUserId, userId) : eq(orders.sellerUserId, userId);
  const otherUserId = accountType === "buyer" ? orders.sellerUserId : orders.buyerUserId;
  return db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    listingTitle: listings.title,
    listingSlug: listings.slug,
    quantity: orders.quantity,
    quantityUnit: orders.quantityUnit,
    totalMinor: orders.totalMinor,
    status: orders.status,
    createdAt: orders.createdAt,
    otherPartyName: sql<string>`case when ${marketplaceProfiles.accountType} = 'buyer' then 'Private buyer' when ${marketplaceProfiles.accountType} = 'seller' and (${marketplaceProfiles.profileVisible} = 0 or ${marketplaceProfiles.showDisplayName} = 0) then 'Marketplace seller' else ${marketplaceProfiles.displayName} end`,
    paymentStatus: paymentRecords.status,
    currency: paymentRecords.currency,
  }).from(orders)
    .innerJoin(listings, eq(listings.id, orders.listingId))
    .leftJoin(marketplaceProfiles, eq(marketplaceProfiles.userId, otherUserId))
    .leftJoin(paymentRecords, eq(paymentRecords.orderId, orders.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(80);
}

export async function updateOrderStatus(userId: number, id: number, next: OrderStatus) {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1).for("update");
    if (!order) throw new Error("Order not found");
    const actor = order.sellerUserId === userId ? "seller" : order.buyerUserId === userId ? "buyer" : null;
    if (!actor) throw new Error("You do not have access to this order");
    if (!canTransitionOrder(order.status as OrderStatus, next, actor)) throw new Error(`The order cannot move from ${order.status} to ${next}`);
    await tx.update(orders).set({ status: next, updatedAt: new Date() }).where(eq(orders.id, id));
    await tx.insert(orderEvents).values({ orderId: id, actorUserId: userId, fromStatus: order.status, toStatus: next, note: null });
    return { id, status: next };
  });
}

export async function listConversations(userId: number) {
  const db = requireDb(await getDb());
  const threads = await db.select({
    id: conversations.id,
    listingId: conversations.listingId,
    listingTitle: listings.title,
    listingSlug: listings.slug,
    buyerUserId: conversations.buyerUserId,
    sellerUserId: conversations.sellerUserId,
    updatedAt: conversations.updatedAt,
  }).from(conversations)
    .innerJoin(listings, eq(listings.id, conversations.listingId))
    .where(or(eq(conversations.buyerUserId, userId), eq(conversations.sellerUserId, userId)))
    .orderBy(desc(conversations.updatedAt))
    .limit(80);
  const blockRows = await db.select({ blockerUserId: blockedUsers.blockerUserId, blockedUserId: blockedUsers.blockedUserId })
    .from(blockedUsers).where(or(eq(blockedUsers.blockerUserId, userId), eq(blockedUsers.blockedUserId, userId)));
  return threads.map(thread => {
    const otherPartyUserId = thread.buyerUserId === userId ? thread.sellerUserId : thread.buyerUserId;
    return {
      ...thread,
      otherPartyUserId,
      blockedByMe: blockRows.some(row => row.blockerUserId === userId && row.blockedUserId === otherPartyUserId),
      blockedMe: blockRows.some(row => row.blockerUserId === otherPartyUserId && row.blockedUserId === userId),
    };
  });
}

export async function getConversationMessages(userId: number, conversationId: number) {
  const db = requireDb(await getDb());
  const [thread] = await db.select({ id: conversations.id }).from(conversations)
    .where(and(eq(conversations.id, conversationId), or(eq(conversations.buyerUserId, userId), eq(conversations.sellerUserId, userId))))
    .limit(1);
  if (!thread) throw new Error("Conversation not found or not accessible");
  return db.select({
    id: conversationMessages.id,
    senderUserId: conversationMessages.senderUserId,
    body: conversationMessages.body,
    createdAt: conversationMessages.createdAt,
  }).from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(conversationMessages.createdAt)
    .limit(300);
}

export async function sendConversationMessage(userId: number, conversationId: number, body: string) {
  const db = requireDb(await getDb());
  const [thread] = await db.select({ id: conversations.id, buyerUserId: conversations.buyerUserId, sellerUserId: conversations.sellerUserId }).from(conversations)
    .where(and(eq(conversations.id, conversationId), or(eq(conversations.buyerUserId, userId), eq(conversations.sellerUserId, userId))))
    .limit(1);
  if (!thread) throw new Error("Conversation not found or not accessible");
  const blockRows = await db.select({ blockerUserId: blockedUsers.blockerUserId, blockedUserId: blockedUsers.blockedUserId })
    .from(blockedUsers).where(or(
      and(eq(blockedUsers.blockerUserId, thread.buyerUserId), eq(blockedUsers.blockedUserId, thread.sellerUserId)),
      and(eq(blockedUsers.blockerUserId, thread.sellerUserId), eq(blockedUsers.blockedUserId, thread.buyerUserId)),
    )!).limit(2);
  if (isBlockedEitherDirection(blockRows, thread.buyerUserId, thread.sellerUserId)) {
    throw new Error("This conversation is blocked; messages cannot be sent");
  }
  const ids = await db.insert(conversationMessages).values({ conversationId, senderUserId: userId, body }).$returningId();
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
  return { id: ids[0]?.id ?? null };
}

export async function blockConversation(userId: number, conversationId: number) {
  const db = requireDb(await getDb());
  const [thread] = await db.select({ buyerUserId: conversations.buyerUserId, sellerUserId: conversations.sellerUserId })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), or(eq(conversations.buyerUserId, userId), eq(conversations.sellerUserId, userId))))
    .limit(1);
  if (!thread) throw new Error("Conversation not found or not accessible");
  const blockedUserId = thread.buyerUserId === userId ? thread.sellerUserId : thread.buyerUserId;
  await db.insert(blockedUsers).values({ blockerUserId: userId, blockedUserId })
    .onDuplicateKeyUpdate({ set: { createdAt: new Date() } });
  return { blockedUserId, blocked: true as const };
}

export async function unblockUser(userId: number, blockedUserId: number) {
  const db = requireDb(await getDb());
  if (blockedUserId === userId) throw new Error("You cannot unblock yourself");
  await db.delete(blockedUsers).where(and(eq(blockedUsers.blockerUserId, userId), eq(blockedUsers.blockedUserId, blockedUserId)));
  return { blockedUserId, blocked: false as const };
}

export async function listBlockedUsers(userId: number) {
  const db = requireDb(await getDb());
  return db.select({
    userId: blockedUsers.blockedUserId,
    displayName: marketplaceProfiles.displayName,
    businessName: marketplaceProfiles.businessName,
    createdAt: blockedUsers.createdAt,
  }).from(blockedUsers)
    .leftJoin(marketplaceProfiles, eq(marketplaceProfiles.userId, blockedUsers.blockedUserId))
    .where(eq(blockedUsers.blockerUserId, userId))
    .orderBy(desc(blockedUsers.createdAt));
}

export async function createReport(userId: number, input: { listingId?: number; reportedUserId?: number; conversationId?: number; reason: string; details?: string }) {
  const db = requireDb(await getDb());
  let listingId = input.listingId;
  let reportedUserId = input.reportedUserId;
  if (input.conversationId) {
    const [thread] = await db.select({ id: conversations.id, listingId: conversations.listingId, buyerUserId: conversations.buyerUserId, sellerUserId: conversations.sellerUserId })
      .from(conversations)
      .where(and(eq(conversations.id, input.conversationId), or(eq(conversations.buyerUserId, userId), eq(conversations.sellerUserId, userId))))
      .limit(1);
    if (!thread) throw new Error("Conversation not found or not accessible");
    const otherPartyUserId = thread.buyerUserId === userId ? thread.sellerUserId : thread.buyerUserId;
    if ((listingId !== undefined && listingId !== thread.listingId) || (reportedUserId !== undefined && reportedUserId !== otherPartyUserId)) {
      throw new Error("Report target does not match the conversation");
    }
    listingId = thread.listingId;
    reportedUserId = otherPartyUserId;
  }
  if (listingId) {
    const [listing] = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, listingId)).limit(1);
    if (!listing) throw new Error("Listing not found");
  }
  if (reportedUserId) {
    const [reported] = await db.select({ id: users.id }).from(users).where(eq(users.id, reportedUserId)).limit(1);
    if (!reported) throw new Error("Seller not found");
  }
  const ids = await db.insert(marketplaceReports).values({
    reporterUserId: userId,
    listingId: listingId ?? null,
    reportedUserId: reportedUserId ?? null,
    conversationId: input.conversationId ?? null,
    reason: input.reason,
    details: input.details || null,
  }).$returningId();
  return { id: ids[0]?.id ?? null, status: "open" as const };
}

export async function getAdminOverview() {
  const db = requireDb(await getDb());
  const [userCount] = await db.select({ value: sql<number>`count(*)` }).from(users);
  const [activeListings] = await db.select({ value: sql<number>`count(*)` }).from(listings).where(eq(listings.status, "active"));
  const [pendingListings] = await db.select({ value: sql<number>`count(*)` }).from(listings).where(eq(listings.status, "pending"));
  const [openReports] = await db.select({ value: sql<number>`count(*)` }).from(marketplaceReports).where(eq(marketplaceReports.status, "open"));
  const [pendingProfiles] = await db.select({ value: sql<number>`count(*)` }).from(marketplaceProfiles)
    .where(and(eq(marketplaceProfiles.verificationStatus, "pending"), eq(marketplaceProfiles.accountType, "seller")));
  const [openDeletionRequests] = await db.select({ value: sql<number>`count(*)` }).from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.status, "open"));
  return {
    users: Number(userCount?.value ?? 0),
    activeListings: Number(activeListings?.value ?? 0),
    pendingListings: Number(pendingListings?.value ?? 0),
    openReports: Number(openReports?.value ?? 0),
    pendingProfiles: Number(pendingProfiles?.value ?? 0),
    openDeletionRequests: Number(openDeletionRequests?.value ?? 0),
  };
}

export async function getAdminQueue() {
  const db = requireDb(await getDb());
  const pendingListings = await db.select({
    id: listings.id,
    title: listings.title,
    category: listings.category,
    location: listings.location,
    quantityAvailable: listings.quantityAvailable,
    quantityUnit: listings.quantityUnit,
    createdAt: listings.createdAt,
    sellerUserId: listings.sellerUserId,
    sellerName: marketplaceProfiles.displayName,
  }).from(listings)
    .innerJoin(marketplaceProfiles, eq(marketplaceProfiles.userId, listings.sellerUserId))
    .where(and(eq(listings.status, "pending"), eq(marketplaceProfiles.accountType, "seller")))
    .orderBy(desc(listings.createdAt)).limit(80);
  const pendingProfiles = await db.select({
    userId: marketplaceProfiles.userId,
    displayName: marketplaceProfiles.displayName,
    accountType: marketplaceProfiles.accountType,
    location: marketplaceProfiles.location,
    createdAt: marketplaceProfiles.updatedAt,
  }).from(marketplaceProfiles)
    .where(and(eq(marketplaceProfiles.verificationStatus, "pending"), eq(marketplaceProfiles.accountType, "seller")))
    .orderBy(desc(marketplaceProfiles.updatedAt)).limit(80);
  const reports = await db.select({
    id: marketplaceReports.id,
    reason: marketplaceReports.reason,
    details: marketplaceReports.details,
    listingId: marketplaceReports.listingId,
    reportedUserId: marketplaceReports.reportedUserId,
    conversationId: marketplaceReports.conversationId,
    status: marketplaceReports.status,
    createdAt: marketplaceReports.createdAt,
  }).from(marketplaceReports)
    .where(eq(marketplaceReports.status, "open"))
    .orderBy(desc(marketplaceReports.createdAt)).limit(80);
  const deletionRequests = await db.select({
    id: accountDeletionRequests.id,
    userId: accountDeletionRequests.userId,
    userName: users.name,
    status: accountDeletionRequests.status,
    requestedAt: accountDeletionRequests.requestedAt,
  }).from(accountDeletionRequests)
    .innerJoin(users, eq(users.id, accountDeletionRequests.userId))
    .where(eq(accountDeletionRequests.status, "open"))
    .orderBy(desc(accountDeletionRequests.requestedAt)).limit(80);
  return { pendingListings, pendingProfiles, reports, deletionRequests };
}

export async function submitProfileVerification(userId: number) {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [profile] = await tx.select().from(marketplaceProfiles)
      .where(eq(marketplaceProfiles.userId, userId)).limit(1).for("update");
    if (!profile || profile.accountType !== "seller") throw new Error("A farmer/seller profile is required to request identity review");
    if (profile.verificationStatus === "verified" || profile.verificationStatus === "pending") {
      return { status: profile.verificationStatus };
    }
    await tx.update(marketplaceProfiles)
      .set({ verificationStatus: "pending", updatedAt: new Date() })
      .where(eq(marketplaceProfiles.userId, userId));
    return { status: "pending" as const };
  });
}

export async function moderateListing(adminUserId: number, listingId: number, decision: "approve" | "reject") {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [listing] = await tx.select().from(listings).where(eq(listings.id, listingId)).limit(1).for("update");
    if (!listing || listing.status !== "pending") throw new Error("Pending listing not found");
    const [seller] = await tx.select({ accountType: marketplaceProfiles.accountType }).from(marketplaceProfiles)
      .where(eq(marketplaceProfiles.userId, listing.sellerUserId)).limit(1);
    if (!seller || seller.accountType !== "seller") throw new Error("Pending listing not found");
    const status = decision === "approve" ? "active" as const : "rejected" as const;
    await tx.update(listings).set({ status, updatedAt: new Date() }).where(eq(listings.id, listingId));
    await tx.insert(listingModerationEvents).values({ listingId, reviewerUserId: adminUserId, decision });
    return { id: listingId, status, reviewedBy: adminUserId };
  });
}

export async function setProfileVerification(adminUserId: number, userId: number, status: "verified" | "needs_changes") {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [profile] = await tx.select().from(marketplaceProfiles)
      .where(eq(marketplaceProfiles.userId, userId)).limit(1).for("update");
    if (!profile || profile.accountType !== "seller") throw new Error("Marketplace seller profile not found");
    if (profile.verificationStatus !== "pending") throw new Error("Identity review is no longer pending");
    await tx.update(marketplaceProfiles).set({ verificationStatus: status, updatedAt: new Date() })
      .where(eq(marketplaceProfiles.userId, userId));
    await tx.insert(profileVerificationEvents).values({ profileUserId: userId, reviewerUserId: adminUserId, status });
    return { userId, status, reviewedBy: adminUserId };
  });
}

export async function resolveReport(adminUserId: number, id: number, status: "resolved" | "dismissed") {
  const db = requireDb(await getDb());
  const [report] = await db.select({ id: marketplaceReports.id }).from(marketplaceReports).where(and(eq(marketplaceReports.id, id), eq(marketplaceReports.status, "open"))).limit(1);
  if (!report) throw new Error("Open report not found");
  await db.update(marketplaceReports).set({ status, reviewedBy: adminUserId, updatedAt: new Date() }).where(eq(marketplaceReports.id, id));
  return { id, status };
}

export async function getOrderTimeline(userId: number, orderId: number) {
  const db = requireDb(await getDb());
  const [order] = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.id, orderId), or(eq(orders.buyerUserId, userId), eq(orders.sellerUserId, userId))))
    .limit(1);
  if (!order) throw new Error("Order not found or not accessible");
  return db.select({ fromStatus: orderEvents.fromStatus, toStatus: orderEvents.toStatus, note: orderEvents.note, createdAt: orderEvents.createdAt })
    .from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(orderEvents.createdAt);
}

export async function exportUserData(userId: number) {
  const db = requireDb(await getDb());
  const [identity] = await db.select({
    name: users.name,
    email: users.email,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!identity) throw new Error("User not found");

  const [profile] = await db.select().from(marketplaceProfiles).where(eq(marketplaceProfiles.userId, userId)).limit(1);
  const ownListings = await db.select().from(listings).where(eq(listings.sellerUserId, userId));
  const ownSavedSuppliers = await db.select().from(savedSuppliers).where(eq(savedSuppliers.buyerUserId, userId));
  const ownRequests = await db.select().from(purchaseRequests)
    .where(or(eq(purchaseRequests.buyerUserId, userId), eq(purchaseRequests.sellerUserId, userId)));
  const ownOrders = await db.select().from(orders)
    .where(or(eq(orders.buyerUserId, userId), eq(orders.sellerUserId, userId)));
  const orderIds = ownOrders.map(order => order.id);
  const ownPayments = orderIds.length
    ? await db.select().from(paymentRecords).where(inArray(paymentRecords.orderId, orderIds))
    : [];
  const ownOrderEvents = orderIds.length
    ? await db.select().from(orderEvents).where(inArray(orderEvents.orderId, orderIds))
    : [];
  const ownConversations = await db.select().from(conversations)
    .where(or(eq(conversations.buyerUserId, userId), eq(conversations.sellerUserId, userId)));
  const conversationIds = ownConversations.map(thread => thread.id);
  const ownMessages = conversationIds.length
    ? await db.select().from(conversationMessages).where(inArray(conversationMessages.conversationId, conversationIds))
    : [];
  const ownReports = await db.select().from(marketplaceReports).where(eq(marketplaceReports.reporterUserId, userId));
  const ownBlocks = await db.select().from(blockedUsers).where(eq(blockedUsers.blockerUserId, userId));
  const [deletionRequest] = await db.select().from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.userId, userId)).limit(1);
  return {
    exportedAt: new Date().toISOString(),
    identity,
    profile: profile ?? null,
    listings: ownListings,
    savedSuppliers: ownSavedSuppliers,
    purchaseRequests: ownRequests,
    orders: ownOrders,
    paymentRecords: ownPayments,
    orderEvents: ownOrderEvents,
    conversations: ownConversations,
    messages: ownMessages,
    reports: ownReports,
    blockedUsers: ownBlocks,
    deletionRequest: deletionRequest ?? null,
  };
}

export async function getDeletionRequest(userId: number) {
  const db = requireDb(await getDb());
  const [request] = await db.select().from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.userId, userId)).limit(1);
  return request ?? null;
}

export async function requestAccountDeletion(userId: number) {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [existing] = await tx.select().from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.userId, userId)).limit(1).for("update");
    const now = new Date();
    if (existing?.status === "open") return existing;
    if (existing) {
      await tx.update(accountDeletionRequests).set({
        status: "open",
        requestedAt: now,
        reviewedBy: null,
        updatedAt: now,
      }).where(eq(accountDeletionRequests.id, existing.id));
      const [updated] = await tx.select().from(accountDeletionRequests)
        .where(eq(accountDeletionRequests.id, existing.id)).limit(1);
      return updated ?? null;
    }
    const ids = await tx.insert(accountDeletionRequests).values({ userId, status: "open", requestedAt: now, updatedAt: now }).$returningId();
    const requestId = ids[0]?.id;
    if (!requestId) throw new Error("The deletion request could not be saved");
    const [created] = await tx.select().from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.id, requestId)).limit(1);
    return created ?? null;
  });
}

export async function cancelAccountDeletionRequest(userId: number) {
  const db = requireDb(await getDb());
  const [request] = await db.select().from(accountDeletionRequests)
    .where(and(eq(accountDeletionRequests.userId, userId), inArray(accountDeletionRequests.status, ["open", "acknowledged"])))
    .limit(1);
  if (!request) throw new Error("No active deletion request to withdraw");
  await db.update(accountDeletionRequests).set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(accountDeletionRequests.id, request.id));
  return { id: request.id, status: "cancelled" as const };
}

export async function acknowledgeDeletionRequest(adminUserId: number, id: number) {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    const [request] = await tx.select().from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.id, id), eq(accountDeletionRequests.status, "open")))
      .limit(1).for("update");
    if (!request) throw new Error("Open deletion request not found");
    await tx.update(accountDeletionRequests).set({ status: "acknowledged", reviewedBy: adminUserId, updatedAt: new Date() })
      .where(eq(accountDeletionRequests.id, id));
    return { id, status: "acknowledged" as const, reviewedBy: adminUserId };
  });
}
