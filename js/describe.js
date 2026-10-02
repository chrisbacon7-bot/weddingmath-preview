/** Turn a location id into the place the estimator understands. */

export function normalizeQuery(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchPlaces(query, aliases) {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const exact = [];
  const starts = [];
  for (const alias of aliases) {
    if (alias.q === q) exact.push(alias);
    else if (q.length >= 3 && alias.q.startsWith(q)) starts.push(alias);
  }
  const seen = new Set();
  const out = [];
  for (const alias of [...exact, ...starts]) {
    if (seen.has(alias.id)) continue;
    seen.add(alias.id);
    out.push(alias);
    if (out.length === 8) break;
  }
  return out;
}

export function describe(id, { geo, costs, zipState = null } = {}) {
  if (!id || id === "national") {
    return {
      id: "national",
      label: "Not sure yet",
      shortLabel: "the US",
      tier: "N",
      tierLabel: "National figures",
      stateAbbr: null,
      stateName: null,
      metroId: null,
      knot: null,
      zola150: null,
      curve: null,
      scope: "National averages. Pick a city or ZIP when you know where the wedding is.",
    };
  }

  if (id.startsWith("sub:")) {
    const key = id.slice(4);
    const sub = costs.subs[key];
    if (!sub) return null;
    const parent = describe(`metro:${sub.parent}`, { geo, costs, zipState });
    return {
      ...parent,
      id,
      label: sub.label,
      shortLabel: sub.label,
      tier: "A",
      tierLabel: "Sourced city figure",
      knot: parent.knot,
      zola150: sub.zola150,
      curve: null,
      preferZola: true,
      subReferences: [],
      scope: `${sub.label} uses Zola's 150-guest figure. The Knot number beside it is for New York City as a whole, not this borough alone.`,
      knotNote: "The Knot average for New York City",
    };
  }

  if (id.startsWith("state:")) {
    const abbr = id.slice(6);
    if (abbr === "DC") return describe("metro:47900", { geo, costs, zipState: "DC" });
    const state = geo.states[abbr];
    const row = costs.states[abbr];
    if (!state || !row) return null;
    return {
      id,
      label: state.name,
      shortLabel: state.name,
      tier: "B",
      tierLabel: "Sourced state figures",
      stateAbbr: abbr,
      stateName: state.name,
      stateKnot: row.knot,
      metroId: null,
      metroName: null,
      knot: null,
      zola150: null,
      curve: null,
      rpp: { state: state.rpp, metro: null },
      scope: null,
    };
  }

  if (id.startsWith("metro:")) {
    const code = id.slice(6);
    const metro = geo.metros[code];
    if (!metro) return null;
    const wedding = costs.metros[code] || null;
    const stateAbbr = zipState && metro.states.includes(zipState) ? zipState : metro.primaryState;
    const state = geo.states[stateAbbr];
    const row = costs.states[stateAbbr];
    const base = {
      id,
      label: metro.name,
      shortLabel: metro.short,
      metroId: code,
      metroName: metro.name,
      stateAbbr,
      stateName: state ? state.name : stateAbbr,
      stateKnot: row ? row.knot : null,
      rpp: {
        metro: metro.rpp,
        state: state ? state.rpp : null,
      },
      otherStates: metro.states.filter((abbr) => abbr !== stateAbbr),
    };

    if (wedding && (wedding.knot || wedding.zola150 || wedding.curve)) {
      const subs = Object.entries(costs.subs)
        .filter(([, sub]) => sub.parent === code)
        .map(([key, sub]) => ({ id: key, label: sub.label, value: sub.zola150 }));
      return {
        ...base,
        tier: "A",
        tierLabel: "Sourced city figure",
        knot: wedding.knot || null,
        zola150: wedding.zola150 || null,
        curve: wedding.curve || null,
        zolaVenue150: wedding.zolaVenue150 || null,
        scope: wedding.scope || null,
        subReferences: subs,
        knotNote: `The Knot average for ${metro.short}`,
      };
    }

    return {
      ...base,
      tier: "C",
      tierLabel: "Estimated from state data",
      knot: null,
      zola150: null,
      curve: null,
      scope: "This metro does not have its own Knot or Zola wedding figure.",
    };
  }

  return null;
}

export function describeZip(zip, zips, ctx) {
  const hit = zips[zip];
  if (!hit) return { error: "missing" };
  const id = hit.m ? `metro:${hit.m}` : `state:${hit.s}`;
  const place = describe(id, { ...ctx, zipState: hit.s });
  if (!place) return { error: "missing" };
  return { place: { ...place, zip } };
}
