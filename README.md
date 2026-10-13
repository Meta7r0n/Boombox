# Boombox Atelier

Build a custom cartoon boombox in a cel-shaded 1980s/90s anime world, publish cassette mixtapes, discover hidden stations, and host timed community-radio programs.

[Live app](https://boombox-atelier.meta7r0n.chatgpt.site)

## What is included

- Custom shells, paint, materials, speakers, decks, knobs, EQ, antennae and handles.
- Landscape fullscreen front panels and animated atmosphere scenes with zoom transitions.
- Three original starter tracks, MP3/WAV uploads, cassette libraries and profile-linked mixtapes.
- Retro telephone profiles, keypad tones, hidden song discoveries and ten secret radios/scenes.
- Friend calling codes, messages and compressed mixtape delivery. Calls currently send requests, not live voice.
- Radio hosting across eight virtual bands and 1,592 profile-assigned frequencies, capped at 20 active hosts.
- Timed 15/30/60-minute broadcasts, five-minute check-ins, disconnect expiry, shared host controls, effects and station announcements.
- GUI themes, an in-app control handbook, and illustration/design/HTML exports.

Radio uses synchronized browser playback against a shared server clock. Each listener plays the program locally; controls and effects have a short delivery delay. The robot station ID uses the browser's speech engine, so its voice differs across devices. This mode does not broadcast a microphone.

## Development

Use Node.js **22.13 or newer** and the pnpm version pinned in `package.json` (**11.25.0**).

```sh
git clone https://github.com/Meta7r0n/Boombox.git
cd Boombox
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

The portable development runner defaults to port **5173**. A clean clone selects the portable execution profile automatically; `.sites-runtime/` is intentionally ignored.

```sh
pnpm build
```

The build embeds the canonical JavaScript modules into `src/index.html` and produces Cloudflare Worker/client output in `dist/`. Edit the source modules rather than their generated copies in the HTML.

The visual workshop can render locally. Profiles, saved uploads, tape delivery and shared radio also require the authenticated backend and D1/R2 bindings. Local unit tests provision temporary storage and identity fixtures.

## Source map

| Path | Purpose |
| --- | --- |
| `src/index.html` | Canvas drawing, workshop markup/styles, scenes and embedded app |
| `src/music.js`, `src/tape-codec.mjs` | Music player, mixtapes and compressed tape format |
| `src/hardware.js`, `src/secret-hardware.js` | Interactive regular/secret controls and sound graph |
| `src/display-navigation.js`, `src/handbook.js` | Fullscreen transitions and control handbook |
| `src/profiles.js`, `src/phone.js`, `src/easter-eggs.js` | Profiles, friend telephone and hidden discoveries |
| `src/radio.js`, `src/radio-core.mjs` | Host/listener UI, shared clock, effects and station catalog |
| `server/` | Authenticated music, profile, telephone and radio APIs |
| `db/schema.ts`, `drizzle/` | D1 schema and ordered migrations |
| `public/` | Committed scene/front-panel artwork and bundled recordings |
| `music/`, `secrets/` | Catalogs, composition scripts and secret control metadata |
| `scripts/prepare-music.mjs` | Embeds canonical modules and catalogs during builds |
| `app/`, `build/`, `vite.config.ts` | Vinext/Cloudflare routing and hosting integration |
| `tests/` | Audio, profile, music, telephone, keypad and radio regressions |

## Tests

After installing dependencies, run every test and the production build together:

```sh
pnpm check
```

Use `pnpm test` for the eight test suites only. GitHub Actions runs `pnpm check` on pull requests and pushes to `main`; the workflow can also be run manually after it is merged. Each API test uses a separate temporary database, and the test runner executes suites one at a time. The workflow does not deploy or require production credentials.

To run an individual suite:

```sh
node tests/hardware-audio.test.mjs
node tests/music-api.test.mjs
node tests/profile-api.test.mjs
node tests/phone-api.test.mjs
node tests/phone-tones.test.mjs
node tests/secret-keypad.test.mjs
node tests/radio-core.test.mjs
node tests/radio-api.test.mjs
```

The API tests use temporary Miniflare D1/R2 stores and apply the committed migrations. They do not connect to player data in the live app. Radio coverage includes competing host reservations, ownership, clock controls, compressed audio/ranges, check-ins and hard expiry. Physical two-device/iOS testing is still needed for browser timing, background suspension and speech behavior.

## Hosting and data

The current live app runs through Sites on Cloudflare Workers, with D1 (`DB`) for profiles/library/radio records and R2 (`BUCKET`) for user audio and compressed copies. `.openai/hosting.json` identifies the existing Site and its logical bindings; it contains no login token or player collection.

**GitHub Pages alone cannot run the complete app.** Saving code here does not automatically deploy the current live Site. Its deployment workflow must be configured separately.

For a different host, provision D1/R2, apply the migrations, and replace the Sites authentication boundary with trusted authentication. The current APIs expect identity headers supplied by authenticated hosting; a new public deployment must not trust identity headers supplied directly by visitors.

Player accounts, passcodes, uploaded songs, messages and live database contents are not part of this repository. Environment files, local storage state, build output and dependencies are ignored. Keep applied migrations immutable; append a migration when changing the schema.

See [music/README.md](music/README.md) for discography expansion, tape delivery, sound-graph maintenance and hidden-radio artwork rules. Secret artwork/recordings must remain outside normal scenes, ordinary presets and randomization.

## Import provenance

Initial full-project import corresponds to live **version 19**, including Host Radio, from source commit `31604819406eb8b01e543ae80a2dd7e4301bc243`. The import is a source snapshot; subsequent GitHub commits have their own history. Existing bundled media and third-party notices are retained. Original or appropriately licensed tracks should be used when expanding the catalog; this import does not add a new project-wide license.
