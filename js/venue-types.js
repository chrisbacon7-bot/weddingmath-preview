/** Venue type labels and list paging. Types are a filter, not a price. */

export const PAGE_SIZE = 24;

export const VENUE_TYPES = [
  ["hotel", "Hotel or resort"],
  ["garden", "Garden"],
  ["barn", "Barn or farm"],
  ["estate", "Historic estate"],
  ["museum", "Museum"],
  ["winery", "Winery or brewery"],
  ["loft", "Rooftop or loft"],
  ["waterfront", "Waterfront"],
  ["club", "Country club"],
  ["restaurant", "Restaurant"],
  ["park", "Park"],
  ["ballroom", "Ballroom"],
];

const TYPE_IDS = new Set(VENUE_TYPES.map(([id]) => id));

export function isVenueType(id) {
  return TYPE_IDS.has(id);
}

export function venueTypeLabel(id) {
  return (VENUE_TYPES.find((row) => row[0] === id) || [])[1] || "";
}

/** Primary type. An explicit venueType wins. Older cards are inferred from vibes. */
export function venueTypeOf(venue) {
  if (venue && isVenueType(venue.venueType)) return venue.venueType;
  const vibes = new Set((venue && venue.vibes) || []);
  if (vibes.has("museum") || vibes.has("art")) return "museum";
  if (vibes.has("waterfront")) return "waterfront";
  if (vibes.has("garden")) return "garden";
  if (vibes.has("all-inclusive") || vibes.has("resort")) return "hotel";
  if (vibes.has("estate") || vibes.has("historic")) return "estate";
  if (vibes.has("ballroom")) return "ballroom";
  return "";
}

export function capacityBand(venue, band) {
  const cap = Number(venue && venue.capacity);
  if (!Number.isFinite(cap) || cap <= 0) return false;
  if (band === "cap-75") return cap <= 75;
  if (band === "cap-200") return cap >= 76 && cap <= 200;
  if (band === "cap-201") return cap >= 201;
  return false;
}

export function pageCount(total, size = PAGE_SIZE) {
  const count = Number(total) || 0;
  if (count <= 0) return 1;
  return Math.ceil(count / size);
}

export function pageSlice(items, page, size = PAGE_SIZE) {
  const list = items || [];
  const pages = pageCount(list.length, size);
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const start = (current - 1) * size;
  return { page: current, pages, start, items: list.slice(start, start + size) };
}
