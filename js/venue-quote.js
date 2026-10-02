/** Turn a venue record into a number a couple can compare. Never invents a price. */

export function quoteVenue(venue, guests = 100, day = "sat") {
  const count = clampGuests(guests);
  const price = venue.price || {};
  const base = {
    guests: count,
    day,
    confidence: price.confidence || "unpublished",
    sourceUrl: price.sourceUrl || venue.website || "",
    verifiedOn: price.verifiedOn || "",
    note: price.note || "",
  };

  if (price.kind === "unpublished" || price.confidence === "unpublished") {
    return { ...base, status: "unpublished", total: null, label: "Pricing not published" };
  }

  if (price.kind === "range") {
    return {
      ...base,
      status: "range",
      total: null,
      low: price.low,
      high: price.high,
      label: "Published Saturday range",
    };
  }

  if (price.kind === "minimum") {
    return {
      ...base,
      status: "priced",
      total: price.floor,
      rental: price.floor,
      extra: 0,
      food: 0,
      tax: 0,
      includesFood: false,
      label: "Published event minimum",
    };
  }

  const rate = day === "sat" ? price.saturday : price.offday;
  if (rate == null) {
    return {
      ...base,
      status: "ask-day",
      total: null,
      label: day === "sat" ? "Saturday price not published" : "Off-day price not published",
    };
  }

  const included = price.includedGuests || 0;
  const extraGuests = price.extraGuest ? Math.max(0, count - included) : 0;
  const extra = extraGuests * (price.extraGuest || 0);
  const food = price.foodPerGuest ? Math.round(price.foodPerGuest * count) : 0;
  const before = rate + extra + food;
  const tax = price.taxPct ? Math.round(before * (price.taxPct / 100)) : 0;
  const includesFood = Boolean(price.includesFood || price.foodPerGuest);
  return {
    ...base,
    status: "priced",
    total: before + tax,
    rental: rate,
    extra,
    extraGuests,
    food,
    tax,
    includesFood,
    label: includesFood ? "From the published package" : "Published venue rental",
  };
}

export function clampGuests(guests) {
  const n = Math.round(Number(guests) || 100);
  return Math.min(400, Math.max(10, n));
}

export function fitsCapacity(venue, guests) {
  if (!venue.capacity) return true;
  return clampGuests(guests) <= venue.capacity;
}
