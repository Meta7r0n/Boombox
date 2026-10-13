import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const tracks = sqliteTable('music_tracks', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), title: text('title').notNull(),
  filename: text('filename').notNull(), mime: text('mime').notNull(), bytes: integer('bytes').notNull(),
  duration: real('duration').notNull(), objectKey: text('object_key').notNull(), createdAt: integer('created_at').notNull()
}, t => [index('music_tracks_owner_created').on(t.owner, t.createdAt)]);
export const cassettes = sqliteTable('music_cassettes', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), title: text('title').notNull(),
  color: text('color').notNull(), tracks: text('tracks').notNull(), createdAt: integer('created_at').notNull()
}, t => [index('music_cassettes_owner_created').on(t.owner, t.createdAt)]);
export const profiles = sqliteTable('player_profiles', {
 id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),salt:text('salt').notNull(),passcodeHash:text('passcode_hash').notNull(),theme:text('theme').notNull(),design:text('design')
},t=>[index('player_profiles_owner').on(t.owner)]);
export const sessions = sqliteTable('player_sessions', {
 tokenHash:text('token_hash').primaryKey(),owner:text('owner').notNull(),profileId:text('profile_id').notNull(),expiresAt:integer('expires_at').notNull()
});
export const attempts = sqliteTable('player_attempts', {
 owner:text('owner').primaryKey(),failures:integer('failures').notNull(),blockedUntil:integer('blocked_until').notNull()
});

export const secretDiscoveries=sqliteTable('player_secret_discoveries',{profileId:text('profile_id').notNull(),eggId:text('egg_id').notNull(),discoveredAt:integer('discovered_at').notNull()},t=>[uniqueIndex('player_secret_profile_egg').on(t.profileId,t.eggId)]);

export const phoneLines=sqliteTable('player_phone_lines',{profileId:text('profile_id').primaryKey(),owner:text('owner').notNull(),code:text('code').notNull(),createdAt:integer('created_at').notNull()},t=>[uniqueIndex('phone_line_code').on(t.code)]);
export const phoneMessages=sqliteTable('player_phone_messages',{id:text('id').primaryKey(),sender:text('sender').notNull(),recipient:text('recipient').notNull(),kind:text('kind').notNull(),body:text('body').notNull(),status:text('status').notNull(),createdAt:integer('created_at').notNull()},t=>[index('phone_messages_recipient').on(t.recipient,t.createdAt)]);
export const tapeParcels=sqliteTable('player_tape_parcels',{id:text('id').primaryKey(),sender:text('sender').notNull(),recipient:text('recipient').notNull(),sourceId:text('source_id').notNull(),title:text('title').notNull(),color:text('color').notNull(),manifest:text('manifest').notNull(),status:text('status').notNull(),cassetteId:text('cassette_id').notNull(),createdAt:integer('created_at').notNull()},t=>[index('tape_parcels_recipient').on(t.recipient,t.createdAt)]);
export const parcelAudio=sqliteTable('player_parcel_audio',{id:text('id').primaryKey(),parcelId:text('parcel_id').notNull(),sourceId:text('source_id').notNull(),mime:text('mime').notNull(),objectKey:text('object_key').notNull(),bytes:integer('bytes').notNull(),duration:real('duration').notNull()},t=>[uniqueIndex('parcel_source_audio').on(t.parcelId,t.sourceId)]);

export const radioStations=sqliteTable('radio_stations',{profileId:text('profile_id').primaryKey(),letters:text('letters').notNull(),nickname:integer('nickname').notNull(),band:text('band').notNull(),channel:integer('channel').notNull()},t=>[uniqueIndex('radio_frequency_unique').on(t.band,t.channel)]);
export const radioPrograms=sqliteTable('radio_programs',{profileId:text('profile_id').primaryKey(),id:text('id').notNull(),manifest:text('manifest').notNull(),title:text('title').notNull(),status:text('status').notNull(),createdAt:integer('created_at').notNull()},t=>[uniqueIndex('radio_program_id').on(t.id)]);
export const radioProgramAudio=sqliteTable('radio_program_audio',{programId:text('program_id').notNull(),sourceId:text('source_id').notNull(),mime:text('mime').notNull(),objectKey:text('object_key').notNull(),bytes:integer('bytes').notNull(),duration:real('duration').notNull()},t=>[uniqueIndex('radio_program_song').on(t.programId,t.sourceId)]);
export const radioSessions=sqliteTable('radio_sessions',{profileId:text('profile_id').primaryKey(),id:text('id').notNull(),programId:text('program_id').notNull(),status:text('status').notNull(),startedAt:integer('started_at').notNull(),expiresAt:integer('expires_at').notNull(),leaseUntil:integer('lease_until').notNull(),checkinUntil:integer('checkin_until').notNull(),paused:integer('paused').notNull(),positionMs:real('position_ms').notNull(),anchorAt:integer('anchor_at').notNull(),repeat:integer('repeat').notNull(),level:real('level').notNull(),revision:integer('revision').notNull()},t=>[uniqueIndex('radio_session_id').on(t.id)]);
export const radioEvents=sqliteTable('radio_events',{id:integer('id').primaryKey({autoIncrement:true}),sessionId:text('session_id').notNull(),nonce:text('nonce').notNull(),kind:text('kind').notNull(),at:integer('at').notNull()},t=>[index('radio_events_session').on(t.sessionId,t.id),uniqueIndex('radio_event_nonce').on(t.sessionId,t.nonce)]);
