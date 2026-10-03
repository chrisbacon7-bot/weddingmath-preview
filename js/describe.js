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

const STATE_ABBRS = new Set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "));

export function searchPlaces(query, aliases, geo = null) {
  const raw = normalizeQuery(query);
  if (raw.length < 2 || !Array.isArray(aliases)) return [];
  const needles = [];
  const letters = raw.split(" ");
  const compact = raw.replace(/ /g, "");
  if (letters.length > 1 && letters.every((part) => part.length === 1) && compact.length >= 2 && compact.length <= 5) {
    needles.push(compact);
  }
  needles.push(raw);
  const { city, stateAbbr } = splitStateSuffix(raw, geo);
  if (city && city !== raw && city.length >= 2) needles.push(city);

  const ranked = [];
  for (const needle of needles) {
    const exact = [];
    const starts = [];
    for (const alias of aliases) {
      if (!alias || typeof alias.q !== "string" || !alias.id) continue;
      if (!aliasMatchesState(alias, stateAbbr, geo)) continue;
      const q = normalizeQuery(alias.q);
      const label = normalizeQuery(alias.label);
      if (q === needle || label === needle) exact.push(alias);
      else if (needle.length >= 3 && (q.startsWith(needle) || label.startsWith(needle))) starts.push(alias);
    }
    exact.sort((a, b) => compareAliases(a, b, needle));
    starts.sort((a, b) => compareAliases(a, b, needle));
    ranked.push(...exact, ...starts);
  }

  const seen = new Set();
  const out = [];
  for (const alias of ranked) {
    if (seen.has(alias.id)) continue;
    seen.add(alias.id);
    out.push(alias);
    if (out.length === 8) break;
  }
  return out;
}

function compareAliases(a, b, needle) {
  const rank = rankAlias(a, needle) - rankAlias(b, needle);
  if (rank) return rank;
  const length = String(a.label).length - String(b.label).length;
  if (length) return length;
  if (a.label < b.label) return -1;
  if (a.label > b.label) return 1;
  return 0;
}

/** When a bare city name matches two metros, prefer the one couples mean. */
const PREFER_METRO = {
  portland: "metro:38900",
  charleston: "metro:16700",
  columbus: "metro:18140",
  jacksonville: "metro:27260",
  richmond: "metro:40060",
  washington: "metro:47900",
  birmingham: "metro:13820",
  augusta: "metro:12260",
};

function rankAlias(alias, needle) {
  const place = alias.id.startsWith("metro:") || alias.id.startsWith("sub:");
  let score = alias.q === needle ? 0 : 100;
  if (PREFER_METRO[needle] === alias.id) score -= 40;
  if (!place) score += 30;
  score += Math.min(alias.q.length, 80);
  if (!normalizeQuery(alias.label).startsWith(needle)) score += 8;
  return score;
}

function splitStateSuffix(q, geo) {
  const parts = q.split(" ");
  if (parts.length < 2) return { city: q, stateAbbr: null };
  const last = parts[parts.length - 1];
  if (last.length === 2 && STATE_ABBRS.has(last.toUpperCase())) {
    return { city: parts.slice(0, -1).join(" "), stateAbbr: last.toUpperCase() };
  }
  if (!geo || !geo.states) return { city: q, stateAbbr: null };
  const names = Object.entries(geo.states)
    .map(([abbr, state]) => [normalizeQuery(state.name), abbr])
    .filter(([name]) => name.length > 2)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [name, abbr] of names) {
    if (q === name) return { city: q, stateAbbr: null };
    if (q.endsWith(` ${name}`)) return { city: q.slice(0, -(name.length + 1)).trim(), stateAbbr: abbr };
  }
  return { city: q, stateAbbr: null };
}

function aliasMatchesState(alias, stateAbbr, geo) {
  if (!stateAbbr) return true;
  if (alias.id.startsWith("state:")) return alias.id.slice(6) === stateAbbr;
  if (alias.id.startsWith("sub:")) return stateAbbr === "NY";
  if (!alias.id.startsWith("metro:")) return true;
  const metro = geo && geo.metros ? geo.metros[alias.id.slice(6)] : null;
  if (!metro) return geo == null;
  return metro.primaryState === stateAbbr || (Array.isArray(metro.states) && metro.states.includes(stateAbbr));
}

/** Hyphenated metro names in aliases.json must match the same way a typed query does. */
export function prepareAliases(aliases, geo) {
  const out = [];
  const seen = new Set();
  function add(alias) {
    if (!alias || !alias.id) return;
    const q = normalizeQuery(alias.q);
    if (q.length < 2) return;
    const key = `${q}\0${alias.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...alias, q });
  }
  for (const alias of Array.isArray(aliases) ? aliases : []) add(alias);
  if (geo && geo.metros) {
    for (const [code, metro] of Object.entries(geo.metros)) {
      const id = `metro:${code}`;
      const label = metro.name;
      const primary = metro.primaryState;
      const short = normalizeQuery(metro.short || String(metro.name).split(",")[0].split("-")[0]);
      if (primary && short) add({ q: `${short} ${primary.toLowerCase()}`, id, label });
      add({ q: normalizeQuery(metro.name), id, label });
    }
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
