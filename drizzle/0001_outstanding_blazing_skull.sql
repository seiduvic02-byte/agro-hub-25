CREATE TABLE IF NOT EXISTS `marketplace_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderUserId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplace_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`buyerUserId` int NOT NULL,
	`sellerUserId` int NOT NULL,
	`orderId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplace_conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_conversation_listing_buyer_unique` UNIQUE(`listingId`,`buyerUserId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `produce_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(220) NOT NULL,
	`sellerUserId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`category` varchar(60) NOT NULL,
	`priceMinor` int NOT NULL,
	`priceUnit` varchar(40) NOT NULL,
	`quantityAvailable` int NOT NULL,
	`quantityUnit` varchar(30) NOT NULL,
	`minimumOrder` int NOT NULL DEFAULT 1,
	`location` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`imageUrl` varchar(512),
	`status` enum('pending','active','paused','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produce_listings_id` PRIMARY KEY(`id`),
	CONSTRAINT `produce_listings_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountType` enum('buyer','seller') NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`businessName` varchar(180),
	`location` varchar(120) NOT NULL,
	`bio` text,
	`verificationStatus` enum('not_started','pending','verified','needs_changes') NOT NULL DEFAULT 'not_started',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterUserId` int NOT NULL,
	`listingId` int,
	`reportedUserId` int,
	`reason` varchar(80) NOT NULL,
	`details` text,
	`status` enum('open','resolved','dismissed') NOT NULL DEFAULT 'open',
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_order_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`fromStatus` varchar(30),
	`toStatus` varchar(30) NOT NULL,
	`note` varchar(240),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplace_order_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(40) NOT NULL,
	`requestId` int NOT NULL,
	`listingId` int NOT NULL,
	`buyerUserId` int NOT NULL,
	`sellerUserId` int NOT NULL,
	`quantity` int NOT NULL,
	`quantityUnit` varchar(30) NOT NULL,
	`totalMinor` int NOT NULL,
	`status` enum('confirmed','preparing','ready','in_transit','completed','cancelled') NOT NULL DEFAULT 'confirmed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_orders_orderNumber_unique` UNIQUE(`orderNumber`),
	CONSTRAINT `marketplace_orders_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketplace_payment_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`amountMinor` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'NGN',
	`provider` varchar(40) NOT NULL DEFAULT 'not_connected',
	`status` enum('not_connected','pending','paid','failed') NOT NULL DEFAULT 'not_connected',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_payment_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_payment_records_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `purchase_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerUserId` int NOT NULL,
	`sellerUserId` int NOT NULL,
	`listingId` int NOT NULL,
	`quantity` int NOT NULL,
	`quantityUnit` varchar(30) NOT NULL,
	`proposedPriceMinor` int,
	`deliveryPreference` enum('pickup','seller_delivery') NOT NULL,
	`buyerNote` text,
	`status` enum('pending','accepted','declined','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `saved_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerUserId` int NOT NULL,
	`sellerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_suppliers_buyer_seller_unique` UNIQUE(`buyerUserId`,`sellerUserId`)
);
--> statement-breakpoint
ALTER TABLE `marketplace_messages` ADD CONSTRAINT `mm_conversation_fk` FOREIGN KEY (`conversationId`) REFERENCES `marketplace_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_messages` ADD CONSTRAINT `mm_sender_fk` FOREIGN KEY (`senderUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_conversations` ADD CONSTRAINT `mc_listing_fk` FOREIGN KEY (`listingId`) REFERENCES `produce_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_conversations` ADD CONSTRAINT `mc_buyer_fk` FOREIGN KEY (`buyerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_conversations` ADD CONSTRAINT `mc_seller_fk` FOREIGN KEY (`sellerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_conversations` ADD CONSTRAINT `mc_order_fk` FOREIGN KEY (`orderId`) REFERENCES `marketplace_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `produce_listings` ADD CONSTRAINT `pl_seller_fk` FOREIGN KEY (`sellerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD CONSTRAINT `mp_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_reports` ADD CONSTRAINT `mr_reporter_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_reports` ADD CONSTRAINT `mr_listing_fk` FOREIGN KEY (`listingId`) REFERENCES `produce_listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_reports` ADD CONSTRAINT `mr_reported_fk` FOREIGN KEY (`reportedUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_reports` ADD CONSTRAINT `mr_reviewer_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_order_events` ADD CONSTRAINT `moe_order_fk` FOREIGN KEY (`orderId`) REFERENCES `marketplace_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_order_events` ADD CONSTRAINT `moe_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_orders` ADD CONSTRAINT `mo_request_fk` FOREIGN KEY (`requestId`) REFERENCES `purchase_requests`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_orders` ADD CONSTRAINT `mo_listing_fk` FOREIGN KEY (`listingId`) REFERENCES `produce_listings`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_orders` ADD CONSTRAINT `mo_buyer_fk` FOREIGN KEY (`buyerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_orders` ADD CONSTRAINT `mo_seller_fk` FOREIGN KEY (`sellerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_payment_records` ADD CONSTRAINT `mpr_order_fk` FOREIGN KEY (`orderId`) REFERENCES `marketplace_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD CONSTRAINT `pr_buyer_fk` FOREIGN KEY (`buyerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD CONSTRAINT `pr_seller_fk` FOREIGN KEY (`sellerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD CONSTRAINT `pr_listing_fk` FOREIGN KEY (`listingId`) REFERENCES `produce_listings`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_suppliers` ADD CONSTRAINT `ss_buyer_fk` FOREIGN KEY (`buyerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_suppliers` ADD CONSTRAINT `ss_seller_fk` FOREIGN KEY (`sellerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `marketplace_messages_conversation_idx` ON `marketplace_messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `marketplace_conversations_buyer_idx` ON `marketplace_conversations` (`buyerUserId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `marketplace_conversations_seller_idx` ON `marketplace_conversations` (`sellerUserId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `produce_listings_status_created_idx` ON `produce_listings` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `produce_listings_seller_idx` ON `produce_listings` (`sellerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `produce_listings_category_idx` ON `produce_listings` (`category`,`status`);--> statement-breakpoint
CREATE INDEX `marketplace_profiles_type_idx` ON `marketplace_profiles` (`accountType`);--> statement-breakpoint
CREATE INDEX `marketplace_reports_status_idx` ON `marketplace_reports` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `marketplace_order_events_order_idx` ON `marketplace_order_events` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `marketplace_orders_buyer_idx` ON `marketplace_orders` (`buyerUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `marketplace_orders_seller_idx` ON `marketplace_orders` (`sellerUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `purchase_requests_buyer_idx` ON `purchase_requests` (`buyerUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `purchase_requests_seller_idx` ON `purchase_requests` (`sellerUserId`,`status`,`createdAt`);