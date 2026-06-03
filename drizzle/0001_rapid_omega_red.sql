CREATE TABLE `checklistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`barcode` varchar(255) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`productCode` varchar(255),
	`targetQuantity` int NOT NULL,
	`verifiedQuantity` int NOT NULL DEFAULT 0,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`totalItems` int NOT NULL,
	`completedItems` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scanRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`checklistItemId` int NOT NULL,
	`barcode` varchar(255) NOT NULL,
	`scanMethod` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scanRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `checklistItems` ADD CONSTRAINT `checklistItems_checklistId_checklists_id_fk` FOREIGN KEY (`checklistId`) REFERENCES `checklists`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checklists` ADD CONSTRAINT `checklists_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scanRecords` ADD CONSTRAINT `scanRecords_checklistId_checklists_id_fk` FOREIGN KEY (`checklistId`) REFERENCES `checklists`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scanRecords` ADD CONSTRAINT `scanRecords_checklistItemId_checklistItems_id_fk` FOREIGN KEY (`checklistItemId`) REFERENCES `checklistItems`(`id`) ON DELETE cascade ON UPDATE no action;