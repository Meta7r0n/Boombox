# oto · 音 — standalone Pages edition

The stable testing app is served directly from https://meta7r0n.github.io/Boombox/. It runs HTML, Canvas, browser audio and IndexedDB without a server or OpenAI sign-in.

Choose **oto** or **音** for your stereo, then customize, play a cassette or enter an animated scene. For a personal collection, create an eight-digit telephone profile. Uploaded MP3/WAV audio and published cassettes are stored together under that profile in this browser. Your design, interface theme and secret discoveries are stored with it too. Unlocking the same profile after reload restores its collection. A first profile adopts the earlier guest library; later profiles have separate libraries. Saves are confirmed only after an IndexedDB transaction completes, and a failed save leaves the mixtape draft recoverable.

Device profiles are local collections, not an online identity service. Another browser or phone will have its own collection even if you enter the same passcode. Clearing this site's browser data removes those local profiles/files, and private browsing storage is temporary. Keep the original audio files and use the existing design/image exports for copies of your artwork. This version does not migrate the earlier hosted Site's account records.

Shared radio stations, friend messages and tape delivery are disabled here because GitHub Pages cannot execute their server APIs. Those features remain in the separate Cloudflare branch. Phone keypad sounds and secret tune discoveries still work locally. Normal presets and randomization continue to exclude hidden scenes/stereos.

The bottom player, full-screen boombox controls and scenery views share the existing audio element. A pop-out opens another copy of this Pages app; press **Continue listening** to hand playback over. Browsers can restrict pop-ups or suspend background audio, so physical phone testing remains necessary.

## Build

```sh
pnpm install --frozen-lockfile
pnpm build:pages
pnpm check
```

`build:pages` embeds the canonical modules into `src/index.html`, then writes the deployable root `index.html`. It enables the device adapter and changes bundled artwork/music URLs to project-relative `./public/` paths. The original framework build remains available separately. Rebuild the root file whenever changing the app; do not hand-edit generated JavaScript sections.

Keep Pages configured as **Deploy from a branch → main → / (root)**. The Pages deployment follows a merged change automatically. No Cloudflare credentials or database provisioning are needed for this edition.
