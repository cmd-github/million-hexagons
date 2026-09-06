# Coming-soon globe wording

The isolated `coming-soon/` site displays repeated “MILLION HEXAGONS” in pale blue letter hexagons across the equator and “COMING SOON” in lime above and below. Rows repeat in four evenly spaced sectors and retain the existing drag/rotation behaviour. Canvas accessibility text names both phrases.

Validation: `npm run build:coming-soon` passed; desktop 1440×1000 and mobile 390×844 screenshots were inspected, with a drag gesture exercised and no browser page errors. Evidence: `artifacts/coming-soon/words-desktop.png` and `words-mobile.png`. Curved surface text naturally foreshortens and passes out of view while rotating.

Publishing uses the existing Firebase project `million-hexagons` and `firebase.json`, whose public directory is `coming-soon-dist`. The development purchase globe is not part of this release. Existing unrelated uncommitted work remains untouched; the earlier explicit no-commit/no-push instruction remains in effect.

Deployment was attempted but blocked: Firebase rejected the stored refresh credentials as no longer valid. No live update was published. Reauthenticate with `firebase.cmd login --reauth`, then deploy the prepared build with `firebase.cmd deploy --only hosting --project million-hexagons`.
