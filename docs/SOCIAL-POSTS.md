# Social posts

Build-log posts for LinkedIn and X, with a matching image for each. The point is to document
the build in public: decisions taken, and details worth seeing. It is not marketing.

Read the voice rules before writing any. They exist because the first batch took five rounds of
correction to get right, and every rejection is recorded below as a rule.

## Voice

Craig rejected drafts for each of these in turn. They are not preferences, they are the brief.

1. **Not an advert.** No opening hook, no rhetorical question, no punchy one-line fragments for
   rhythm, no lesson or callback at the end. A post ends when the facts run out.
2. **Not vague.** "Wired to the actual decode" and "the globe's occupancy inventory" both got
   rejected for sounding technical while saying nothing. Name the real thing: a list, a number,
   a size, a count.
3. **Not for engineers.** Byte arrays, textures, shaders, length checks and transactions are all
   out. Say it in the words someone who just likes the globe would use. The underlying fact stays
   exactly as true, it just gets described rather than named.
4. **No negatives about the product.** "On a slow connection it genuinely crawls" was cut. Do not
   draw attention to the product being slow, limited or failing.
5. **Nothing about price.** Regional pricing was cut outright. Publishing that a hexagon costs a
   different amount in different places only invites an argument about who got the better deal.
6. **Nothing that flags an inconsistency in what is sold.** The twelve pentagons post was cut for
   this. It told buyers that some of what they are buying is not what the name says.
7. **No em dashes.** Anywhere. `social-cards.mjs` fails the build if it finds one.

Before and after with real measurements is the pattern that worked. "The globe had 25.5% of the
screen, now it has 74.1%" was approved immediately. So was the tour framing post, for the same
reason. Saying what something used to do is fine, and is not covered by rule 4, because the
subject is the change rather than a fault that is still there.

Check every number against the code or the built data, not against prose in `STATUS.md`. The
pentagon count came out of `public/topology/geodesic-v1.json`, not out of an assumption about
geodesic spheres.

## Writing a batch

Edit `social/posts.json`. Each entry needs:

| Field | What it is |
| --- | --- |
| `title` | Internal label for the post. Never published. |
| `figure` | The big lime text on the card. Up to 14 characters. A number where one exists, otherwise one or two words. |
| `caption` | The line under the figure on the card. One short sentence. |
| `linkedin` | The long version. Blank lines between paragraphs. Keep under 1024 characters so it fits a Telegram caption. |
| `x` | The short version, under 280 characters. |

`social-cards.mjs` refuses to render if a figure is too long, an X post is over 280 characters,
a required field is missing, or an em dash appears anywhere.

## Rendering the images

```
npm run social:cards              # every post
npm run social:cards -- --only 3,7
```

Writes `artifacts/social/01.png` and so on at 1200 x 630, which suits both platforms, plus
`artifacts/social/posts.md` holding the whole batch as text. `artifacts/` is gitignored, so the
images are disposable and the source of truth stays `social/posts.json`.

The card design is `scripts/social-card-template.html`: near-black ground, a hexagon field at low
opacity, a small lit cluster standing in for claimed space, and the figure in brand lime. It uses
Manrope and DM Mono, the same faces as the product. Edit that file to change the look, then
re-render. The lit cluster is deliberately kept right of the 760px text column so it never sits
behind the caption.

Chrome is found at the usual Windows path; set `CHROME_PATH` to override.

## Sending to Telegram

Put the credentials in `.env.telegram.local` in the repository root. `.gitignore` already excludes
it, because it matches `.env*`:

```
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-1001234567890
```

```
npm run social:telegram -- --dry-run   # list what would be sent
npm run social:telegram                # send
npm run social:telegram -- --only 3,7
```

Each post arrives as the card with the LinkedIn text as its caption, and the X version as a
threaded reply. There is a short pause between posts so a twenty message batch stays inside
Telegram's rate limits. The token is read from the file and never printed.

## Posting

Nothing here posts to LinkedIn or X. Copy the text and attach the card by hand, which also keeps
the decision about what actually goes out with a person.

## Promo reel

`scripts/promo-reel.mjs` records a vertical reel from the real app. Nothing is mocked: it drives
the actual studio through Location, Shape, Design and Review while Chrome records, so what plays
is the product running.

```
npm run build
npx vite preview --port 4181 --host 127.0.0.1    # in another terminal
npm run promo:reel
```

Output is `artifacts/promo/reel.mp4` at 1080 x 1920, around thirty seconds, with the raw capture
kept beside it as `reel-source.webm`.

Record against the production build, not the dev server. Dev starts slowly enough that the
overhead of video capture can push artwork loading past its own thirty second failure threshold,
and you end up with a recording of the recovery screen. The script refuses to encode a take where
the loader did not clear, and retries startup three times before giving up.

Captions are injected as an overlay on top of the live page, styled in Manrope and the brand lime.
They sit at the bottom over the globe and move to the top while the studio sheet owns the lower
half of the screen. The script also hides the page's own hero copy, the live totals, the pricing
region selector and the Stripe test-mode note for the duration of the recording, because those
either duplicate the captions or should not appear in a promo.

Edit the beats and caption text directly in the script. `REEL_URL` points it at a different
server, and `CHROME_PATH` overrides the browser location.
