CREATE TABLE `radio_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`nonce` text NOT NULL,
	`kind` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `radio_events_session` ON `radio_events` (`session_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `radio_event_nonce` ON `radio_events` (`session_id`,`nonce`);--> statement-breakpoint
CREATE TABLE `radio_program_audio` (
	`program_id` text NOT NULL,
	`source_id` text NOT NULL,
	`mime` text NOT NULL,
	`object_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`duration` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `radio_program_song` ON `radio_program_audio` (`program_id`,`source_id`);--> statement-breakpoint
CREATE TABLE `radio_programs` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`manifest` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `radio_program_id` ON `radio_programs` (`id`);--> statement-breakpoint
CREATE TABLE `radio_sessions` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`program_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`lease_until` integer NOT NULL,
	`checkin_until` integer NOT NULL,
	`paused` integer NOT NULL,
	`position_ms` real NOT NULL,
	`anchor_at` integer NOT NULL,
	`repeat` integer NOT NULL,
	`level` real NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `radio_session_id` ON `radio_sessions` (`id`);--> statement-breakpoint
CREATE TABLE `radio_stations` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`letters` text NOT NULL,
	`nickname` integer NOT NULL,
	`band` text NOT NULL,
	`channel` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `radio_frequency_unique` ON `radio_stations` (`band`,`channel`);