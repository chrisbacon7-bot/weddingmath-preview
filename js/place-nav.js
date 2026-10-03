/** Where a chosen city should open, and which seeded lists are closest. */

const REGION = {
  CT: "ne", ME: "ne", MA: "ne", NH: "ne", RI: "ne", VT: "ne", NJ: "ne", NY: "ne", PA: "ne",
  DE: "s", MD: "s", DC: "s", VA: "s", WV: "s", NC: "s", SC: "s", GA: "s", FL: "s",
  AL: "s", KY: "s", TN: "s", MS: "s", AR: "s", LA: "s",
  IL: "mw", IN: "mw", MI: "mw", OH: "mw", WI: "mw", IA: "mw", KS: "mw", MN: "mw",
  MO: "mw", NE: "mw", ND: "mw", SD: "mw",
  TX: "sw", OK: "sw", NM: "sw", AZ: "sw",
  CO: "w", ID: "w", MT: "w", NV: "w", UT: "w", WY: "w", AK: "w", HI: "w",
  CA: "w", OR: "w", WA: "w",
};

export function cityLine(place) {
  if (!place) return "your city";
  const short = place.shortLabel || place.label || "your city";
  const abbr = place.stateAbbr;
  if (!abbr) return short;
  if (short === abbr || short.endsWith(` ${abbr}`) || short.includes(`, ${abbr}`)) return short;
  return `${short}, ${abbr}`;
}

export function venueAppPath(place, guests, budget, metros = []) {
  const params = new URLSearchParams();
  const guestCount = Number(guests);
  if (Number.isFinite(guestCount) && guestCount > 0) params.set("g", String(guestCount));
  const money = Number(String(budget ?? "").replace(/[^0-9.]/g, ""));
  if (Number.isFinite(money) && money > 0) params.set("b", String(Math.round(money)));
  const metro = place && place.metroId
    ? (metros || []).find((item) => item.id === place.metroId)
    : null;
  if (metro) {
    const query = params.toString();
    return `/venues/${metro.stateSlug}/${metro.slug}${query ? `?${query}` : ""}#venue-results`;
  }
  if (place && place.id && place.id !== "national") params.set("loc", place.id);
  const query = params.toString();
  const hash = place && place.id && place.id !== "national" ? "#venue-gap" : "";
  return `/venues${query ? `?${query}` : ""}${hash}`;
}

export function nearestSeeded(place, metros, geo, limit = 4) {
  const list = Array.isArray(metros) ? metros : [];
  if (!place || !list.length) return [];
  const abbr = place.stateAbbr || null;
  const region = abbr ? REGION[abbr] : null;
  return list
    .filter((metro) => metro.id !== place.metroId)
    .map((metro) => {
      const metroRegion = REGION[metro.state] || null;
      const sameState = abbr && metro.state === abbr;
      const sameRegion = region && metroRegion === region;
      const score = sameState ? 0 : sameRegion ? 1 : 2;
      return { metro, score };
    })
    .sort((a, b) => a.score - b.score || a.metro.name.localeCompare(b.metro.name))
    .slice(0, limit)
    .map((item) => item.metro);
}
