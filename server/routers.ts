import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as marketplaceDb from "./marketplaceDb";
import {
  blockConversationSchema,
  deletionRequestSchema,
  listingIdSchema,
  listingInputSchema,
  listingSearchSchema,
  messageInputSchema,
  moderationInputSchema,
  orderStatusInputSchema,
  profileInputSchema,
  privacySettingsSchema,
  purchaseRequestInputSchema,
  reportInputSchema,
  reportResolutionSchema,
  requestResponseSchema,
  slugSchema,
  unblockUserSchema,
  verificationInputSchema,
} from "./marketplaceDomain";

function service<T>(work: () => Promise<T>): Promise<T> {
  return work().catch(error => {
    if (error instanceof TRPCError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (message === "Marketplace storage is not available") {
      console.error("[Marketplace] Database unavailable");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Marketplace storage is temporarily unavailable" });
    }
    const knownBusinessError = [
      "A farmer/seller profile is required",
      "Complete a buyer profile",
      "Listing not found or not owned by this seller",
      "Account type cannot be changed after profile creation",
      "A farmer/seller profile is required to request identity review",
      "Identity review is no longer pending",
      "Marketplace seller profile not found",
      "Price is outside the supported range",
      "Only approved listings",
      "A buyer profile is required",
      "You cannot save your own supplier profile",
      "Supplier not found",
      "Complete a buyer profile before requesting produce",
      "This listing is no longer available",
      "Minimum order is",
      "Requested quantity exceeds current availability",
      "Request not found or not assigned to this seller",
      "This request is no longer pending",
      "Availability changed",
      "Order total is outside the supported range",
      "Order could not be created",
      "Order not found",
      "You do not have access to this order",
      "The order cannot move",
      "Conversation not found or not accessible",
      "Listing not found",
      "Seller not found",
      "Pending listing not found",
      "Marketplace profile not found",
      "The conversation could not be created",
      "Open report not found",
      "This member is blocked",
      "This conversation is blocked",
      "You cannot unblock yourself",
      "No active deletion request to withdraw",
      "Open deletion request not found",
      "The deletion request could not be saved",
      "Report target does not match the conversation",
    ].some(prefix => message.startsWith(prefix));
    if (knownBusinessError) throw new TRPCError({ code: "BAD_REQUEST", message });
    console.error("[Marketplace] Request failed", error instanceof Error ? error.message : "unknown error");
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The marketplace could not complete this request" });
  });
}

async function requireProfile(userId: number, expected?: "buyer" | "seller") {
  const profile = await service(() => marketplaceDb.getProfile(userId));
  if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create a buyer or farmer profile to continue" });
  if (expected && profile.accountType !== expected) {
    throw new TRPCError({ code: "FORBIDDEN", message: `This action requires a ${expected} profile` });
  }
  return profile;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  marketplace: router({
    profile: protectedProcedure.query(({ ctx }) => service(() => marketplaceDb.getProfile(ctx.user.id))),
    saveProfile: protectedProcedure.input(profileInputSchema).mutation(({ ctx, input }) =>
      service(() => marketplaceDb.saveProfile(ctx.user.id, input))),
    privacy: router({
      update: protectedProcedure.input(privacySettingsSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.updatePrivacySettings(ctx.user.id, input))),
      exportMine: protectedProcedure.query(({ ctx }) => service(() => marketplaceDb.exportUserData(ctx.user.id))),
    }),
    account: router({
      deletionRequest: protectedProcedure.query(({ ctx }) => service(() => marketplaceDb.getDeletionRequest(ctx.user.id))),
      requestDeletion: protectedProcedure.mutation(({ ctx }) => service(() => marketplaceDb.requestAccountDeletion(ctx.user.id))),
      cancelDeletion: protectedProcedure.mutation(({ ctx }) => service(() => marketplaceDb.cancelAccountDeletionRequest(ctx.user.id))),
    }),
    submitVerification: protectedProcedure.mutation(async ({ ctx }) => {
      await requireProfile(ctx.user.id, "seller");
      return service(() => marketplaceDb.submitProfileVerification(ctx.user.id));
    }),

    search: publicProcedure.input(listingSearchSchema).query(({ input }) =>
      service(() => marketplaceDb.searchListings(input))),
    listingBySlug: publicProcedure.input(slugSchema).query(({ input }) =>
      service(() => marketplaceDb.getPublicListing(input.slug))),
    sellerById: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) =>
      service(() => marketplaceDb.getPublicSeller(input.userId))),

    createListing: protectedProcedure.input(listingInputSchema).mutation(async ({ ctx, input }) => {
      await requireProfile(ctx.user.id, "seller");
      return service(() => marketplaceDb.createListing(ctx.user.id, input));
    }),
    updateListing: protectedProcedure.input(listingInputSchema.extend({ id: listingIdSchema.shape.id })).mutation(async ({ ctx, input }) => {
      await requireProfile(ctx.user.id, "seller");
      const { id, ...values } = input;
      return service(() => marketplaceDb.updateListing(ctx.user.id, id, values));
    }),
    setListingAvailability: protectedProcedure.input(listingIdSchema.extend({ status: z.enum(["active", "paused"]) })).mutation(async ({ ctx, input }) => {
      await requireProfile(ctx.user.id, "seller");
      return service(() => marketplaceDb.setListingAvailability(ctx.user.id, input.id, input.status));
    }),
    myListings: protectedProcedure.query(async ({ ctx }) => {
      await requireProfile(ctx.user.id, "seller");
      return service(() => marketplaceDb.getSellerListings(ctx.user.id));
    }),

    requests: router({
      create: protectedProcedure.input(purchaseRequestInputSchema).mutation(async ({ ctx, input }) => {
        await requireProfile(ctx.user.id, "buyer");
        return service(() => marketplaceDb.createPurchaseRequest(ctx.user.id, input));
      }),
      mine: protectedProcedure.query(async ({ ctx }) => {
        const profile = await requireProfile(ctx.user.id);
        return service(() => marketplaceDb.getRequestsForUser(ctx.user.id, profile.accountType));
      }),
      respond: protectedProcedure.input(requestResponseSchema).mutation(async ({ ctx, input }) => {
        await requireProfile(ctx.user.id, "seller");
        return service(() => marketplaceDb.respondToPurchaseRequest(ctx.user.id, input.id, input.response));
      }),
    }),

    savedSuppliers: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        await requireProfile(ctx.user.id, "buyer");
        return service(() => marketplaceDb.getSavedSuppliers(ctx.user.id));
      }),
      toggle: protectedProcedure.input(z.object({ sellerUserId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        await requireProfile(ctx.user.id, "buyer");
        return service(() => marketplaceDb.toggleSavedSupplier(ctx.user.id, input.sellerUserId));
      }),
    }),

    orders: router({
      mine: protectedProcedure.query(async ({ ctx }) => {
        const profile = await requireProfile(ctx.user.id);
        return service(() => marketplaceDb.listOrdersForUser(ctx.user.id, profile.accountType));
      }),
      updateStatus: protectedProcedure.input(orderStatusInputSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.updateOrderStatus(ctx.user.id, input.id, input.status))),
      timeline: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(({ ctx, input }) =>
        service(() => marketplaceDb.getOrderTimeline(ctx.user.id, input.orderId))),
    }),

    conversations: router({
      list: protectedProcedure.query(({ ctx }) => service(() => marketplaceDb.listConversations(ctx.user.id))),
      blockedUsers: protectedProcedure.query(({ ctx }) => service(() => marketplaceDb.listBlockedUsers(ctx.user.id))),
      messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) =>
        service(() => marketplaceDb.getConversationMessages(ctx.user.id, input.conversationId))),
      send: protectedProcedure.input(messageInputSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.sendConversationMessage(ctx.user.id, input.conversationId, input.body))),
      block: protectedProcedure.input(blockConversationSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.blockConversation(ctx.user.id, input.conversationId))),
      unblock: protectedProcedure.input(unblockUserSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.unblockUser(ctx.user.id, input.userId))),
    }),

    report: protectedProcedure.input(reportInputSchema).mutation(({ ctx, input }) =>
      service(() => marketplaceDb.createReport(ctx.user.id, input))),

    admin: router({
      overview: adminProcedure.query(() => service(() => marketplaceDb.getAdminOverview())),
      queue: adminProcedure.query(() => service(() => marketplaceDb.getAdminQueue())),
      moderateListing: adminProcedure.input(moderationInputSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.moderateListing(ctx.user.id, input.listingId, input.decision))),
      verifyProfile: adminProcedure.input(verificationInputSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.setProfileVerification(ctx.user.id, input.userId, input.status))),
      resolveReport: adminProcedure.input(reportResolutionSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.resolveReport(ctx.user.id, input.id, input.status))),
      acknowledgeDeletion: adminProcedure.input(deletionRequestSchema).mutation(({ ctx, input }) =>
        service(() => marketplaceDb.acknowledgeDeletionRequest(ctx.user.id, input.id))),
    }),
  }),
});

export type AppRouter = typeof appRouter;
