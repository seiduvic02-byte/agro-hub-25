import {
  boolean,
  bigint,
  foreignKey,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Manus identity and platform-level administrator role. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const marketplaceProfiles = mysqlTable("marketplace_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  accountType: mysqlEnum("accountType", ["buyer", "seller"]).notNull(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  businessName: varchar("businessName", { length: 180 }),
  location: varchar("location", { length: 120 }).notNull(),
  bio: text("bio"),
  profileVisible: boolean("profileVisible").default(true).notNull(),
  showDisplayName: boolean("showDisplayName").default(true).notNull(),
  showBusinessName: boolean("showBusinessName").default(true).notNull(),
  showLocation: boolean("showLocation").default(true).notNull(),
  showBio: boolean("showBio").default(true).notNull(),
  contactInfo: varchar("contactInfo", { length: 240 }),
  showContactInfo: boolean("showContactInfo").default(false).notNull(),
  shareBusinessWithSellers: boolean("shareBusinessWithSellers").default(false).notNull(),
  activityEmails: boolean("activityEmails").default(false).notNull(),
  marketingEmails: boolean("marketingEmails").default(false).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["not_started", "pending", "verified", "needs_changes"]).default("not_started").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  foreignKey({ name: "mp_user_fk", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  index("marketplace_profiles_type_idx").on(table.accountType),
]);

export type MarketplaceProfile = typeof marketplaceProfiles.$inferSelect;

export const listings = mysqlTable("produce_listings", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  sellerUserId: int("sellerUserId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  priceMinor: bigint("priceMinor", { mode: "number" }).notNull(),
  priceUnit: varchar("priceUnit", { length: 40 }).notNull(),
  quantityAvailable: int("quantityAvailable").notNull(),
  quantityUnit: varchar("quantityUnit", { length: 30 }).notNull(),
  minimumOrder: int("minimumOrder").default(1).notNull(),
  location: varchar("location", { length: 120 }).notNull(),
  description: text("description").notNull(),
  imageUrl: varchar("imageUrl", { length: 512 }),
  status: mysqlEnum("status", ["pending", "active", "paused", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  foreignKey({ name: "pl_seller_fk", columns: [table.sellerUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  index("produce_listings_status_created_idx").on(table.status, table.createdAt),
  index("produce_listings_seller_idx").on(table.sellerUserId, table.status),
  index("produce_listings_category_idx").on(table.category, table.status),
]);

export type Listing = typeof listings.$inferSelect;

export const savedSuppliers = mysqlTable("saved_suppliers", {
  id: int("id").autoincrement().primaryKey(),
  buyerUserId: int("buyerUserId").notNull(),
  sellerUserId: int("sellerUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  foreignKey({ name: "ss_buyer_fk", columns: [table.buyerUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "ss_seller_fk", columns: [table.sellerUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  uniqueIndex("saved_suppliers_buyer_seller_unique").on(table.buyerUserId, table.sellerUserId),
]);

export const purchaseRequests = mysqlTable("purchase_requests", {
  id: int("id").autoincrement().primaryKey(),
  buyerUserId: int("buyerUserId").notNull(),
  sellerUserId: int("sellerUserId").notNull(),
  listingId: int("listingId").notNull(),
  quantity: int("quantity").notNull(),
  quantityUnit: varchar("quantityUnit", { length: 30 }).notNull(),
  proposedPriceMinor: bigint("proposedPriceMinor", { mode: "number" }),
  deliveryPreference: mysqlEnum("deliveryPreference", ["pickup", "seller_delivery"]).notNull(),
  buyerNote: text("buyerNote"),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  foreignKey({ name: "pr_buyer_fk", columns: [table.buyerUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "pr_seller_fk", columns: [table.sellerUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "pr_listing_fk", columns: [table.listingId], foreignColumns: [listings.id] }).onDelete("restrict"),
  index("purchase_requests_buyer_idx").on(table.buyerUserId, table.createdAt),
  index("purchase_requests_seller_idx").on(table.sellerUserId, table.status, table.createdAt),
]);

export type PurchaseRequest = typeof purchaseRequests.$inferSelect;

export const orders = mysqlTable("marketplace_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 40 }).notNull().unique(),
  requestId: int("requestId").notNull().unique(),
  listingId: int("listingId").notNull(),
  buyerUserId: int("buyerUserId").notNull(),
  sellerUserId: int("sellerUserId").notNull(),
  quantity: int("quantity").notNull(),
  quantityUnit: varchar("quantityUnit", { length: 30 }).notNull(),
  totalMinor: bigint("totalMinor", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["confirmed", "preparing", "ready", "in_transit", "completed", "cancelled"]).default("confirmed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  foreignKey({ name: "mo_request_fk", columns: [table.requestId], foreignColumns: [purchaseRequests.id] }).onDelete("restrict"),
  foreignKey({ name: "mo_listing_fk", columns: [table.listingId], foreignColumns: [listings.id] }).onDelete("restrict"),
  foreignKey({ name: "mo_buyer_fk", columns: [table.buyerUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  foreignKey({ name: "mo_seller_fk", columns: [table.sellerUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  index("marketplace_orders_buyer_idx").on(table.buyerUserId, table.createdAt),
  index("marketplace_orders_seller_idx").on(table.sellerUserId, table.status, table.createdAt),
]);

export type MarketplaceOrder = typeof orders.$inferSelect;

/** No gateway is configured in this build; these records never claim a captured payment. */
export const paymentRecords = mysqlTable("marketplace_payment_records", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  amountMinor: bigint("amountMinor", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  provider: varchar("provider", { length: 40 }).default("not_connected").notNull(),
  status: mysqlEnum("status", ["not_connected", "pending", "paid", "failed"]).default("not_connected").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  foreignKey({ name: "mpr_order_fk", columns: [table.orderId], foreignColumns: [orders.id] }).onDelete("cascade"),
]);

export const conversations = mysqlTable("marketplace_conversations", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(),
  buyerUserId: int("buyerUserId").notNull(),
  sellerUserId: int("sellerUserId").notNull(),
  orderId: int("orderId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  foreignKey({ name: "mc_listing_fk", columns: [table.listingId], foreignColumns: [listings.id] }).onDelete("cascade"),
  foreignKey({ name: "mc_buyer_fk", columns: [table.buyerUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "mc_seller_fk", columns: [table.sellerUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "mc_order_fk", columns: [table.orderId], foreignColumns: [orders.id] }).onDelete("set null"),
  uniqueIndex("marketplace_conversation_listing_buyer_unique").on(table.listingId, table.buyerUserId),
  index("marketplace_conversations_buyer_idx").on(table.buyerUserId, table.updatedAt),
  index("marketplace_conversations_seller_idx").on(table.sellerUserId, table.updatedAt),
]);

export const conversationMessages = mysqlTable("marketplace_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderUserId: int("senderUserId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  foreignKey({ name: "mm_conversation_fk", columns: [table.conversationId], foreignColumns: [conversations.id] }).onDelete("cascade"),
  foreignKey({ name: "mm_sender_fk", columns: [table.senderUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  index("marketplace_messages_conversation_idx").on(table.conversationId, table.createdAt),
]);

export const blockedUsers = mysqlTable("marketplace_blocked_users", {
  id: int("id").autoincrement().primaryKey(),
  blockerUserId: int("blockerUserId").notNull(),
  blockedUserId: int("blockedUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  foreignKey({ name: "mb_blocker_fk", columns: [table.blockerUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "mb_blocked_fk", columns: [table.blockedUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  uniqueIndex("marketplace_blocker_blocked_unique").on(table.blockerUserId, table.blockedUserId),
  index("marketplace_blocked_users_owner_idx").on(table.blockerUserId, table.createdAt),
]);

export const orderEvents = mysqlTable("marketplace_order_events", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  fromStatus: varchar("fromStatus", { length: 30 }),
  toStatus: varchar("toStatus", { length: 30 }).notNull(),
  note: varchar("note", { length: 240 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  foreignKey({ name: "moe_order_fk", columns: [table.orderId], foreignColumns: [orders.id] }).onDelete("cascade"),
  foreignKey({ name: "moe_actor_fk", columns: [table.actorUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  index("marketplace_order_events_order_idx").on(table.orderId, table.createdAt),
]);

export const marketplaceReports = mysqlTable("marketplace_reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterUserId: int("reporterUserId").notNull(),
  listingId: int("listingId"),
  reportedUserId: int("reportedUserId"),
  conversationId: int("conversationId"),
  reason: varchar("reason", { length: 80 }).notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["open", "resolved", "dismissed"]).default("open").notNull(),
  reviewedBy: int("reviewedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  foreignKey({ name: "mr_reporter_fk", columns: [table.reporterUserId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "mr_listing_fk", columns: [table.listingId], foreignColumns: [listings.id] }).onDelete("set null"),
  foreignKey({ name: "mr_reported_fk", columns: [table.reportedUserId], foreignColumns: [users.id] }).onDelete("set null"),
  foreignKey({ name: "mr_conversation_fk", columns: [table.conversationId], foreignColumns: [conversations.id] }).onDelete("set null"),
  foreignKey({ name: "mr_reviewer_fk", columns: [table.reviewedBy], foreignColumns: [users.id] }).onDelete("set null"),
  index("marketplace_reports_status_idx").on(table.status, table.createdAt),
]);

export const listingModerationEvents = mysqlTable("listing_moderation_events", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(),
  reviewerUserId: int("reviewerUserId").notNull(),
  decision: mysqlEnum("decision", ["approve", "reject"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  foreignKey({ name: "lme_listing_fk", columns: [table.listingId], foreignColumns: [listings.id] }).onDelete("cascade"),
  foreignKey({ name: "lme_reviewer_fk", columns: [table.reviewerUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  index("lme_listing_created_idx").on(table.listingId, table.createdAt),
]);

export const profileVerificationEvents = mysqlTable("profile_verification_events", {
  id: int("id").autoincrement().primaryKey(),
  profileUserId: int("profileUserId").notNull(),
  reviewerUserId: int("reviewerUserId").notNull(),
  status: mysqlEnum("status", ["verified", "needs_changes"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  foreignKey({ name: "pve_profile_fk", columns: [table.profileUserId], foreignColumns: [marketplaceProfiles.userId] }).onDelete("cascade"),
  foreignKey({ name: "pve_reviewer_fk", columns: [table.reviewerUserId], foreignColumns: [users.id] }).onDelete("restrict"),
  index("pve_profile_created_idx").on(table.profileUserId, table.createdAt),
]);

export const accountDeletionRequests = mysqlTable("account_deletion_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  status: mysqlEnum("status", ["open", "acknowledged", "cancelled"]).default("open").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  reviewedBy: int("reviewedBy"),
}, table => [
  foreignKey({ name: "adr_user_fk", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "adr_reviewer_fk", columns: [table.reviewedBy], foreignColumns: [users.id] }).onDelete("set null"),
  index("account_deletion_status_idx").on(table.status, table.requestedAt),
]);
