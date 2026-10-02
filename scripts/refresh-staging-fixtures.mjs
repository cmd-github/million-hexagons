// Gives staging's seeded and throwaway placements believable names, descriptions
// and real websites to click through to, so the globe reads like a populated
// product during testing. Placements Craig made by hand are left alone, and the
// seeded brands keep their names because their artwork spells them out.
//
//   node scripts/refresh-staging-fixtures.mjs          # dry run: prints the changes
//   node scripts/refresh-staging-fixtures.mjs --apply  # writes them
//
// Writes straight to staging Firestore with your gcloud login (`gcloud auth login`
// as an account with access to million-hexagons). Only the public text fields
// change: the placement's title and search key, and the title, description and
// website on the version the catalogue serves. Artwork, cells, ownership and
// version history are untouched, and the already-generated share images keep
// their old wording until the placement is next published.
import { execSync } from 'node:child_process';

const apply = process.argv.includes('--apply');
const base = 'https://firestore.googleapis.com/v1/projects/million-hexagons/databases/(default)/documents';
const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

const updates = {
  '11bb45a7-848f-9afd-bb05-1ab161832882': ['Daybreak', 'Small-batch coffee, roasted at sunrise and on your doorstep by the weekend.', 'https://en.wikipedia.org/wiki/Coffee_roasting'],
  '23ac0d98-e310-148d-0614-d7551e4bf3b7': ['Northstar', 'Night-sky walks and stargazing weekends in the darkest corners of the country.', 'https://en.wikipedia.org/wiki/Dark-sky_preserve'],
  '271f26e6-a70a-0ab4-a60e-177b9e1d953e': ['Tide', 'Surf lessons and board hire for beginners, open every day the sea allows.', 'https://en.wikipedia.org/wiki/Surfing'],
  '298ed39a-8cc7-c69e-3c53-7bd56d4dfd1b': ['Fable', 'An independent bookshop with a reading café and a children’s story hour every Saturday.', 'https://www.gutenberg.org/'],
  '3111e687-1c93-4885-d0a9-8ca72a741b8a': ['Kite', 'Lightweight kites for beaches and parks, designed and stitched by hand.', 'https://en.wikipedia.org/wiki/Kite'],
  '480979cd-f60c-5dfb-98ca-5c70e46e42b5': ['Good Egg', 'Free-range breakfasts and brunch, all day, from a little kitchen by the market.', 'https://en.wikipedia.org/wiki/Full_breakfast'],
  '8be34d7e-69e9-61f2-8466-0a26e88441ea': ['Ember', 'Wood-fired pizza made with slow-proved dough and whatever the farm sent this week.', 'https://en.wikipedia.org/wiki/Neapolitan_pizza'],
  '8ca80f4e-239b-1d5a-2235-55d885aaf314': ['Signal', 'A weekly newsletter on the ideas and tools changing how small teams work.', 'https://en.wikipedia.org/wiki/Newsletter'],
  'aa4cdb53-164d-16c8-a79d-1a3b1684318e': ['Moss', 'Houseplants, terrariums and repotting workshops for people with small flats.', 'https://www.rhs.org.uk/'],
  'eae090cc-1cc7-b454-0794-6b15a2cb7085': ['Fieldwork', 'Outdoor learning trips for schools: rivers, woodland and coastline, in any weather.', 'https://en.wikipedia.org/wiki/Field_trip'],
  'fab935db-c2f1-ba5c-3005-07abd2e6cdfd': ['Orbit', 'Beginner telescopes and astronomy kits, with a free first-night guide.', 'https://www.nasa.gov/'],
  'fbf6d122-7f0f-aee5-4bed-9791a9dc6ad0': ['Nightjar', 'A late-night jazz bar with live sets from Thursday to Sunday.', 'https://en.wikipedia.org/wiki/Jazz'],
  '4ffb161c-3177-47ac-b0cf-b90841b57234': ['Over Easy', 'Weekend pop-up brunch serving eggs every way you can think of.', 'https://en.wikipedia.org/wiki/Eggs_as_food'],
  '5399f36e-7d30-427b-9f84-6c4200c872ba': ['Island Makers', 'A directory of independent makers across the UK, from potters to printmakers.', 'https://www.craftscouncil.org.uk/'],
  '5c4e98ef-46a0-498f-b023-f56427209165': ['Greenway Cycles', 'Bike repairs, servicing and route maps for quiet cycle paths.', 'https://www.sustrans.org.uk/'],
  '64f0791c-4331-4a69-90f6-3a5ef10d9c57': ['Harbour Lights', 'A seaside photography studio for portraits, weddings and family days out.', 'https://en.wikipedia.org/wiki/Lighthouse'],
  '78a40060-ac38-434f-8629-5b8419535314': ['Big Boot', 'Football coaching for under-12s, with weekend sessions on community pitches.', 'https://www.thefa.com/'],
  '8eedada4-f133-43c7-9d41-ef7972c432cd': ['Paper Moon', 'Handmade cards and stationery, printed on recycled paper.', 'https://en.wikipedia.org/wiki/Letterpress_printing'],
  '933800a0-bf53-4cfa-93ca-6eccf4a60252': ['Tiny Atlas', 'Hand-drawn maps of small towns, one street at a time.', 'https://www.openstreetmap.org/'],
  '93587a1a-a736-4812-bea5-eb3e7d9602f4': ['Blue Hour Studio', 'Branding and web design for independent shops and cafés.', 'https://en.wikipedia.org/wiki/Blue_hour'],
  'cb963840-0598-4e78-a1d6-90d2cb79ed84': ['Pocket Garden', 'Seed kits for windowsills and balconies, with planting guides for every month.', 'https://www.rhs.org.uk/'],
};

async function firestore(path, { method = 'GET', fields, mask } = {}) {
  const query = mask ? '?' + mask.map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&') : '';
  const response = await fetch(`${base}/${path}${query}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, ...(fields ? { body: JSON.stringify({ fields }) } : {}) });
  const value = await response.json();
  if (!response.ok) throw Error(`${method} ${path}: ${value.error?.message || response.status}`);
  return value;
}
const text = value => ({ stringValue: value });
const number = field => Number(field?.integerValue ?? field?.doubleValue ?? 0);

const report = [];
for (const [placementId, [title, description, destinationUrl]] of Object.entries(updates)) {
  const row = { placementId, title, description, destinationUrl };
  try {
    const placement = (await firestore(`stagingPlacements/${placementId}`)).fields;
    if (['deleted', 'revoked'].includes(placement.status?.stringValue)) { report.push({ ...row, skipped: placement.status.stringValue }); continue; }
    const publicState = placement.publicState?.mapValue?.fields || {};
    const version = number(publicState.publicVersion) || number(placement.currentPublishedVersion) || number(placement.currentVersion) || 1;
    row.from = placement.title?.stringValue;
    row.version = version;
    // A moderator's override on the public description or link would hide this change.
    if (publicState.description || publicState.destinationUrl) row.note = 'has a moderation override on description or link';
    if (apply) {
      await firestore(`stagingPlacementVersions/${placementId}-v${version}`, { method: 'PATCH', fields: { title: text(title), description: text(description), destinationUrl: text(destinationUrl) }, mask: ['title', 'description', 'destinationUrl'] });
      await firestore(`stagingPlacements/${placementId}`, { method: 'PATCH', fields: { title: text(title), titleSearch: text(title.toLowerCase()) }, mask: ['title', 'titleSearch'] });
      row.updated = true;
    }
  } catch (error) { row.error = error.message; }
  report.push(row);
}
console.log(JSON.stringify({ applied: apply, placements: report }, null, 2));
