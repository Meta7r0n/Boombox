CREATE TABLE `player_attempts` (
	`owner` text PRIMARY KEY NOT NULL,
	`failures` integer NOT NULL,
	`blocked_until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`salt` text NOT NULL,
	`passcode_hash` text NOT NULL,
	`theme` text NOT NULL,
	`design` text
);
--> statement-breakpoint
CREATE INDEX `player_profiles_owner` ON `player_profiles` (`owner`);--> statement-breakpoint
CREATE TABLE `player_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`profile_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
