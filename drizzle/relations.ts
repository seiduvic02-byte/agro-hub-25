import { relations } from "drizzle-orm";
import {
  accountDeletionRequests,
  blockedUsers,
  conversationMessages,
  conversations,
  listingModerationEvents,
  listings,
  marketplaceProfiles,
  orders,
  paymentRecords,
  profileVerificationEvents,
  purchaseRequests,
  users,
} from "./schema";

export const marketplaceProfilesRelations = relations(marketplaceProfiles, ({ one, many }) => ({
  user: one(users, { fields: [marketplaceProfiles.userId], references: [users.id] }),
  listings: many(listings),
  verificationEvents: many(profileVerificationEvents),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  seller: one(marketplaceProfiles, { fields: [listings.sellerUserId], references: [marketplaceProfiles.userId] }),
  requests: many(purchaseRequests),
  conversations: many(conversations),
  moderationEvents: many(listingModerationEvents),
}));

export const listingModerationEventsRelations = relations(listingModerationEvents, ({ one }) => ({
  listing: one(listings, { fields: [listingModerationEvents.listingId], references: [listings.id] }),
  reviewer: one(users, { fields: [listingModerationEvents.reviewerUserId], references: [users.id] }),
}));

export const profileVerificationEventsRelations = relations(profileVerificationEvents, ({ one }) => ({
  profile: one(marketplaceProfiles, { fields: [profileVerificationEvents.profileUserId], references: [marketplaceProfiles.userId] }),
  reviewer: one(users, { fields: [profileVerificationEvents.reviewerUserId], references: [users.id] }),
}));

export const purchaseRequestsRelations = relations(purchaseRequests, ({ one }) => ({
  listing: one(listings, { fields: [purchaseRequests.listingId], references: [listings.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  purchaseRequest: one(purchaseRequests, { fields: [orders.requestId], references: [purchaseRequests.id] }),
  listing: one(listings, { fields: [orders.listingId], references: [listings.id] }),
  payment: one(paymentRecords),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  order: one(orders, { fields: [paymentRecords.orderId], references: [orders.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  listing: one(listings, { fields: [conversations.listingId], references: [listings.id] }),
  messages: many(conversationMessages),
}));

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  conversation: one(conversations, { fields: [conversationMessages.conversationId], references: [conversations.id] }),
}));

export const blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  blocker: one(users, { fields: [blockedUsers.blockerUserId], references: [users.id], relationName: "blocker" }),
  blocked: one(users, { fields: [blockedUsers.blockedUserId], references: [users.id], relationName: "blocked" }),
}));

export const accountDeletionRequestsRelations = relations(accountDeletionRequests, ({ one }) => ({
  user: one(users, { fields: [accountDeletionRequests.userId], references: [users.id], relationName: "deletionRequester" }),
  reviewer: one(users, { fields: [accountDeletionRequests.reviewedBy], references: [users.id], relationName: "deletionReviewer" }),
}));
