CREATE TABLE `account_deletion_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('open','acknowledged','cancelled') NOT NULL DEFAULT 'open',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`reviewedBy` int,
	CONSTRAINT `account_deletion_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_deletion_requests_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_blocked_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerUserId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplace_blocked_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_blocker_blocked_unique` UNIQUE(`blockerUserId`,`blockedUserId`)
);
--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `profileVisible` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `showDisplayName` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `showBusinessName` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `showLocation` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `showBio` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `contactInfo` varchar(240);--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `showContactInfo` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `shareBusinessWithSellers` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `activityEmails` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_profiles` ADD `marketingEmails` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_reports` ADD `conversationId` int;--> statement-breakpoint
ALTER TABLE `account_deletion_requests` ADD CONSTRAINT `adr_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_deletion_requests` ADD CONSTRAINT `adr_reviewer_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_blocked_users` ADD CONSTRAINT `mb_blocker_fk` FOREIGN KEY (`blockerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_blocked_users` ADD CONSTRAINT `mb_blocked_fk` FOREIGN KEY (`blockedUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_deletion_status_idx` ON `account_deletion_requests` (`status`,`requestedAt`);--> statement-breakpoint
CREATE INDEX `marketplace_blocked_users_owner_idx` ON `marketplace_blocked_users` (`blockerUserId`,`createdAt`);--> statement-breakpoint
ALTER TABLE `marketplace_reports` ADD CONSTRAINT `mr_conversation_fk` FOREIGN KEY (`conversationId`) REFERENCES `marketplace_conversations`(`id`) ON DELETE set null ON UPDATE no action;