CREATE TABLE `player_secret_discoveries` (
	`profile_id` text NOT NULL,
	`egg_id` text NOT NULL,
	`discovered_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `player_secret_profile` ON `player_secret_discoveries` (`profile_id`);