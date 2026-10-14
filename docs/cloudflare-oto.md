# oto · 音 on your Cloudflare website

This branch prepares a separate Cloudflare Worker. It does not deploy, create storage, change DNS, modify your website or migrate the existing live collection.

## The player experience

| Address | Purpose |
| --- | --- |
| `/` or `/listen/` | Persistent website browsing shell with an oto dock |
| `/app/` | Full workshop, scenery, music, phone and radio app |
| `/app/?embed=1` | The same app in a top/bottom dock; expansion preserves its audio element |
| `/app/?popout=1` | Standalone player with an explicit Continue listening handoff |
| `/oto/embed.js` | Small integration script for your website |
| `/auth/login` | Top-level sign-in entry; protect it with Cloudflare Access |
| `/api/*` | Existing profile, music, phone and radio APIs behind verified sign-in |

The shell keeps the website in one content iframe and the player in another. Website links load within the content frame; the player frame is never replaced. This supports a traditional multipage website without converting its pages to React. Both frames remain on screen while browsing; minimizing only resizes the player. Its expanded view provides the workshop and atmosphere scenes.

The embedding script alone preserves playback within a single document. Adding it independently to every ordinary HTML page cannot preserve audio through full page reloads. Use the `/listen/` shell, or mount the player in an existing persistent SPA layout. Your website must permit framing by the oto origin and must keep normal links in its content frame. Pages that refuse framing can be opened in another tab while oto continues playing in its original tab.

The default dock is at the bottom. Its ↕ button switches to the top. All controls remain within the same player. Media Session supplies device playback controls where supported; Audio Session requests playback behavior where available. Browser/iPhone suspension can still interrupt playback or track transitions. There is no guarantee of playback after closing the tab, and no overlay over unrelated applications.

Pop out copies only the cassette/radio identity, position and chosen logo. Press **Continue listening** in the new window to start. Once the new player successfully plays, BroadcastChannel pauses the original player's local audio. The profile session is inherited by a newly opened same-origin window; it is never sent through website messages. Hosts must keep the original timed host panel open rather than move an active broadcast. The existing hard slot expiry, heartbeat and check-in rules stay in force.

## Build and local test

Use the locked Node/pnpm versions from the root README. No additional dependency is required.

```sh
pnpm install --frozen-lockfile
pnpm build:cloudflare
pnpm exec wrangler d1 migrations apply DB --local --config wrangler.oto.jsonc --env local
pnpm dev:cloudflare
```

Open `http://localhost:8787`. The `local` environment uses isolated local D1/R2 storage and a single developer identity. That identity is accepted only on loopback port 8787/8788. Production defaults to verified Access sign-in and rejects missing configuration or forged identity headers. Never deploy the `local` environment.

```sh
pnpm test
pnpm cloudflare:validate
```

The latter command creates a dry-run Worker bundle in `dist/worker-check`; it does not deploy or touch remote storage. `pnpm check` runs every test, the original framework build and this dry-run build. The app's illustration, audio and secret catalogs are shared between targets.

## Configure hosting later

Use a same-site custom hostname such as `radio.your-domain.com` for the Worker while your website stays on Cloudflare Pages. `wrangler.oto.jsonc` contains placeholders, not production resource IDs.

1. Create the Worker, an oto D1 database and an `oto-audio` R2 bucket in your Cloudflare account. Replace the database ID and bucket names in the configuration. Apply the committed migrations to that new database.
2. Set `SITE_ORIGIN` to your existing website origin, for example `https://your-domain.com`. This is also the sole additional allowed embedding/message origin. Set `SITE_PAGES` to a JSON array such as `[{"label":"Games","path":"/games.html"},{"label":"Music","path":"/music.html"}]` using your real paths. With no configured website, the shell shows its oto welcome screen.
3. Configure Cloudflare Access browser authentication for `/api/*` and `/auth/*` on the Worker hostname. Choose your sign-in provider and allowed audience in Access. Keep the static shell, `/app/*`, `/oto/*`, `/music/*` and artwork paths reachable so guests can use the workshop/starter tape and the embedding script can load. Opening **Sign in** launches `/auth/login` at the top level, avoiding an embedded login redirect.
4. Set `ACCESS_TEAM_DOMAIN` to `https://your-team.cloudflareaccess.com` and `ACCESS_AUD` to that Access application's audience tag. The Worker verifies the RS256 signature, issuer, audience, expiry, subject and user identity before supplying the identity expected by the original APIs. A raw `oai-authenticated-user-id` or `x-atelier-profile` header is not an authentication credential.
5. Build and deploy the production target after these settings are reviewed:

```sh
pnpm build:cloudflare
pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.oto.jsonc
pnpm exec wrangler deploy --config wrangler.oto.jsonc --env=""
```

Access applications, website framing permissions, custom domains and real storage are deliberately configured after this branch is pushed. Provision new storage first; existing Sites owners have different identities from Access users, so do not point this target at the old live database without a deliberate data migration.

## Add to your website

For the persistent shell, link your website's **Listen & browse** button to `https://radio.your-domain.com/listen/`. Configure the shell's website sections above. This is the first integration recommended for the existing multipage site.

For an existing SPA or persistent page layout, add this once to that outer layout:

```html
<script src="https://radio.your-domain.com/oto/embed.js"
        data-player="https://radio.your-domain.com/app/"
        data-dock="bottom"></script>
<style>
  body { padding-bottom: var(--oto-dock-space, 86px); }
  :root[data-oto-dock="top"] body {
    padding-top: var(--oto-dock-space, 86px);
    padding-bottom: 0;
  }
</style>
```

The script exposes `window.oto.expand()`, `.minimize()` and `.dock('top'|'bottom')`. A manually mounted integration can use `window.OtoPlayer.mount({playerURL,container,dock})` with `data-manual` on the script. A second mount in the same container returns the existing player. `oto:status` events include the public track title/playback state; they contain no account/session information. Messages validate both the configured origin and the actual iframe source.

Before going live, test two profiles sending/receiving tapes, the 20-host cap and timed check-ins, top/bottom docking during navigation, pop-out handoff, and iPhone background playback with EQ. Real-device checks are separate from the automated Node/Miniflare tests.

## Stereo logos

`logo` is either `oto` or `音`; `logoPicked` records the user's explicit choice. The required first-choice dialog runs before entering the workshop, fullscreen or music playback. Presets and randomization keep the selected logo. Players can switch it under **Stereo logo** or by pressing the dock's logo. Both signatures are drawn as plaques on regular stereos and secret radios, including secret scenery. The 音 asset uses vector strokes, so it does not depend on an installed Japanese font. Uploaded design JSON remains compatible with the original `boombox-atelier` format.
