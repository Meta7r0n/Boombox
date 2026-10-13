DROP INDEX `player_secret_profile`;--> statement-breakpoint
CREATE UNIQUE INDEX `player_secret_profile_egg` ON `player_secret_discoveries` (`profile_id`,`egg_id`);