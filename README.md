# One Cut Barbershop — website

Static Astro 5 site for One Cut Barbershop, 223 Mountain Avenue, Springfield, NJ.
No client-side framework: a few small vanilla TypeScript modules, self-hosted fonts, and one WebGL hero.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs static files to dist/
npm run preview   # serves dist/ locally
```

Requires Node 18.20+ (Node 20 or 22 recommended).

## Environment

| Variable   | Purpose                                                          |
| ---------- | ---------------------------------------------------------------- |
| `SITE_URL` | Live domain, e.g. `https://www.onecutbarbershop.com`. Used for the canonical URL, Open Graph image URLs, sitemap and robots.txt. |

Copy `.env.example` to `.env` for local builds, and set `SITE_URL` in Vercel's project settings.

## Where things live

```
src/
  data/
    business.ts    name, address, phone, SMS number for booking, hours, amenities, booking URL
    services.ts    service menu and prices (from the shop's printed price list)
    gallery.ts     gallery photos, captions and alt text
  lib/
    hours.ts       hour formatting + live open/closed status (America/New_York)
    links.ts       tel:, sms:, directions and map link helpers
  components/      Backdrop, Nav, Hero, Statement, About, Services, Gallery, Booking, Visit, Hours, Footer, MobileBar
  scripts/
    hero-gl.ts     the live cinematic hero (WebGL2)
    backdrop-gl.ts the animated site-wide background behind every section (WebGL2)
    booking.ts     the book-by-text form (days, times, message, QR code)
    main.ts        nav, mobile menu, reveals, status, lightbox, map loader
  styles/global.css  design tokens (colors, type scale, motion) and shared styles
public/media/      hero.mp4 (looping lounge footage) and hero-poster.jpg
```

## Common updates

**Hours** — edit `hours` in `src/data/business.ts` (24-hour `"HH:MM"`, `null` for closed). The hours table, the
"Open now" status, the mobile menu, the footer and the structured data all update from this one place.

**Phone or address** — edit `src/data/business.ts`.

**Services and prices** — edit the list in `src/data/services.ts`. Add `note` only for details the shop confirms.
The structured data `OfferCatalog` is generated from this list.

**Booking by text** — the Book section builds a text message from the visitor's choices (service, day, time,
name, notes) and opens their messages app addressed to `sms.e164` in `business.ts`. On a computer it shows a QR
code that opens the same text on their phone, plus a copy button. Nothing is stored or sent by the site itself.
The number in `sms` **must be able to receive text messages** (a mobile number or a text-enabled business line).
Days and times come from `hours`, in 30-minute steps, skipping closed days and times that have already passed.

**Online booking** — if the shop gets a booking page, set `bookingUrl` in `business.ts`. Every "Book" button
will then point there instead of the text form.

**Photos** — put the image in `src/assets/gallery/`, import it in `src/data/gallery.ts`, and add an entry with a
caption and descriptive alt text. Astro generates responsive WebP sizes at build time. Use real One Cut photos only.

**Hero video** — replace `public/media/hero.mp4` and `public/media/hero-poster.jpg`. The hero expects a portrait
clip around 816×1424. If the new footage frames things differently, update `FOCUS` (where the sign sits, as a
fraction of the frame) at the top of `src/scripts/hero-gl.ts`. Encode as H.264 MP4 without audio, for example:

```bash
ffmpeg -i input.mov -an -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart public/media/hero.mp4
ffmpeg -i public/media/hero.mp4 -frames:v 1 -q:v 3 public/media/hero-poster.jpg
```

## How the hero works

The background is authentic footage of the One Cut lounge (the fluted wall, sign and fireplace), graded and cut
into a seamless loop. `hero-gl.ts` composites it in WebGL2: a sharp layer plus a defocused ambient layer of the
same room, a slow dolly, pointer parallax with a simple depth split, halation on the lights, firelight spill that
follows the real flames, an occasional soft light pass, a filmic grade and fine grain.

It falls back to a CSS composition of the same video when WebGL2 is unavailable, and to the still poster when the
visitor prefers reduced motion or has Save-Data on. Rendering pauses when the hero is off-screen or the tab is
hidden, and resolution drops automatically on slow devices.

## The animated background

`backdrop-gl.ts` draws one fixed WebGL2 layer behind every section below the hero: the barber pole's helix
abstracted into slow satin ribbons of muted rose, bone and dusk blue, fine gold "combed" hairlines with a sheen
travelling along them, a soft light shaft, drifting light pools and gold dust motes, with vignette and grain. It
only renders while the hero is scrolled past and the tab is visible, scales resolution up to 2x on capable screens
and down on slow ones to hold 60fps, and draws a single still frame for reduced motion. Without WebGL2 a CSS
version of the same look is shown.

## Deploy (Vercel)

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project**, import the repository. The Astro preset is detected automatically
   (build `npm run build`, output `dist`).
3. Deploy. Until `SITE_URL` is set, builds on Vercel use the project's production `.vercel.app` URL for canonical
   links, Open Graph images and the sitemap. When the shop's domain is connected, add `SITE_URL` and redeploy.
4. Every push to the default branch (`main`) redeploys production; other branches and pull requests get preview URLs.

## Still needed from the shop

- Official website domain (for `SITE_URL`)
- Online booking link, if one exists
- Official social media profiles
- More photos or footage of the interior and storefront, in the highest resolution available
