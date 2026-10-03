/**
 * All-in venue total at a guest count, day, and season.
 * Published site fees stay as published. Food, service, and tax are estimated
 * only when a cited study or an official rate fills the gap. Missing amounts
 * stay null and are never treated as zero.
 */

import { categorySplit, planFor } from "./estimate.js";
import { quoteVenue, clampGuests } from "./venue-quote.js";
import { FRESHNESS_MONTHS, chipText } from "./price-schema.js";

export { chipText, FRESHNESS_MONTHS };

export function isStale(isoDate, asOf = "2026-10-03", months = FRESHNESS_MONTHS) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return true;
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  const seen = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(asOfDate.getTime()) || Number.isNaN(seen.getTime())) return true;
  const cutoff = new Date(asOfDate);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return seen < cutoff;
}

export function jurisdictionFor(venue, taxTable) {
  if (!taxTable || !venue) return null;
  const city = String(venue.city || "").toLowerCase();
  const rows = taxTable.assignments || [];
  const cityHit = rows.find((row) => row.metro === venue.metro && String(row.city || "").toLowerCase() === city);
  const metroHit = rows.find((row) => row.metro === venue.metro && row.city === "*");
  const id = (cityHit || metroHit || {}).jurisdiction;
  return id ? taxTable.jurisdictions[id] || null : null;
}

function money(n) {
  return Number.isFinite(n) ? Math.round(n) : null;
}

function line({
  id, type, label, low, high, chip, note, sourceUrl, verifiedOn, quote, asOf, inTotal = true, required = true,
}) {
  const amountLow = money(low);
  const amountHigh = money(high);
  return {
    id,
    type,
    label,
    low: amountLow,
    high: amountHigh == null ? amountLow : amountHigh,
    chip,
    chipText: chipText(chip),
    note: note || "",
    sourceUrl: sourceUrl || "",
    verifiedOn: verifiedOn || "",
    quote: quote || "",
    stale: Boolean(verifiedOn) && isStale(verifiedOn, asOf),
    inTotal,
    required,
    missing: amountLow == null,
  };
}

function studyFood(place, guests, costs) {
  if (!place || !costs) return null;
  const plan = planFor(place, guests, costs);
  const split = categorySplit(plan, costs);
  const food = split.lines.find((row) => row.id === "catering");
  const drinks = split.lines.find((row) => row.id === "alcohol");
  if (!food) return null;
  return {
    food: food.amount,
    drinks: drinks ? drinks.amount : 0,
    knotUrl: costs.sources["knot-study"].url,
    knotDate: costs.sources["knot-study"].date,
  };
}

function feeFor(venue, fees) {
  if (!fees) return null;
  const table = fees.venues || fees;
  return table[venue.id] || null;
}

function siteFromQuote(quote, venue, asOf) {
  const price = venue.price || {};
  const chip = price.sourceKind === "public_fee_schedule" ? "public_fee_schedule" : "published";
  if (quote.status === "range") {
    return line({
      id: "site_fee",
      type: "site_fee",
      label: quote.day === "off" ? "Site fee, off day" : "Site fee",
      low: quote.low,
      high: quote.high,
      chip,
      note: price.note || "",
      sourceUrl: quote.sourceUrl,
      verifiedOn: quote.verifiedOn,
      quote: price.note || "",
      asOf,
    });
  }
  if (quote.status === "priced") {
    const amount = (quote.rental || 0) + (quote.extra || 0);
    return line({
      id: "site_fee",
      type: "site_fee",
      label: quote.label || "Site fee",
      low: amount,
      high: amount,
      chip,
      note: price.note || "",
      sourceUrl: quote.sourceUrl,
      verifiedOn: quote.verifiedOn,
      quote: price.note || "",
      asOf,
    });
  }
  return line({
    id: "site_fee",
    type: "site_fee",
    label: "Site fee",
    low: null,
    high: null,
    chip: "published",
    note: quote.label || "Pricing not published",
    sourceUrl: quote.sourceUrl,
    verifiedOn: quote.verifiedOn,
    asOf,
  });
}

function seasonalSite(fee, day, season, asOf) {
  const table = fee.siteBySeason;
  if (!table) return null;
  const row = table[season] || table.peak;
  if (!row) return null;
  const amount = day === "off" ? row.offday : row.saturday;
  if (amount == null) return null;
  return line({
    id: "site_fee",
    type: "site_fee",
    label: day === "off" ? "Site fee, off day" : "Site fee",
    low: amount,
    high: amount,
    chip: row.chip || "published",
    note: row.note || "",
    sourceUrl: row.sourceUrl,
    verifiedOn: row.verifiedOn,
    quote: row.quote || "",
    asOf,
  });
}

function addSpan(sum, row) {
  if (!row || !row.inTotal || row.low == null) return sum;
  return { low: sum.low + row.low, high: sum.high + (row.high == null ? row.low : row.high) };
}

export function allIn(venue, options = {}) {
  const guests = clampGuests(options.guests ?? 100);
  const day = options.day === "off" ? "off" : "sat";
  const season = options.season === "off" ? "off" : "peak";
  const asOf = options.asOf || "2026-10-03";
  const costs = options.costs || null;
  const place = options.place || null;
  const fee = feeFor(venue, options.fees);
  const taxJurisdiction = jurisdictionFor(venue, options.taxTable);
  const quote = quoteVenue(venue, guests, day);
  const lines = [];
  const missing = [];
  const review = [];

  const site = (season === "peak" || season === "off") && fee ? seasonalSite(fee, day, season, asOf) : null;
  if (fee && fee.siteFeeMode === "none") {
    lines.push(line({
      id: "site_fee",
      type: "site_fee",
      label: "Site fee",
      low: null,
      high: null,
      chip: "published",
      note: fee.siteFeeNote || "No separate site fee on the price list. The food minimum or the per-person package is the published charge.",
      sourceUrl: (venue.price || {}).sourceUrl,
      verifiedOn: (venue.price || {}).verifiedOn,
      quote: fee.siteFeeNote || "",
      asOf,
      inTotal: false,
      required: false,
    }));
  } else if (site) {
    lines.push(site);
  } else if (quote.status === "priced" || quote.status === "range") {
    lines.push(siteFromQuote({ ...quote, day }, venue, asOf));
  } else {
    const blank = siteFromQuote({ ...quote, day }, venue, asOf);
    lines.push(blank);
    missing.push("site fee");
  }

  const publishedFood = publishedFoodLine(venue, quote, fee, guests, day, season, asOf);
  const bundledFood = !publishedFood && (venue.price || {}).includesFood && !fee?.perPerson && !fee?.fnbMinimum && (quote.status === "priced" || quote.status === "range");
  let food = publishedFood;
  if (bundledFood) {
    food = line({
      id: "food",
      type: "per_person",
      label: "Food and drinks",
      low: null,
      high: null,
      chip: "published",
      note: "Included in the published package above. The price list does not split out a separate food figure, so no second food line is added.",
      sourceUrl: (venue.price || {}).sourceUrl,
      verifiedOn: (venue.price || {}).verifiedOn,
      quote: (venue.price || {}).note || "",
      asOf,
      inTotal: false,
      required: false,
    });
  } else if (!food) {
    const study = studyFood(place, guests, costs);
    if (study) {
      food = line({
        id: "food",
        type: "per_person",
        label: "Food and drinks",
        low: study.food,
        high: study.food + study.drinks,
        chip: "estimated",
        note: "Estimated study range. The low figure is The Knot's food line for this place. The high figure adds The Knot's drinks line. It is not a quote from this venue or from a caterer.",
        sourceUrl: study.knotUrl,
        verifiedOn: study.knotDate,
        quote: `The Knot catering average is $80 per guest nationally, scaled with the rest of this place's planning total. Drinks are a separate Knot line.`,
        asOf,
      });
    } else {
      food = line({
        id: "food",
        type: "per_person",
        label: "Food and drinks",
        low: null,
        high: null,
        chip: "estimated",
        note: "No published catering price and no study line for this place.",
        asOf,
      });
      missing.push("food");
    }
  }
  lines.push(food);
  if (food.missing) missing.push("food");

  const service = serviceLine(venue, fee, food, costs, asOf);
  lines.push(service);
  if (service.missing) missing.push("service charge");

  const siteLine = lines.find((row) => row.id === "site_fee");
  for (const extra of addOnLines(fee, food, siteLine, day, season, guests, asOf)) {
    lines.push(extra);
    if (extra.required && extra.missing) missing.push(extra.label);
  }

  const tax = taxLine({ venue, fee, food, service, lines, taxJurisdiction, asOf });
  lines.push(tax);
  if (tax.missing) missing.push("tax");
  if (tax.review) review.push(tax.review);

  if (fee && fee.review) review.push(fee.review);

  const total = lines.filter((row) => row.inTotal && row.low != null).reduce(addSpan, { low: 0, high: 0 });
  const required = lines.filter((row) => row.required);
  const chips = required.map((row) => row.chip).filter(Boolean);
  const weakest = chips.includes("estimated")
    ? "estimated"
    : chips.includes("public_fee_schedule")
      ? "public_fee_schedule"
      : chips.includes("published")
        ? "published"
        : null;
  const ready = missing.length === 0 && required.every((row) => row.low != null) && weakest && weakest !== "venue_verified";
  const siteChip = (lines.find((row) => row.id === "site_fee") || {}).chip;
  const venueFeeKnown = siteChip === "published" || siteChip === "public_fee_schedule" || (fee && fee.siteFeeMode === "none" && food.chip === "published");

  return {
    guests,
    day,
    season,
    status: ready && venueFeeKnown ? "all-in" : quote.status === "unpublished" || quote.status === "ask-day" ? quote.status : "partial",
    allInReady: Boolean(ready && venueFeeKnown),
    low: ready && venueFeeKnown ? total.low : null,
    high: ready && venueFeeKnown ? total.high : null,
    partialLow: total.low,
    partialHigh: total.high,
    chip: ready && venueFeeKnown ? weakest : null,
    chipText: ready && venueFeeKnown ? chipText(weakest) : null,
    lines,
    missing,
    review,
    stale: lines.some((row) => row.stale),
    quote,
  };
}

function publishedFoodLine(venue, quote, fee, guests, day, season, asOf) {
  const price = venue.price || {};
  if (fee && fee.perPerson) {
    const row = fee.perPerson;
    return line({
      id: "food",
      type: "per_person",
      label: row.label || "Food and drinks, per person",
      low: row.low * guests,
      high: (row.high == null ? row.low : row.high) * guests,
      chip: row.chip || "published",
      note: row.note || "",
      sourceUrl: row.sourceUrl || price.sourceUrl,
      verifiedOn: row.verifiedOn || price.verifiedOn,
      quote: row.quote || "",
      asOf,
    });
  }
  if (fee && fee.fnbMinimum) {
    const min = fee.fnbMinimum;
    const picked = day === "off" ? (min.off || min.saturday) : (season === "off" && min.offSeason ? min.offSeason : min.saturday);
    if (!picked) return null;
    let low = picked.low != null ? picked.low : picked.amount;
    let high = picked.high != null ? picked.high : low;
    if (min.perPerson) {
      const per = Math.round(min.perPerson * guests);
      low = Math.max(low, per);
      high = Math.max(high, per);
    }
    return line({
      id: "food",
      type: "fnb_minimum",
      label: "Food and drink minimum",
      low,
      high,
      chip: "published",
      note: min.note || "",
      sourceUrl: min.sourceUrl || price.sourceUrl,
      verifiedOn: min.verifiedOn || price.verifiedOn,
      quote: min.quote || "",
      asOf,
    });
  }
  if (quote.food) {
    return line({
      id: "food",
      type: "per_person",
      label: "Food in the published package",
      low: quote.food,
      high: quote.food,
      chip: "published",
      note: price.note || "",
      sourceUrl: price.sourceUrl,
      verifiedOn: price.verifiedOn,
      quote: price.note || "",
      asOf,
    });
  }
  if (price.includesFood && price.kind === "range" && /per person|per guest/i.test(price.note || "") && price.low != null) {
    return line({
      id: "food",
      type: "per_person",
      label: "Published per-person package",
      low: price.low * guests,
      high: (price.high == null ? price.low : price.high) * guests,
      chip: "published",
      note: price.note || "",
      sourceUrl: price.sourceUrl,
      verifiedOn: price.verifiedOn,
      quote: price.note || "",
      asOf,
    });
  }
  return null;
}

function serviceLine(venue, fee, food, costs, asOf) {
  const price = venue.price || {};
  if (fee && fee.serviceCharge && food.low != null) {
    const svc = fee.serviceCharge;
    const lowPct = svc.lowPct != null ? svc.lowPct : svc.pct;
    const highPct = svc.highPct != null ? svc.highPct : lowPct;
    return line({
      id: "service",
      type: "service_charge",
      label: svc.label || `Service charge ${lowPct}${highPct !== lowPct ? `–${highPct}` : ""}%`,
      low: food.low * lowPct / 100,
      high: food.high * highPct / 100,
      chip: "published",
      note: svc.note || "Published by the venue. A service charge is not a tip.",
      sourceUrl: svc.sourceUrl || price.sourceUrl,
      verifiedOn: svc.verifiedOn || price.verifiedOn,
      quote: svc.quote || "",
      asOf,
    });
  }
  const hidden = costs && costs.hidden;
  if (hidden && food.low != null) {
    const lowPct = hidden.serviceChargeLowPct.value;
    const highPct = hidden.serviceChargeHighPct.value;
    return line({
      id: "service",
      type: "service_charge",
      label: `Service charge ${lowPct}–${highPct}%`,
      low: food.low * lowPct / 100,
      high: food.high * highPct / 100,
      chip: "estimated",
      note: "Estimated. Zola's common range for a service charge, applied to the food line. This venue has not published its own percent. A service charge is not a tip.",
      sourceUrl: costs.sources["zola-index"].url,
      verifiedOn: costs.sources["zola-index"].date,
      quote: `Zola cites a service charge of ${lowPct}–${highPct}%.`,
      asOf,
    });
  }
  return line({
    id: "service",
    type: "service_charge",
    label: "Service charge",
    low: null,
    high: null,
    chip: "estimated",
    note: "No published service-charge percent.",
    asOf,
  });
}

function addOnLines(fee, food, siteLine, day, season, guests, asOf) {
  if (!fee || !Array.isArray(fee.addOns)) return [];
  return fee.addOns.filter((item) => !item.when || item.when === day || item.when === season || item.when === "all").map((item) => {
    let low = item.amount;
    let high = item.amountHigh == null ? item.amount : item.amountHigh;
    if (item.perGuest) {
      low = item.amount * guests;
      high = (item.amountHigh == null ? item.amount : item.amountHigh) * guests;
    }
    if (item.pct != null) {
      const base = item.pctOf === "site" ? siteLine : food;
      if (base && base.low != null) {
        const highPct = item.pctHigh == null ? item.pct : item.pctHigh;
        low = base.low * item.pct / 100;
        high = base.high * highPct / 100;
      }
    }
    if (item.seasonAmounts && item.seasonAmounts[season] != null) {
      low = item.seasonAmounts[season];
      high = low;
    }
    return line({
      id: item.id || item.type || "addon",
      type: item.type || "admin_fee",
      label: item.label,
      low: item.inTotal === false ? null : low,
      high: item.inTotal === false ? null : high,
      chip: item.chip || "published",
      note: item.note || "",
      sourceUrl: item.sourceUrl,
      verifiedOn: item.verifiedOn,
      quote: item.quote || "",
      asOf,
      inTotal: item.inTotal !== false && item.countsInTotal !== false,
      required: Boolean(item.required),
    });
  });
}

function taxLine({ venue, fee, food, service, lines, taxJurisdiction, asOf }) {
  const price = venue.price || {};
  const site = lines.find((row) => row.id === "site_fee" && row.inTotal);
  if (fee && fee.tax && fee.tax.ratePct != null && food.low != null) {
    const rate = fee.tax.ratePct;
    const onService = Boolean(fee.tax.onService);
    const onSite = Boolean(fee.tax.onSite);
    let baseLow = food.low + (onService && service.low != null ? service.low : 0) + (onSite && site && site.low != null ? site.low : 0);
    let baseHigh = food.high + (onService && service.high != null ? service.high : 0) + (onSite && site && site.high != null ? site.high : 0);
    for (const id of fee.tax.onAddOnIds || []) {
      const extra = lines.find((row) => row.id === id && row.low != null);
      if (!extra) continue;
      baseLow += extra.low;
      baseHigh += extra.high;
    }
    return line({
      id: "tax",
      type: "tax",
      label: `Tax ${rate}%`,
      low: baseLow * rate / 100,
      high: baseHigh * rate / 100,
      chip: "published",
      note: fee.tax.note || "The percent is printed on the venue's price list.",
      sourceUrl: fee.tax.sourceUrl || price.sourceUrl,
      verifiedOn: fee.tax.verifiedOn || price.verifiedOn,
      quote: fee.tax.quote || "",
      asOf,
      review: fee.tax.review || "",
    });
  }
  if (price.taxPct != null && site && site.low != null) {
    const venueRate = price.taxPct;
    const foodRate = taxJurisdiction && taxJurisdiction.ratePct != null ? taxJurisdiction.ratePct : venueRate;
    const foodLow = food.low || 0;
    const foodHigh = food.high || 0;
    const same = foodRate === venueRate;
    return line({
      id: "tax",
      type: "tax",
      label: same ? `Tax ${venueRate}%` : `Tax ${venueRate}% on the site fee, ${foodRate}% on food`,
      low: site.low * venueRate / 100 + foodLow * foodRate / 100,
      high: site.high * venueRate / 100 + foodHigh * foodRate / 100,
      chip: food.chip === "published" && same ? "published" : "estimated",
      note: same
        ? "The venue's price list states this percent. It is applied to the site fee and to the food line."
        : `The venue prints ${venueRate}% on its fee. Food uses the official local rate of ${foodRate}%, because the venue percent is only described for the rental.`,
      sourceUrl: price.sourceUrl,
      verifiedOn: price.verifiedOn,
      quote: price.note || "",
      asOf,
      review: same ? "" : "Venue tax percent and the official local rate differ. Confirm which one the caterer charges.",
    });
  }
  if (taxJurisdiction && taxJurisdiction.ratePct != null && food.low != null) {
    const rate = taxJurisdiction.ratePct;
    const onService = taxJurisdiction.serviceChargeTaxable === true && service.low != null;
    const baseLow = food.low + (onService ? service.low : 0);
    const baseHigh = food.high + (onService ? service.high : 0);
    return line({
      id: "tax",
      type: "tax",
      label: rate === 0 ? "Sales tax" : `Sales tax ${rate}%`,
      low: baseLow * rate / 100,
      high: baseHigh * rate / 100,
      chip: "estimated",
      note: taxJurisdiction.note,
      sourceUrl: taxJurisdiction.sourceUrl,
      verifiedOn: taxJurisdiction.verifiedOn,
      quote: taxJurisdiction.quote,
      asOf,
      review: taxJurisdiction.review || "",
    });
  }
  return line({
    id: "tax",
    type: "tax",
    label: "Tax",
    low: null,
    high: null,
    chip: "estimated",
    note: "No sales-tax percent on the venue's price list, and no official local rate is on file for this city. Tax is not assumed.",
    asOf,
  });
}

export function coverageReport(venues, options) {
  const before = { ready: 0, total: venues.length, byMetro: {} };
  const after = { ready: 0, total: venues.length, byMetro: {} };
  for (const venue of venues) {
    const metro = venue.metro;
    before.byMetro[metro] ??= { ready: 0, total: 0, name: options.metroName ? options.metroName(metro) : metro };
    after.byMetro[metro] ??= { ready: 0, total: 0, name: before.byMetro[metro].name };
    before.byMetro[metro].total += 1;
    after.byMetro[metro].total += 1;
    if (legacyAllIn(venue)) {
      before.ready += 1;
      before.byMetro[metro].ready += 1;
    }
    const place = options.placeFor ? options.placeFor(venue) : null;
    const result = allIn(venue, { ...options, place, guests: options.guests || 100, day: "sat", season: "peak" });
    if (result.allInReady) {
      after.ready += 1;
      after.byMetro[metro].ready += 1;
    }
  }
  return { before, after };
}

function legacyAllIn(venue) {
  const price = venue.price || {};
  if (price.confidence === "unpublished" || price.kind === "unpublished") return false;
  const food = Boolean(price.includesFood || price.foodPerGuest);
  const tax = price.taxPct != null;
  const service = /service charge|service fee/i.test(`${price.note || ""} ${(venue.questions || []).join(" ")}`);
  return food && tax && service;
}
