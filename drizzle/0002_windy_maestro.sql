ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `scanRecords` DROP FOREIGN KEY `scanRecords_checklistItemId_checklistItems_id_fk`;
--> statement-breakpoint
ALTER TABLE `scanRecords` MODIFY COLUMN `scanMethod` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `scanRecords` DROP COLUMN `checklistItemId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `openId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `loginMethod`;