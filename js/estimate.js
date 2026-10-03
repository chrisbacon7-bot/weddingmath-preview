/**
 * Wedding planning estimates.
 *
 * The Knot and Zola are never averaged. A planning number uses one method,
 * and the other study stays beside it as its own figure.
 *
 * Guest-count method: Knot city and state averages describe a typical wedding
 * (117 guests nationally). Catering is published per guest. Drinks, cake,
 * rentals, favors, and invitations are published as averages at that typical
 * size and are treated as scaling with the headcount. Venue, photo, music,
 * and the other fixed lines stay put. At 117 guests the result matches the
 * Knot average exactly.
 *
 * Knot's guest-count bands are shown as a national reference. They are not
 * used as a step multiplier, because a 117-guest wedding would stop matching
 * the published average.
 *
 * Where Zola publishes a guest-count curve (Chicago), that curve is the
 * planning estimate. Elsewhere a Zola-only city is anchored at 150 guests.
 */

import { formatMoney } from "./format.js";

export const MIN_GUESTS = 10;
export const MAX_GUESTS = 400;

export function clampGuests(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 117;
  return Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, n));
}

export function guestCountNote(typed, used) {
  if (!Number.isFinite(typed)) return "The guest box was empty, so this uses 117, The Knot's average guest count.";
  if (typed < MIN_GUESTS) return `${typed} is below the ${MIN_GUESTS}-guest floor on this calculator, so this uses ${used}.`;
  if (typed > MAX_GUESTS) return `${typed} is above the ${MAX_GUESTS}-guest ceiling on this calculator, so this uses ${used}.`;
  return "";
}

export function modelCategories(costs) {
  return costs.categories.filter((cat) => cat.inModel);
}

export function modelAmount(cat, guests) {
  if (cat.basis === "fixed") return cat.amount;
  if (cat.basis === "per_guest") return cat.amount * guests;
  if (cat.basis === "at_guest_count") return (cat.amount * guests) / cat.anchorGuests;
  throw new Error(`Unknown basis for ${cat.id}`);
}

export function modelTotal(costs, guests) {
  return modelCategories(costs).reduce((sum, cat) => sum + modelAmount(cat, guests), 0);
}

export function modelFixed(costs) {
  return modelCategories(costs)
    .filter((cat) => cat.basis === "fixed")
    .reduce((sum, cat) => sum + cat.amount, 0);
}

export function modelPerGuest(costs) {
  return modelCategories(costs).reduce((sum, cat) => {
    if (cat.basis === "per_guest") return sum + cat.amount;
    if (cat.basis === "at_guest_count") return sum + cat.amount / cat.anchorGuests;
    return sum;
  }, 0);
}

function curveValue(curve, guests) {
  const pts = [...curve].sort((a, b) => a.guests - b.guests);
  const exact = pts.find((pt) => pt.guests === guests);
  if (exact) return { value: exact.value, exact: true, extrapolated: false };
  if (guests < pts[0].guests) {
    const slope = (pts[1].value - pts[0].value) / (pts[1].guests - pts[0].guests);
    return { value: pts[0].value + (guests - pts[0].guests) * slope, exact: false, extrapolated: true, direction: "below" };
  }
  const last = pts[pts.length - 1];
  if (guests > last.guests) {
    const prev = pts[pts.length - 2];
    const slope = (last.value - prev.value) / (last.guests - prev.guests);
    return { value: last.value + (guests - last.guests) * slope, exact: false, extrapolated: true, direction: "above" };
  }
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (guests >= a.guests && guests <= b.guests) {
      const t = (guests - a.guests) / (b.guests - a.guests);
      return { value: a.value + t * (b.value - a.value), exact: false, extrapolated: false };
    }
  }
  return { value: pts[0].value, exact: false, extrapolated: false };
}

function scaleFromAnchor(anchorTotal, guests, anchorGuests, costs) {
  return anchorTotal * (modelTotal(costs, guests) / modelTotal(costs, anchorGuests));
}

function stateRow(costs, abbr) {
  return costs.states[abbr] || null;
}

/**
 * Build the planning result for a described place.
 * place comes from describe.js.
 */
export function planFor(place, guests, costs, options = {}) {
  const g = clampGuests(guests);
  const season = options.season ? costs.seasons.find((item) => item.id === options.season) : null;
  const seasonFactor = season ? season.value / costs.national.knotAverage.value : 1;
  const built = buildPlace(place, g, costs);
  const apply = (n) => (Number.isFinite(n) ? n * seasonFactor : n);
  const result = {
    ...built,
    guests: g,
    season: season || null,
    seasonFactor,
    value: apply(built.value),
    low: apply(built.low),
    high: apply(built.high),
    knotScaled: apply(built.knotScaled),
    zolaScaled: built.zolaScaled
      ? {
          ...built.zolaScaled,
          value: apply(built.zolaScaled.value),
          low: apply(built.zolaScaled.low),
          high: apply(built.zolaScaled.high),
        }
      : null,
    exact: built.exact && !season,
  };
  if (season) {
    result.lines = [
      ...result.lines,
      `Season adjustment: The Knot's ${season.label} weddings averaged ${season.value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} nationally, against ${costs.national.knotAverage.value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} overall. That ratio is applied on top. It is a national pattern, not a local one.`,
    ];
  }
  result.planningTotal = result.kind === "range" ? (result.low + result.high) / 2 : result.value;
  result.usingMidpoint = result.kind === "range";
  return result;
}

function buildPlace(place, guests, costs) {
  const knotGuests = costs.national.knotGuests.value;
  const zolaGuests = costs.national.zolaCityGuests.value;
  const lines = [];
  const references = [];

  if (place.tier === "N") {
    const value = scaleFromAnchor(costs.national.knotAverage.value, guests, knotGuests, costs);
    references.push(publishedKnot(costs.national.knotAverage.value, "Couples nationally, actual average"));
    references.push({
      study: "Zola",
      label: "National average",
      value: costs.national.zolaAverage.value,
      exact: true,
      note: "Zola's published average. Not adjusted, and not combined with The Knot.",
    });
    lines.push("Planning estimate: The Knot's national average, adjusted for your guest count with the category mix below.");
    if (guests === knotGuests) lines.push("At 117 guests this matches The Knot's published average exactly.");
    return pointResult({
      tier: "N",
      value,
      exact: guests === knotGuests,
      knotScaled: value,
      lines,
      references,
      basis: "knot",
    });
  }

  if (place.tier === "A" && place.curve) {
    const curved = curveValue(place.curve, guests);
    references.push(publishedKnot(place.knot, place.knotNote || "The Knot city average"));
    const at150 = place.curve.find((pt) => pt.guests === 150);
    if (at150) {
      references.push({
        study: "Zola",
        label: "150-guest wedding",
        value: at150.value,
        exact: true,
        note: "Published for 150 guests.",
      });
    }
    lines.push("Planning estimate: Zola's published Chicago guest-count curve. Figures between the published guest counts are straight-line steps from one published point to the next.");
    if (curved.extrapolated) {
      lines.push(curved.direction === "below"
        ? "Your guest count is under 50, the smallest count Zola publishes for Chicago. The ends of the curve are extended and should be treated loosely."
        : "Your guest count is over 300, the largest count Zola publishes for Chicago. The ends of the curve are extended and should be treated loosely.");
    }
    if (place.knot) {
      lines.push("The Knot's city average is shown beside this. It is actual spend, not a 150-guest model, and it is not averaged in.");
    }
    return pointResult({
      tier: "A",
      value: curved.value,
      exact: curved.exact,
      knotScaled: place.knot ? scaleFromAnchor(place.knot, guests, knotGuests, costs) : null,
      zolaScaled: { value: curved.value, low: null, high: null },
      lines,
      references,
      basis: "zola-curve",
      extrapolated: curved.extrapolated,
    });
  }

  if (place.tier === "A" && place.preferZola && place.zola150) {
    const value = scaleFromAnchor(place.zola150, guests, zolaGuests, costs);
    if (place.knot) references.push(publishedKnot(place.knot, place.knotNote || "The Knot city average"));
    references.push({
      study: "Zola",
      label: "150-guest wedding",
      value: place.zola150,
      exact: true,
      note: "Published for this place at 150 guests. This is the planning estimate.",
    });
    lines.push("Planning estimate: Zola's 150-guest figure for this place, adjusted for your guest count. The Knot figure beside it covers a wider city and is not averaged in.");
    if (place.scope) lines.push(place.scope);
    return pointResult({
      tier: "A",
      value,
      exact: guests === zolaGuests,
      knotScaled: place.knot ? scaleFromAnchor(place.knot, guests, knotGuests, costs) : null,
      zolaScaled: { value, low: null, high: null },
      lines,
      references,
      basis: "zola",
    });
  }

  if (place.tier === "A" && place.knot && !place.zola150) {
    const value = scaleFromAnchor(place.knot, guests, knotGuests, costs);
    references.push(publishedKnot(place.knot, place.knotNote || "The Knot city average"));
    pushSubReferences(place, references);
    lines.push("Planning estimate: The Knot's city average, adjusted for your guest count.");
    if (guests === knotGuests) lines.push("At 117 guests this matches the published city average.");
    if (place.scope) lines.push(place.scope);
    return pointResult({
      tier: "A",
      value,
      exact: guests === knotGuests,
      knotScaled: value,
      lines,
      references,
      basis: "knot",
    });
  }

  if (place.tier === "A" && place.knot && place.zola150) {
    const value = scaleFromAnchor(place.knot, guests, knotGuests, costs);
    const zolaScaled = scaleFromAnchor(place.zola150, guests, zolaGuests, costs);
    references.push(publishedKnot(place.knot, place.knotNote || "The Knot city average"));
    references.push({
      study: "Zola",
      label: "150-guest wedding",
      value: place.zola150,
      exact: true,
      note: "Published for 150 guests. Shown as its own number.",
    });
    lines.push("Planning estimate: The Knot's city average, adjusted for your guest count. Zola's 150-guest figure is shown beside it and is not averaged in.");
    if (place.scope) lines.push(place.scope);
    return pointResult({
      tier: "A",
      value,
      exact: guests === knotGuests,
      knotScaled: value,
      zolaScaled: { value: zolaScaled, low: null, high: null },
      lines,
      references,
      basis: "knot",
    });
  }

  if (place.tier === "A" && place.zola150 && !place.knot) {
    const value = scaleFromAnchor(place.zola150, guests, zolaGuests, costs);
    references.push({
      study: "Zola",
      label: "150-guest wedding",
      value: place.zola150,
      exact: true,
      note: "This city does not have a Knot city average in the 2026 study.",
    });
    lines.push("Planning estimate: Zola's 150-guest city figure, adjusted for your guest count with the national category mix. At 150 guests it matches the published figure.");
    if (place.scope) lines.push(place.scope);
    return pointResult({
      tier: "A",
      value,
      exact: guests === zolaGuests,
      knotScaled: null,
      zolaScaled: { value, low: null, high: null },
      lines,
      references,
      basis: "zola",
    });
  }

  if (place.tier === "B") {
    const row = stateRow(costs, place.stateAbbr);
    const value = scaleFromAnchor(row.knot, guests, knotGuests, costs);
    references.push(publishedKnot(row.knot, `Couples in ${place.stateName}`));
    let zolaScaled = null;
    if (row.zolaLow != null && row.zolaHigh != null) {
      references.push({
        study: "Zola",
        label: "State budget range",
        low: row.zolaLow,
        high: row.zolaHigh,
        exact: true,
        note: "Zola's published state range. The guest count behind it is not stated.",
      });
      zolaScaled = {
        value: null,
        low: scaleFromAnchor(row.zolaLow, guests, knotGuests, costs),
        high: scaleFromAnchor(row.zolaHigh, guests, knotGuests, costs),
      };
      lines.push("Zola's state range is adjusted with the same guest-count curve and shown separately. Zola does not say which guest count the state range uses, so that adjustment is rough.");
    } else {
      lines.push("Zola does not publish a range for this state. Nothing was filled in.");
    }
    lines.unshift("Planning estimate: The Knot's state average, adjusted for your guest count. This place is outside a city The Knot or Zola publish.");
    return pointResult({
      tier: "B",
      value,
      exact: guests === knotGuests,
      knotScaled: value,
      zolaScaled,
      lines,
      references,
      basis: "knot",
    });
  }

  if (place.tier === "C") {
    const row = stateRow(costs, place.stateAbbr);
    const ratio = place.rpp.metro / place.rpp.state;
    const knotScaled = scaleFromAnchor(row.knot, guests, knotGuests, costs) * ratio;
    const hasZola = row.zolaLow != null && row.zolaHigh != null;
    const zolaLow = hasZola ? scaleFromAnchor(row.zolaLow, guests, knotGuests, costs) * ratio : null;
    const zolaHigh = hasZola ? scaleFromAnchor(row.zolaHigh, guests, knotGuests, costs) * ratio : null;
    references.push({
      study: "The Knot",
      label: `${place.stateName} average, before the price-level adjustment`,
      value: row.knot,
      exact: true,
      note: "State figure. This metro does not have its own wedding survey.",
    });
    if (hasZola) {
      references.push({
        study: "Zola",
        label: `${place.stateName} range, before the price-level adjustment`,
        low: row.zolaLow,
        high: row.zolaHigh,
        exact: true,
        note: "State range, shown separately.",
      });
    }
    lines.push("Estimated. Derived from state wedding data and federal price levels, not a wedding survey of this metro.");
    lines.push(`Price level: this metro is ${place.rpp.metro.toFixed(1)} and ${place.stateName} is ${place.rpp.state.toFixed(1)} (BEA, US = 100). State figures are multiplied by ${ratio.toFixed(3)}.`);
    lines.push("The Knot and Zola are scaled separately. The range covers both results. It is not an average of the two studies.");
    if (!hasZola) {
      lines.push("Zola has no state range here, so the estimate is a single derived figure rather than a band.");
      return pointResult({
        tier: "C",
        value: knotScaled,
        exact: false,
        knotScaled,
        zolaScaled: null,
        lines,
        references,
        basis: "derived",
        estimated: true,
      });
    }
    const low = Math.min(knotScaled, zolaLow);
    const high = Math.max(knotScaled, zolaHigh);
    return {
      kind: "range",
      tier: "C",
      value: null,
      low,
      high,
      exact: false,
      knotScaled,
      zolaScaled: { value: null, low: zolaLow, high: zolaHigh },
      lines,
      references,
      basis: "derived",
      estimated: true,
      extrapolated: false,
    };
  }

  throw new Error(`Cannot plan for tier ${place.tier}`);
}

function publishedKnot(value, label) {
  return {
    study: "The Knot",
    label,
    value,
    exact: true,
    note: "Published average. Not adjusted for your guest count.",
  };
}

function pushSubReferences(place, references) {
  for (const sub of place.subReferences || []) {
    references.push({
      study: "Zola",
      label: sub.label,
      value: sub.value,
      exact: true,
      note: "Published for 150 guests.",
    });
  }
}

function pointResult(fields) {
  return {
    kind: "point",
    low: null,
    high: null,
    estimated: false,
    extrapolated: false,
    zolaScaled: null,
    ...fields,
  };
}

export function categorySplit(plan, costs, { total = null, priorities = [] } = {}) {
  const guests = plan.guests;
  const target = total == null ? plan.planningTotal : Number(total);
  const cats = modelCategories(costs);
  const boost = new Set(priorities);
  const weights = cats.map((cat) => {
    const helped = costs.priorities.some((pri) => boost.has(pri.id) && pri.helps.includes(cat.id));
    const boosts = costs.priorities.filter((pri) => boost.has(pri.id) && pri.helps.includes(cat.id)).length;
    const weight = modelAmount(cat, guests) * (helped ? costs.priorityBoost ** boosts : 1);
    return { cat, weight };
  });
  const amounts = allocate(target, weights.map((item) => item.weight));
  const lines = weights.map((item, index) => ({
    id: item.cat.id,
    label: item.cat.label,
    plain: item.cat.plain,
    note: item.cat.note || "",
    amount: amounts[index],
    basis: item.cat.basis,
    source: item.cat.source,
  })).sort((a, b) => b.amount - a.amount);
  return {
    total: amounts.reduce((sum, n) => sum + n, 0),
    lines,
    usedMidpoint: plan.usingMidpoint && total == null,
    priorityIds: [...boost],
  };
}

export function allocate(total, weights) {
  const target = Math.round(total);
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!sum || !Number.isFinite(target)) return weights.map(() => 0);
  const raw = weights.map((w) => (target * w) / sum);
  const rounded = raw.map((n) => Math.round(n));
  let drift = target - rounded.reduce((s, n) => s + n, 0);
  const order = raw.map((n, i) => i).sort((a, b) => raw[b] - raw[a]);
  let guard = 0;
  while (drift !== 0 && guard < 100000) {
    const idx = order[guard % order.length];
    const step = drift > 0 ? 1 : -1;
    if (rounded[idx] + step >= 0) {
      rounded[idx] += step;
      drift -= step;
    }
    guard += 1;
  }
  return rounded;
}

export function guestMath(place, guests, costs, options = {}) {
  const g = clampGuests(guests);
  const current = planFor(place, g, costs, options);
  const smaller = g > MIN_GUESTS ? planFor(place, g - 1, costs, options) : null;
  const cutBy = Math.min(10, g - MIN_GUESTS);
  const cut = cutBy > 0 ? planFor(place, g - cutBy, costs, options) : null;
  const totalOf = (plan) => (plan.kind === "range" ? { low: plan.low, high: plan.high } : { value: plan.value });
  const perGuest = current.kind === "range"
    ? { low: current.low / g, high: current.high / g }
    : { value: current.value / g };
  let marginal = null;
  if (smaller) {
    marginal = current.kind === "range"
      ? { low: (current.low - smaller.low), high: (current.high - smaller.high) }
      : { value: current.value - smaller.value };
  }
  let cutSave = null;
  if (cut) {
    cutSave = current.kind === "range"
      ? { guests: cutBy, low: current.low - cut.low, high: current.high - cut.high }
      : { guests: cutBy, value: current.value - cut.value };
  }
  const anchor = current.basis === "zola" ? costs.national.zolaCityGuests.value : costs.national.knotGuests.value;
  const anchorTotal = current.basis === "zola" && place.zola150
    ? place.zola150
    : current.basis === "knot"
      ? (place.knot || (place.tier === "N" ? costs.national.knotAverage.value : place.stateKnot))
      : null;
  return {
    plan: current,
    total: totalOf(current),
    perGuest,
    marginal,
    cutSave,
    fixedShare: anchorTotal
      ? (anchorTotal * modelFixed(costs)) / modelTotal(costs, anchor)
      : null,
    curveSavings: current.basis === "zola-curve",
  };
}

export function guestsForBudget(place, budget, costs, options = {}) {
  const money = Number(budget);
  if (!Number.isFinite(money) || money <= 0) return null;
  const fits = (plan) => {
    if (plan.kind === "range") return money >= plan.low;
    return money >= plan.value;
  };
  const coversHigh = (plan) => {
    if (plan.kind === "range") return money >= plan.high;
    return money >= plan.value;
  };
  let lo = MIN_GUESTS;
  let hi = MAX_GUESTS;
  let best = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const plan = planFor(place, mid, costs, options);
    if (fits(plan)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  let comfortable = null;
  lo = MIN_GUESTS;
  hi = MAX_GUESTS;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const plan = planFor(place, mid, costs, options);
    if (coversHigh(plan)) {
      comfortable = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return {
    stretchGuests: best,
    comfortableGuests: comfortable,
    budget: money,
  };
}

export function compareBudget(plan, budget) {
  const money = Number(budget);
  if (!plan || !Number.isFinite(money) || money <= 0) return null;
  const target = plan.kind === "range" ? plan.high : plan.value;
  const low = plan.kind === "range" ? plan.low : plan.value;
  if (!Number.isFinite(target) || target <= 0) return null;
  const short = Math.round(target - money);
  const pct = Math.round((Math.abs(short) / target) * 100);
  const tightFloor = plan.kind === "range" ? low * 0.9 : target * 0.9;
  let word = "Over";
  let tone = "over";
  if (money >= target) {
    word = "Fits";
    tone = "fits";
  } else if (money >= tightFloor) {
    word = "Tight";
    tone = "tight";
  }
  const budgetText = formatMoney(money, { exact: true });
  const targetText = formatMoney(Math.round(target), { exact: true });
  const text = word === "Fits"
    ? `Fits — ${formatMoney(Math.round(money - target), { exact: true })} under ${budgetText}.`
    : `${word} — ${formatMoney(short, { exact: true })} short of the ${targetText} figure (${pct}%).`;
  return { tone, word, gap: short, pct, text, target, budget: money };
}

export function venueBenchmarks(place, guests, costs) {
  const g = clampGuests(guests);
  const knotVenue = costs.categories.find((cat) => cat.id === "venue").amount;
  const zolaVenue = costs.zolaCategories.find((cat) => cat.id === "venue").amount;
  const knotNational = costs.national.knotAverage.value;
  const zolaNational = costs.national.zolaAverage.value;
  const out = [];
  if (place.knot || place.tier === "N" || place.tier === "B" || place.tier === "C") {
    let localKnot = costs.national.knotAverage.value;
    if (place.tier === "B" || place.tier === "C") localKnot = place.stateKnot;
    if (place.knot) localKnot = place.knot;
    let scaled = scaleFromAnchor(localKnot, g, costs.national.knotGuests.value, costs);
    if (place.tier === "C") scaled *= place.rpp.metro / place.rpp.state;
    out.push({
      study: "The Knot",
      value: knotVenue * (scaled / knotNational),
      note: place.tier === "C"
        ? "National venue average scaled by this estimated total. Not a local venue survey."
        : "National venue average scaled by the local total. Not a local venue survey.",
      estimated: true,
    });
  }
  if (place.zola150 || place.curve || place.tier === "N") {
    if (place.curve && g === 150 && place.zolaVenue150) {
      out.push({
        study: "Zola",
        value: place.zolaVenue150,
        exact: true,
        note: "Zola's published Chicago venue figure for 150 guests.",
        estimated: false,
      });
    } else if (place.zola150 || place.curve) {
      const anchor = place.zola150 || place.curve.find((pt) => pt.guests === 150).value;
      const scaled = scaleFromAnchor(anchor, g, costs.national.zolaCityGuests.value, costs);
      out.push({
        study: "Zola",
        value: zolaVenue * (scaled / zolaNational),
        note: "National venue average scaled by the local Zola-based total. Not averaged with The Knot.",
        estimated: true,
      });
    } else {
      out.push({
        study: "Zola",
        value: zolaVenue,
        exact: true,
        note: "Zola's national venue average.",
        estimated: false,
      });
    }
  }
  return out;
}

export function offPeakRange(total) {
  return { low: total * 0.7, high: total * 0.8 };
}

export function hiddenCostBreakdown({ quote, servicePct, taxPct, gratuityPct, taxOnService = false }) {
  const base = Number(quote);
  if (!Number.isFinite(base) || base < 0) return null;
  const service = Number(servicePct);
  const tax = Number(taxPct);
  const tip = Number(gratuityPct);
  const serviceAmount = Number.isFinite(service) ? base * (service / 100) : 0;
  const taxable = base + (taxOnService ? serviceAmount : 0);
  const taxAmount = Number.isFinite(tax) ? taxable * (tax / 100) : 0;
  const tipAmount = Number.isFinite(tip) ? base * (tip / 100) : 0;
  return {
    base,
    serviceAmount,
    taxAmount,
    tipAmount,
    taxOnService: Boolean(taxOnService),
    total: base + serviceAmount + taxAmount + tipAmount,
  };
}
