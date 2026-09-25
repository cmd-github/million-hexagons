# Million Hexagons — Launch, Growth & Shareability Ideas

**Date:** 25 September 2026  
**Status:** Exploration / experiment backlog  
**Launch target discussed:** October 2026

## Purpose

Capture product-led marketing, launch, distribution and shareability ideas discussed while preparing Million Hexagons for launch.

This document is deliberately **not a requirements list**. It does not override:

- `09-09-26-PRODUCT-DIRECTION.md`
- `STATUS.md`
- `LAUNCH-ACCEPTANCE.md`
- the current launch gates

The goal is to preserve good ideas without turning every conversation into accidental scope.

Use these labels:

- **PRINCIPLE** — direction worth preserving when evaluating ideas.
- **PROTOTYPE CANDIDATE** — worth testing cheaply before committing.
- **CHANNEL TO EXPLORE** — distribution route worth trying, not a commitment.
- **IDEA** — useful thought to retain for later.

---

## 1. Core growth principle

**PRINCIPLE**

The globe itself should produce the marketing material.

Prefer marketing that comes from real product activity:

- purchases
- placements
- artwork
- growth
- milestones
- movement around the globe
- buyer sharing
- unusual or interesting areas

Avoid filling social accounts with generic daily AI-generated marketing copy simply to maintain posting volume.

The strongest loop is:

> Product activity -> interesting visual asset -> buyer or project shares it -> new visitor enters the globe -> new activity creates another asset.

---

## 2. Purchase reveal video

**PROTOTYPE CANDIDATE**

After a purchase, generate a short personalised reveal showing the live Million Hexagons experience moving from a standard globe view to the buyer's placement.

### Experience

- Target length: roughly **5–10 seconds**.
- Start from a recognisable standard globe position.
- Use the real site/globe camera behaviour where practical so the result feels authentic.
- Ease/rotate/zoom to the purchased placement.
- Briefly highlight the purchased area.
- Optionally show the placement name or artwork at the end.

### Delivery

- Payment confirmation should remain immediate and must not wait for rendering.
- The reveal can be created asynchronously and sent later in a welcome/follow-up email.
- Prefer a preview image/animation and a **Watch your reveal** link rather than attaching an MP4 directly to email.
- The video can also be exposed inside the owner's account later if useful.

### Technical direction to prototype

A plausible implementation is:

1. successful purchase creates a reveal-render job
2. a separate render service picks up the job
3. headless Chromium/Playwright opens a dedicated reveal route
4. the route loads the exact placement and runs a deterministic camera animation
5. the session is captured and encoded, likely with FFmpeg
6. finished output is stored in R2
7. the follow-up message is sent only when the asset is ready

A small Cloud Run render service is a candidate for Chromium/FFmpeg work. Cloudflare Workers should orchestrate rather than perform video rendering themselves.

Do not make the payment path depend on the render succeeding.

### Storage

Initial expectation is that short reveal files should be cheap enough to retain, especially compared with the value of a permanent shareable asset. Do not add deletion complexity purely to optimise pennies before real usage data exists. Put a cost/budget alert around rendering and storage and revisit with measured file sizes and render times.

---

## 3. Shareability loop

**PRINCIPLE / PROTOTYPE CANDIDATES**

Every completed purchase should create something the buyer has a reason to share.

Ideas:

- personalised reveal video
- existing permanent placement link that flies visitors to the placement
- shareable ownership/placement card
- placement image suitable for social previews
- downloadable buyer asset for Instagram/TikTok/manual sharing
- optional printable card/poster/sticker with QR code to the placement

The current permanent placement URL and social preview work are foundations for this, not separate concepts to rebuild.

Avoid language that makes the product feel like an NFT, token, speculative asset or financial instrument.

---

## 4. Globe growth time-lapse

**PROTOTYPE CANDIDATE**

Periodically capture the state of the globe so Million Hexagons can show it filling over time.

Potential uses:

- weekly/monthly social clips
- milestone videos
- launch retrospectives
- press assets
- homepage/marketing content
- future historical playback in the product

A low-cost implementation could retain periodic state snapshots rather than rendered video for every interval, then generate time-lapses on demand.

If this grows into an in-product history feature, design it from authoritative placement/publication data rather than screenshots alone.

---

## 5. Narrated product demo

**PROTOTYPE CANDIDATE**

Create a short product demo that shows the real globe experience without requiring Craig to narrate it personally.

Suggested format:

- real screen capture of the site
- short scripted narration
- natural AI voiceover
- captions
- subtle music only if it helps
- one master version, then shorter social cuts

The demo should show the product rather than trying to look like a corporate launch advert.

Voice/editing tool is intentionally **TBD**. Free/low-cost tools can be tested first; do not commit the product to a particular vendor from this note.

---

## 6. Social distribution

### Existing project accounts

At the time of this discussion, Million Hexagons has accounts/pages on:

- Facebook
- Instagram
- X
- LinkedIn

### Additional channels

**CHANNEL TO EXPLORE — YouTube Shorts**

Especially suitable for:

- reveal clips
- globe time-lapses
- milestones
- short product demos
- unusual placement discoveries

**CHANNEL TO EXPLORE — Threads**

Potential low-effort extension of visual/social content where cross-posting is appropriate.

**CHANNEL TO EXPLORE — Pinterest**

Potentially relevant because the product is visual. Treat as an experiment rather than a core launch channel.

### Automation principle

**PRINCIPLE**

Automate publishing and preparation where safe, but do not build an autonomous spam/engagement bot.

Prefer:

- native scheduling
- supported platform APIs/integrations
- a central content queue
- event-driven posts generated by real product events
- human approval for replies/comments/engagement that represents a person or brand directly

Avoid relying on browser/UI automation for follows, likes, comments, invitations or other engagement where platform rules make scripted behaviour risky.

Birdcage Bot can remain the orchestration/content-preparation brain without needing to impersonate a human clicking around social websites.

---

## 7. Event-driven social content

**PROTOTYPE CANDIDATE**

Build content around actual events rather than a fixed quota of generic posts.

Potential triggers:

- a meaningful number of new hexagons claimed
- first purchase / early launch moments
- notable milestones
- a large placement
- an interesting or unusual piece of artwork
- a weekly growth snapshot
- a time-lapse becoming worth publishing
- a newly populated area of the globe
- a buyer choosing to share their placement

Potential output:

- generated image
- short camera flyover
- time-lapse
- caption variants tailored to each platform

Keep moderation/brand-safety checks between user-generated content and any automated project-owned amplification.

---

## 8. Early audience seeding

**IDEA / MANUAL-ASSISTED**

A new account with no followers has a distribution problem, not necessarily a content problem.

Useful groundwork can be prepared automatically while keeping higher-risk engagement human-controlled.

Birdcage Bot could:

- find relevant discussions/accounts
- identify good opportunities to contribute
- score relevance
- draft short replies or quote-post commentary
- prepare a small approval queue
- track which interactions lead to visits/follows

The final engagement action should remain manual or use a supported platform route.

For LinkedIn, the founder's existing personal network can be used selectively to seed the company page and occasionally amplify genuinely interesting Million Hexagons posts.

---

## 9. Earned media and launch outreach

**CHANNEL TO EXPLORE**

Prioritise earned attention over buying conventional print advertising before the product has evidence of demand.

Potential routes:

- creative/design publications
- technology and internet-culture publications
- startup/indie newsletters
- podcasts
- Product Hunt
- local press / founder story
- relevant communities

### Press kit

Prepare a lightweight reusable launch pack containing:

- concise explanation of Million Hexagons
- strong screenshots
- short globe/demo video
- logo/brand assets
- founder/project background
- launch target/status
- contact route
- clear product facts and claims guardrails

### PR hooks

Do not rely on one generic "we launched" pitch.

Possible repeatable hooks:

- launch
- first meaningful sales milestone
- 10,000 / 100,000 / percentage-filled milestones where they are genuinely newsworthy
- notable community participation
- unusual visual moments
- a major time-lapse
- interesting technical/build stories

Do not manufacture fake scarcity or pretend sample brands are customers.

---

## 10. Physical / real-world ideas

**IDEAS**

Physical marketing should be on-brand and shareable, not generic leaflet distribution.

Potential experiments:

- small batches of hexagonal QR stickers/cards
- QR destination that opens a specific placement or the globe
- numbered physical hexagons tied to digital locations
- limited shirts for the founder/team/events or prizes
- downloadable buyer-owned printable badge/card/poster

Avoid buying large quantities of merchandise or generic flyers before there is evidence they will be useful.

The most interesting physical concept is a real-world hexagon that directly connects to a corresponding place on the digital globe.

---

## 11. Blog/content launch asset

**IN PROGRESS OUTSIDE THE REPO**

A Birdcage Bot task has been created to draft a Million Hexagons blog post that:

- introduces the idea
- explains what the site does
- centres the story on one million spaces gradually being claimed
- uses the existing project/repo context rather than inventing features
- mentions an **October 2026 launch target** without presenting an unconfirmed fixed launch date
- avoids generic corporate, crypto/NFT and overhyped language
- produces a draft for review rather than publishing automatically

---

## 12. Launch asset checklist

**IDEA / PRE-LAUNCH CHECKLIST**

Useful reusable assets to have available before broad outreach:

- 20–45 second core product demo
- 5–10 strong screenshots
- short vertical social cut(s)
- concise project description
- press/founder description
- logo pack
- social preview examples
- FAQ/claims guardrails
- one-page press kit
- buyer share example
- globe growth/time-lapse sample once enough activity exists

---

## 13. Measurement

**PRINCIPLE**

Measure whether attention becomes meaningful product activity, not just follower counts.

Useful funnel:

> source -> visit -> globe interaction -> purchase flow -> checkout -> purchase -> share/referral

Track, where practical and privacy-appropriate:

- acquisition source
- visits
- meaningful globe interactions
- placement-page visits
- purchase-flow starts
- checkout starts/completions
- purchases
- share actions
- visits generated by shared placement links/assets
- repeat visits

Followers and impressions can be useful context but should not be treated as the primary success metric.

---

## 14. Cost guardrails

**PRINCIPLE**

Every automated marketing/media feature should have a simple budget and failure boundary.

Examples:

- reveal render concurrency limits
- maximum render duration
- output-size limits
- storage lifecycle visibility
- email/send volume visibility
- social automation/tooling spend cap
- alerts if media generation suddenly becomes materially expensive

Do not prematurely optimise low-cost storage at the expense of product simplicity. Measure first.

---

## 15. Moderation and brand safety

**PRINCIPLE**

Do not automatically promote arbitrary user content from the globe without a moderation/eligibility layer.

This applies to:

- featured placements
- event-driven social posts
- milestone videos containing user artwork
- public time-lapses
- press assets
- random-discovery content amplified by project-owned accounts

Product publication state and marketing-feature eligibility should be considered separate concerns if automation expands.

---

## 16. Experiment backlog

These are experiments, not launch blockers.

1. Render one real 5–10 second purchase-reveal proof of concept.
2. Measure render time, output size and headless-globe reliability before choosing infrastructure permanently.
3. Start retaining periodic globe state snapshots suitable for later time-lapse generation.
4. Produce one short narrated product demo using a low-cost/free voice and editing route.
5. Test one event-driven social post generated from real globe activity.
6. Test YouTube Shorts with existing visual assets before treating it as a core channel.
7. Build a lightweight press kit.
8. Trial a small, carefully targeted earned-media outreach list.
9. Test a small batch of physical QR hexagons/cards only if there is a good distribution setting.
10. Review funnel/share data after real purchases before building more elaborate referral or growth systems.

---

## Decision rule

Before promoting an item from this document into product scope, ask:

1. Does it materially improve purchase satisfaction, sharing, discovery or distribution?
2. Can it be tested cheaply first?
3. Does it conflict with a launch gate or consume launch-critical time?
4. Can success be measured?
5. Does it preserve the product's straightforward non-crypto, non-hype positioning?

If an idea is interesting but fails those tests, leave it here until there is evidence to revisit it.
