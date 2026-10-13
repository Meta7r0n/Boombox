CREATE TABLE `player_parcel_audio` (
	`id` text PRIMARY KEY NOT NULL,
	`parcel_id` text NOT NULL,
	`source_id` text NOT NULL,
	`mime` text NOT NULL,
	`object_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`duration` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parcel_source_audio` ON `player_parcel_audio` (`parcel_id`,`source_id`);--> statement-breakpoint
CREATE TABLE `player_phone_lines` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phone_line_code` ON `player_phone_lines` (`code`);--> statement-breakpoint
CREATE TABLE `player_phone_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `phone_messages_recipient` ON `player_phone_messages` (`recipient`,`created_at`);--> statement-breakpoint
CREATE TABLE `player_tape_parcels` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`color` text NOT NULL,
	`manifest` text NOT NULL,
	`status` text NOT NULL,
	`cassette_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tape_parcels_recipient` ON `player_tape_parcels` (`recipient`,`created_at`);