The current behaviour is functional, but it feels like a developer interaction rather than something designed to make people explore the globe and make advertisers feel they’ve bought something valuable.

The closest successful precedent is still the Million Dollar Homepage: hover showed a slogan, click sent you to the advertiser. That simplicity was part of why it worked. Buyers were effectively purchasing an image + message + outbound link. But you’ve got a much richer product than a flat pixel grid, so I wouldn’t copy its behaviour literally.

What I’d do
Claimed hexagon: hover = tease, click = inspect, second action = visit

I would not immediately redirect on click.

That sounds attractive for advertisers, but I think it would make browsing the globe bloody annoying. People will accidentally leave the experience constantly when trying to rotate, zoom and inspect things.

Instead:

Hover on desktop

Show a very lightweight card:

Spotify
Music for everyone
spotify.com ↗

Maybe also:

428 hexagons

Nothing else.

Your existing hover is actually close — it just needs slightly more personality and a clearer indication that it can be clicked.

Then when they click the placement, open a richer floating card / side panel:

Spotify
Music for everyone

428 hexagons
Claimed 14 Aug 2026

Visit spotify.com ↗

View placement

That gives you an important distinction:

Clicking the globe explores Million Hexagons.
Clicking "Visit" leaves Million Hexagons.

I think that's the right mental model.

Don't make the acquisition date boring metadata

I like showing it, but I'd frame it as part of the history of the canvas.

Rather than:

Acquired: 14/08/26

Use:

On the canvas since Aug 2026

or potentially:

Hexagons #184,201–184,628
Claimed 14 August 2026

That starts turning each advert into an artefact.

And that matters because your long-term product isn't really just advertising.

It's:

"Look at this weird permanent piece of internet history."

That's where the Million Dollar Homepage remains interesting 20+ years later. Its frozen nature became part of the appeal, although dead links eventually became a major weakness.

You can design around that weakness from day one.

The advertiser card I'd build

Imagine I click the Spotify area and get:

Spotify ✓
Music for everyone.

[logo]

428 hexagons
On the canvas since 8 September 2026

spotify.com

Visit website ↗

Then subtle secondary actions:

Share placement · Copy link

And crucially:

View on map →

Every placement should have its own URL, something like:

millionhexagons.com/spotify

or

millionhexagons.com/p/spotify

That is potentially a really valuable advertiser feature.

They can post:

We're officially on Million Hexagons 👀
millionhexagons.com/p/spotify

That link should fly the globe directly to their patch.

Now advertisers aren't just buying exposure. They're getting a collectable location they can show off.

Available hexagons should do more than "Claim this space"

Your current:

Available
Claim this space

is too generic.

The interesting thing is not that one hexagon is available. It's that this is where somebody could put their thing.

I'd make click on an empty hex change the product into a very subtle purchase/discovery mode.

Something like:

This space is available

$1 per hexagon

[ Start here ]

Small secondary text:

Drag to select an area

Then once they start:

12 hexagons selected — $12

and the purchasing UI comes alive.

So there are really two states:

Browse mode

Globe is clean, cinematic, exploratory.

Claim mode

Selection tools appear.

Don't show all the buying controls until there's intent.

That keeps your homepage feeling like an internet artefact rather than SaaS software.

There's an even better interaction

When someone hovers an empty hex adjacent to an existing brand, show:

Available

Right next to Spotify
Claim from $1

That turns geography into scarcity.

Similarly:

Only 312 hexagons left in this area

or:

87% claimed nearby

That creates genuinely meaningful urgency without fake countdown bollocks.

Your scarcity is real. Use it.

Give advertisers "neighbourhoods"

This could become one of the product's best emergent features.

As the map fills, clicking somewhere could say:

Around here

Spotify
Netflix
Joe's Pizza
Acme AI

Then:

Claim a space nearby

People will naturally want placement near recognisable brands.

That's almost how physical commercial property works.

You could even eventually make central/high-interest regions worth more — which you were already thinking about — but I'd wait until the basic $1 promise has momentum.

Make browsing addictive

At the moment the interaction is essentially:

look → hover → link

You want:

look → notice → inspect → discover → move → notice something else

I'd add a tiny bottom drawer:

Explore

Newest
Biggest
Popular
Random
Near me / region
Recently claimed

Click Random and the globe swoops dramatically to some random placement.

That could be brilliant.

"Take me somewhere"

A single button:

🎲 Explore a random claim

Camera flies across the globe and lands on:

Dave's Plumbing

Claimed 17 minutes ago in Leeds
42 hexagons

Next.

That gives non-buyers a reason to spend 10 minutes messing around with it.

Add human-scale stories

Your big brands help credibility.

But weird little buyers are what will make this culturally interesting.

Surface things like:

First hexagon ever claimed

Largest claim today

Smallest logo on the canvas

Someone bought exactly 69 hexagons

This was the 500,000th hexagon claimed

Oldest active website on the canvas

Those are naturally shareable.

You don't need to make it gamified in a tacky way. Just expose the history that's already being created.

Permanent records are potentially very powerful

I would store immutable-ish original purchase metadata separately from editable advertiser metadata.

For example:

Purchased

claimant/display name
number of hexagons
date
original artwork snapshot
original destination
purchase order / placement ID

Editable

current logo
description
URL

Then an advertiser card could someday have:

History

Claimed by Spotify · 8 Sep 2026
Artwork updated · 14 Jan 2028

That gives Million Hexagons a record of how the web evolves.

And importantly, if spotify.com/foo dies in 15 years, the placement itself doesn't become useless. Link rot is one of the big things that degraded the original Million Dollar Homepage.

Give advertisers stats

This is probably obvious, but don't just sell hexagons.

Give them:

Placement views
Hover/inspection count
Website clicks
CTR
Countries viewing it
Share-link visits

Then their dashboard says:

Your placement has been seen 18,431 times
437 people opened it
92 visited your website

Suddenly a silly internet experiment also has measurable commercial value.

And you gain something powerful yourself:

Popular placements

Instead of manually curating interesting ads, the behaviour of visitors tells you.

One thing I definitely wouldn't do

Don't have hover cards constantly popping all over the place while people rotate.

That can make a 3D map feel horrible.

Use perhaps a ~250ms hover delay and cancel it immediately when movement is detected.

Desktop:

hover 250ms → small tooltip

Mobile:

tap → inspector

Click/tap should never unintentionally navigate away.

This especially matters because your UI instruction currently literally says:

DRAG TO ROTATE • SCROLL TO ZOOM • CLICK A TILE

If "click a tile" sometimes throws you onto Netflix.com, you're combining navigation and interaction in one gesture.

I'd avoid that.

I'd also distinguish a "placement" from a "hexagon"

This is important.

If Spotify owns 20,000 connected hexagons, users shouldn't feel like they're interacting with 20,000 individual records.

Hover anywhere on it:

the entire Spotify placement subtly highlights

Then the card appears.

That makes it feel like a real object sitting on the globe.

For empty tiles, interaction remains hexagon-based.

For claimed tiles, interaction becomes placement-based.

That's a much cleaner product model.

Something visually lovely you could do

When hovering a placement:

slightly brighten its hexagons
dim immediate surroundings maybe 5–10%
outline its boundary
gently raise it off the globe by a tiny amount

Not big animation.

Just enough for the eye to go:

ah — that's one claimed object.

Then when clicked, perhaps the camera nudges toward it and the info card opens.

That would make browsing feel substantially more premium.

Sharing is a massive opportunity

Every claimed placement should have:

Share

And generate something visually good:

Spotify just claimed 428 of the Million Hexagons.

999,572 remain.

[image of their actual area]

That last number is hugely important.

It reinforces the global scarcity every time someone shares.

Advertisers therefore become your distribution engine.

I'd put that remaining inventory number almost everywhere in the purchase/share journey.

I'd build a tiny "world history" layer too

Eventually:

Today

1,284 new hexagons claimed

This week

12,418 claimed

All time

384,221 / 1,000,000

Then perhaps a scrubber:

See the world on 1 Jan 2027

and the globe reconstructs itself as it looked then.

That is absolutely unnecessary for launch.

But if this succeeds, it would be a superb feature because you're creating a finite evolving object.

Advertisers should feel ownership

This wording matters enormously.

Don't say:

Your ad

Say:

Your place on the canvas

Don't say:

Create campaign

Say:

Edit your placement

Don't say:

Impressions purchased

Say:

You own 428 of the million hexagons

Obviously legally your terms should define exactly what "own" means. But experientially it should feel closer to owning a tiny plot than buying a banner ad.

That's part of the magic.

So for your screenshots specifically

I'd change the first one from:

Spotify
spotify.com

to approximately:

Spotify
Music for everyone
spotify.com ↗

and clicking it opens:

Spotify

Music for everyone.

428 hexagons
On the canvas since Sep 2026

[ Visit spotify.com ↗ ]

Share · Copy placement link

And your available one becomes:

Available

$1 per hexagon

[ Start claiming here ]

Drag to select an area

with the selected hex gently pulsing/highlighting.

My ideal interaction model
Action	Available	Claimed
Hover	Available · $1	Brand + short tagline
Click	Start/select claim	Open placement card
Double click	—	Probably nothing
Card CTA	Claim selection	Visit advertiser
Share	—	Permanent placement URL
Mobile tap	Select / claim	Open placement card

That gives you predictable behaviour everywhere.

And I'd make one overarching product decision now:

Million Hexagons should optimise first for people enjoying exploring the canvas, and second for outbound advertiser clicks.

Counterintuitively, that's also better for advertisers. If every interaction is desperately trying to eject the visitor to an advertiser's site, people won't hang around. If the globe becomes genuinely fascinating to explore, you create the audience advertisers actually want.

The original Million Dollar Homepage proved that scarcity + novelty + simple outbound advertising could be extraordinarily effective. Your opportunity is to add a layer it never really had: places, histories, exploration, analytics and shareable ownership. That's the bit I'd lean into heavily.