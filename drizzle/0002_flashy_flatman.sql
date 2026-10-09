CREATE TABLE `listing_moderation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`reviewerUserId` int NOT NULL,
	`decision` enum('approve','reject') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listing_moderation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profile_verification_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileUserId` int NOT NULL,
	`reviewerUserId` int NOT NULL,
	`status` enum('verified','needs_changes') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profile_verification_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `produce_listings` MODIFY COLUMN `priceMinor` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_orders` MODIFY COLUMN `totalMinor` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_payment_records` MODIFY COLUMN `amountMinor` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` MODIFY COLUMN `proposedPriceMinor` bigint;--> statement-breakpoint
ALTER TABLE `listing_moderation_events` ADD CONSTRAINT `lme_listing_fk` FOREIGN KEY (`listingId`) REFERENCES `produce_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_moderation_events` ADD CONSTRAINT `lme_reviewer_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profile_verification_events` ADD CONSTRAINT `pve_profile_fk` FOREIGN KEY (`profileUserId`) REFERENCES `marketplace_profiles`(`userId`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profile_verification_events` ADD CONSTRAINT `pve_reviewer_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lme_listing_created_idx` ON `listing_moderation_events` (`listingId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pve_profile_created_idx` ON `profile_verification_events` (`profileUserId`,`createdAt`);