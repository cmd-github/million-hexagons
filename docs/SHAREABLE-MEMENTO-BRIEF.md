# Brief: design the shareable memento for a new purchase

## Design work produced from this brief

Worked through with Claude on 14 Sept 2026. Latest first; each is a published Artifact
(private — share from the artifact's own share menu before sending to anyone else).

- **[The display name system](https://claude.ai/code/artifact/41ce999a-280d-448b-affc-2d6e753ca79d)**
  — current state. One pronoun-free copy system using the owner's display name as the
  subject, so a person, company, creator or community all pass through the same template.
  All four ratios, the copy matrix, hierarchy, display-name length rules and the
  implementation sketch for `src/share/card-copy.js`.
- **[Three ways to say it](https://claude.ai/code/artifact/7e2f973b-1626-4565-bbf3-af069e93b6dd)**
  — the three emotional directions (presence, early status, permanence) and the
  compliance cautions on the last two.
- **[The quiet card and the warm card](https://claude.ai/code/artifact/48690fba-4125-4bf4-a474-f8bf6e950933)**
  — why the card needed to show the globe and explain itself, set against the deck's
  silent version.
- **[Claim card formats](https://claude.ai/code/artifact/7ba4f533-212a-4a67-bb48-d2f096d22179)**
  — faithful render of what the original deck specified, kept as the reference.

Source deck: `Million_Hexagons_-_Share_Memento (1).pptx` (Claude Design, 14 Sept 2026).

### Open question

The headline colour is unresolved. Pure white at 60px reads as too much glare in the
middle of the card; lime looked wrong, and a two-tone grey sentence looked broken. It
currently sits at a softened `#d5dde7`. If that still glares, try **reducing the headline
from 60px to ~52px and giving the space back to the globe** rather than tinting the white
any further — the problem is likely the mass of type, not its brightness.

## Where and when the share assets appear

Decided 15 Sept 2026, from the flow as built. This holds regardless of which card design
we land on.

### The moment we already have and do not use

Post-payment ([`src/main.js`](../src/main.js) `onComplete`): payment clears, a poll waits
for the placement to resolve, then after 700ms the checkout panel closes, the studio
closes, and `inspectPlacement()` flies the globe to the new placement and opens the
inspector. The buyer is looking at their own artwork on the globe — and nothing asks them
to share it.

**Trigger the card on the placement resolving, not on a timer.** The concept deck proposed
"T+3s"; there is no fixed T+3, because that poll runs up to 60 attempts at one-second
intervals. If the poll exhausts, the card must not appear at all — the existing fallback
message already tells the buyer it will show after a refresh.

**Never cover the flight.** The camera arrival is the payoff. The card assembles in the
inspector once the flight settles, about 800ms after arrival — not as a modal over it.

### The four surfaces

1. **Post-purchase, in the inspector.** The primary moment. Share, Download, Copy link;
   nothing else on screen.
2. **My Globe.** Owner cards currently offer *View on globe* and *Edit placement* only,
   with no share control anywhere. This is where an owner returns days later, and the
   cheapest meaningful change on this list. Roughly two-thirds of buyers will not post in
   the first five minutes; this is the surface that catches them.
3. **The inspector share control.** Today `#inspectorShare` is an unlabelled icon with the
   tooltip "Copy location link". Quiet is right for a stranger viewing someone else's
   placement; for the signed-in owner viewing their own it should be a labelled button.
   One control, two states.
4. **The link preview.** The Open Graph image displays itself every time anyone pastes a
   link, with no action from the buyer — the only share asset that works unattended, and
   the one that does not exist.

### Where it must not appear

- Over the camera flight, or inside the checkout panel while Stripe is still mounted.
- Before moderation passes. Generate after, never before — otherwise we hand someone a
  polished asset containing content we are about to remove.
- As a repeat prompt. Once per placement, in a fixed home. A prompt that reappears reads
  as pressure and costs the goodwill the moment earned.

### The gap this leaves

With no post-purchase email, a buyer who closes the tab loses the moment permanently — the
card then lives only where they cannot see it. My Globe softens this for signed-in owners,
but only for those who return unprompted.

## Still unbuilt, and still the blocker

None of the above compensates for a pasted link arriving as grey text. Open Graph and
Twitter Card metadata ship alongside the card or the loop leaks where it converts best.

---

This file is a prompt to hand to a design-capable LLM or a designer who has never seen the
product. Everything below the line is the prompt itself — paste it whole. Keep the facts in
it accurate if the product changes; it deliberately states what is and is not true today so
the recipient does not invent capabilities or claims.

---

You are designing a **shareable memento** for a product you have not seen before. Read the
context carefully, then produce concepts. Where something is genuinely ambiguous, state your
assumption and continue — do not stop to ask unless a wrong guess would waste the whole
effort.

## The product

Million Hexagons is a single shared 3D globe on a website, divided into exactly **1,000,000
claimable spaces** — 999,988 hexagons and 12 pentagons. That is the entire supply, permanently.

People and businesses buy a connected area of those hexagons and put something of their own
inside it: a logo, artwork, a message, a link. You can spin and zoom the globe, click any
claimed area to see whose it is, and visit their website. It is part advertising inventory,
part creative canvas, part internet experiment. It becomes more interesting as it fills.

The globe is a recognisable shared object and the product's main visual hook. **It is not
Earth** and implies no geographic ownership — a hexagon is not a place on a map.

## What actually happens when someone buys

1. They design their artwork in-browser, choose where it goes on the globe, and pay.
2. Their placement appears on the live globe.
3. They get a **permanent link** to it, of the form `https://<site>/#placement=<uuid>`.
   Opening that link flies the globe to their placement and opens a detail panel.
4. They can sign in later by email to edit the artwork or details. The placement itself and
   the cells it occupies never change.

At the moment of purchase the product knows: the **artwork image**, an optional **company
name**, an optional **one-line description** (160 chars), an optional **website URL**, the
**number of hexagons** owned, the **hexagon ID** of the placement's anchor cell (an integer
from 1 to 1,000,000), the **date claimed**, and the permanent placement link.

Later it also knows measured **views** and outbound **visits** for that placement.

## The job to be done

We want every buyer to *want* to share their purchase, and we want their followers to click
through and visit the site. This is the product's main growth loop. The memento is the thing
they post.

Design what that shared object should be.

## An asset worth exploiting

The globe has a working search box that accepts either a **company name** or a **hexagon
number** (`#847231`). So a hexagon ID is effectively a memorable, quotable, searchable
address — "find me at hexagon 847231" resolves to a real destination without a link. Consider
whether that is central to the design or a footnote; argue your choice.

## Where it gets shared

Treat these as different problems, not one asset resized:

- **X** — links are clickable in the post; link previews matter; landscape imagery.
- **Facebook** — links clickable; link previews matter.
- **LinkedIn** — relevant for the business/brand buyers.
- **Instagram** — feed posts **cannot** contain a clickable link. Stories can carry a link
  sticker. Square and 4:5 feed, 9:16 stories.
- **TikTok** — video-first, 9:16, no clickable link in the caption for most accounts.
- **WhatsApp / iMessage / Slack** — private sharing, often the highest-converting path; a
  plain link with a good preview may beat any designed image here.

For the channels where a link cannot be clicked, the design has to solve "how does a viewer
get from seeing this to arriving on the site" some other way. That is a core part of the
brief, not an afterthought.

## What exists today

- An in-app share card showing the artwork, name, description, hexagons owned, the anchor
  hexagon as "Hex #N", and the permanent URL, with a native-share button and a copy-link
  button. It is generic and was not designed for this purpose.
- The browser's native share sheet where supported, falling back to copy-to-clipboard.

## What does **not** exist yet

Do not assume any of these; if your concept needs one, say so explicitly and treat it as a
cost you are asking us to pay:

- No Open Graph or Twitter Card metadata, and no share image — a pasted link currently
  produces no preview anywhere.
- No server-side image or video generation.
- No email to the buyer after purchase.
- No user profiles, follower graph, or in-product social features.
- No short-link domain.

## Brand and tone

Bold, minimal, internet-native, slightly playful, visually premium, commercially credible.
It should appeal first to internet-native individuals, creators, communities, small
businesses and startups, while staying credible to larger brands.

Existing visual language: near-black background (`#050b14`), a single bright lime accent
(`#d5fa77`), Manrope for text, DM Mono for numerals and labels. You are not obliged to stay
inside this, but say when you are departing from it and why.

Preferred vocabulary: *claim*, *placement*, *space*, *hexagons*, *place on the canvas*.

## Hard constraints on what the memento may say

These are not style preferences. Getting them wrong creates legal and trust problems:

- **Never** promise or imply guaranteed traffic, impressions, views, returns, appreciation,
  or resale value.
- **No crypto, NFT, token, mint, or "own a piece of the blockchain" framing.** This is not a
  crypto product and must not read like one.
- "Permanent" describes the **claimed placement** — not immutable artwork, and not an
  unconditional forever-service guarantee.
- Use "own" only about the placement itself. A hexagon is not land or territory.
- **Do not put a price on the memento.** Pricing varies by region and is not finalised.
- Avoid manufactured hype and fake urgency. Scarcity here is real and fixed — one million,
  that is all there will ever be — so it needs no exaggeration.

## What to produce

1. **Three to five distinct concepts**, not variations of one idea. For each: the core idea
   in one sentence, why a buyer would actually want to post it, and what makes a stranger
   click. Make them genuinely different in kind — for example a static certificate, a short
   generated animation, an interactive page, and a physical-feeling artefact are four
   different bets, not four skins.
2. For your **strongest concept**, a detailed specification:
   - Layout described precisely enough to build, at each aspect ratio it needs (1:1, 4:5,
     9:16, 1.91:1).
   - Exactly which of the known data fields appear, and what happens when the optional ones
     are empty — many buyers will have no company name, no description and no website.
   - The copy, written out in full. Include the caption or post text you would prefill.
   - The link-preview treatment for pasted links.
   - How a viewer on a no-link platform reaches the site.
3. **The moment**: where this appears in the purchase flow, what it interrupts, and what the
   buyer does next. Post-payment attention is short and easily wasted.
4. **Failure and edge cases**: artwork that is a single flat colour, a one-hexagon purchase
   next to a twelve-thousand-hexagon one, offensive or blank company names, a buyer who
   wants to stay anonymous.
5. **Measurement**: what you would instrument to know whether this works, and what number
   would tell us to kill it.
6. **Cost and sequencing**: what could ship first with no new infrastructure, and what each
   later step would require.

## How to answer

Lead with the concepts and the recommendation. Show layouts as clear structural descriptions
or ASCII sketches rather than prose paragraphs. Be specific and opinionated — if you think an
idea in this brief is wrong, say so and explain why. Do not pad, and do not restate this
brief back to us.
