/**
 * Vendor calculators and the home "build my wedding" total.
 * Dollar defaults come from categorySplit (Knot lines, localized) or from
 * published extras in costs.json. Sub-lines with no source stay null until typed.
 */

import { categorySplit, hiddenCostBreakdown, planFor } from "./estimate.js";
import { exampleForField } from "./published-examples.js";
import { quoteVerdict } from "./saving.js";

export const VENDOR_CATEGORIES = [
  { id: "catering", label: "Catering", plural: "Caterers" },
  { id: "music", label: "Music", plural: "DJs and bands" },
  { id: "photo", label: "Photo", plural: "Photographers" },
  { id: "florist", label: "Flowers", plural: "Florists" },
  { id: "bakery", label: "Cake", plural: "Bakers" },
  { id: "beauty", label: "Hair and makeup", plural: "Hair and makeup artists" },
];

const ZOLA_ASIDE = {
  catering: "catering",
  alcohol: "bar",
  photography: "photography",
  videography: "videography",
  flowers: "flowers",
  dj: "music",
  dress: "dress",
  cake: "cake",
  officiant: "officiant",
  invitations: "invitations",
};

export const COST_CALCS = [
  {
    slug: "catering",
    nav: "Food and bar",
    title: "Catering and bar calculator",
    h1: "Food and bar cost",
    kicker: "Catering",
    description: "Food and drinks from The Knot's category lines, localized to your place. Meal style and bar package do not change the dollars until you type a quote.",
    vendorCategory: "catering",
    studyIds: ["catering", "alcohol"],
    ask: [
      "Is the price per person, and does it include staff, rentals, and cake cutting?",
      "Which bar package is this: open, beer and wine, cash, or dry?",
      "What service charge, tax, and gratuity are added, and is tax charged on the service fee?",
      "What is the cake-cutting fee, and is it per slice?",
      "How many hours, and what does overtime cost?",
      "Are tastings, kids' meals, and vendor meals included?",
    ],
    faqs: [
      { q: "Do plated, buffet, family style, stations, and food trucks have different prices here?", a: "No published study in our sources separates those styles. The first number is The Knot's food line for your place and guest count. Type a caterer's price if you have one." },
      { q: "Is the service charge included?", a: "Not until you type a percent. Zola cites 18–22% on many quotes. That range is a hint, not a default added to the total." },
    ],
  },
  {
    slug: "music",
    nav: "DJ, band, or playlist",
    title: "DJ, band, and playlist calculator",
    h1: "Music cost",
    kicker: "Music",
    description: "A DJ from The Knot's music line, or a band scaled from The Knot's national band and DJ averages. Ceremony, MC, and lighting stay blank until you type them.",
    vendorCategory: "music",
    studyIds: ["dj"],
    ask: [
      "How many hours are in the package, and what is overtime?",
      "Is a ceremony set or cocktail hour extra?",
      "Does the DJ or band MC, and is that in the price?",
      "Is dance lighting, uplighting, or a photo booth included?",
      "What is the playlist or planning meeting included?",
      "When is the deposit due, and what cancels it?",
    ],
    faqs: [
      { q: "Why is a band more than a DJ?", a: "The Knot's national live-band average is $4,500 and the reception-DJ average is $1,800. The band figure here is that ratio times your local music line. It is not a local band survey." },
      { q: "What does a playlist cost?", a: "There is no published playlist average in our sources. The music line drops out until you type a cost." },
    ],
  },
  {
    slug: "photo",
    nav: "Photo and video",
    title: "Photography and videography calculator",
    h1: "Photo and video cost",
    kicker: "Photo and video",
    description: "Photographer and videographer lines from The Knot, localized. Hours, a second shooter, an engagement session, and an album stay blank until you type them.",
    vendorCategory: "photo",
    studyIds: ["photography", "videography"],
    ask: [
      "How many hours, and how many photographers?",
      "Is a second shooter included?",
      "Is the engagement session a separate fee?",
      "What do prints or an album cost, and when do you deliver?",
      "Who owns the copyright, and can we share the files?",
      "What happens if you are sick on the wedding day?",
    ],
    faqs: [
      { q: "Are hours and a second shooter priced?", a: "Not from a study we can cite. Those fields start empty. The Knot lines are the average spend for a photographer and a videographer." },
    ],
  },
  {
    slug: "flowers",
    nav: "Flowers and decor",
    title: "Flowers and decor calculator",
    h1: "Flowers and decor cost",
    kicker: "Flowers",
    description: "The Knot's flowers line and lighting-and-decor line, localized. Bouquets, boutonnieres, centerpieces, an arch, and rentals stay blank until you type prices.",
    vendorCategory: "florist",
    studyIds: ["flowers", "lighting"],
    ask: [
      "Which stems are in season that month?",
      "Are centerpieces included, or rented vases extra?",
      "Who delivers, sets up, and strikes the flowers?",
      "What happens to the flowers after the reception?",
      "Is the ceremony arch a rental, and who installs it?",
      "When is the final count due?",
    ],
    faqs: [
      { q: "How are centerpieces counted?", a: "Type guests per table and a price per centerpiece. Table count is your guest count divided by that number, rounded up. Neither price is invented." },
    ],
  },
  {
    slug: "cake",
    nav: "Cake and desserts",
    title: "Cake and dessert calculator",
    h1: "Cake and dessert cost",
    kicker: "Cake",
    description: "The Knot's cake line, localized, plus the same dollars divided by your guest count. That per-slice figure is calculated, not a published bakery price.",
    vendorCategory: "bakery",
    studyIds: ["cake"],
    ask: [
      "Is the price for the cake only, or for a dessert table too?",
      "How many servings does this design feed?",
      "Are delivery, setup, and a cake stand included?",
      "What is the tasting fee, and does it apply to the order?",
      "Do you need a cake-cutting fee from the caterer on top of this?",
    ],
    faqs: [
      { q: "Is the per-slice number a bakery price?", a: "No. It is The Knot's cake line divided by your guest count. Type a bakery's per-slice price if you have one." },
    ],
  },
  {
    slug: "beauty",
    nav: "Hair and makeup",
    title: "Hair and makeup calculator",
    h1: "Hair and makeup cost",
    kicker: "Hair and makeup",
    description: "The Knot's hair and makeup averages are each for one person. A trial and travel stay blank until you type them.",
    vendorCategory: "beauty",
    studyIds: ["hair", "makeup"],
    ask: [
      "Is the trial included, and how long is it?",
      "What time do you start, and is travel extra?",
      "Are lashes, extensions, or airbrush extra?",
      "How many people can you take that morning?",
      "What if someone is late?",
    ],
    faqs: [
      { q: "Does this multiply by the whole wedding party?", a: "Only when you change the people count. It starts at one person because that is what The Knot published." },
    ],
  },
  {
    slug: "attire",
    nav: "Attire",
    title: "Wedding attire calculator",
    h1: "Attire cost",
    kicker: "Attire",
    description: "The Knot's wedding-dress average, localized. Groom's attire was not clear enough in that readout to include. Alterations and a tuxedo rental are Zola figures you can add on purpose.",
    vendorCategory: null,
    studyIds: ["dress"],
    ask: [
      "What alterations are likely, and who does them?",
      "When is the dress due, and what is the rush fee?",
      "Are shoes, veil, and accessories included?",
      "What does the tuxedo rental cover, and for how many nights?",
    ],
    faqs: [
      { q: "Why isn't a suit in the first number?", a: "The Knot's readout we use did not publish a groom's attire average clearly enough to include. Type one if you have it. Zola's tuxedo rental is shown beside the dress and stays out until you check it." },
    ],
  },
  {
    slug: "officiant",
    nav: "Officiant",
    title: "Officiant calculator",
    h1: "Officiant cost",
    kicker: "Officiant",
    description: "The Knot's officiant average, localized. Zola's national officiant average sits beside it and is not mixed in.",
    vendorCategory: null,
    studyIds: ["officiant"],
    ask: [
      "Does the fee include a rehearsal?",
      "How far will you travel, and is mileage extra?",
      "Are you authorized to sign the license here?",
      "Can we write our own ceremony?",
    ],
    faqs: [
      { q: "Which officiant number is the total?", a: "The Knot line is the total. Zola's national average is on the page for comparison and is not averaged with it." },
    ],
  },
  {
    slug: "rentals",
    nav: "Rentals",
    title: "Wedding rental calculator",
    h1: "Rental cost",
    kicker: "Rentals",
    description: "The Knot's rentals line, localized. Chair, table, linen, and tent prices stay blank until you type them.",
    vendorCategory: null,
    studyIds: ["rentals"],
    ask: [
      "Are delivery, setup, and pickup included?",
      "What is the damage waiver?",
      "When do rentals arrive and leave?",
      "Does the tent price include sidewalls, lighting, and flooring?",
    ],
    faqs: [
      { q: "Do you have a price per chair?", a: "No published per-chair price is in our sources. Type the rental company's price. If you itemize, that quote replaces the study line instead of stacking on top of it." },
    ],
  },
  {
    slug: "transportation",
    nav: "Transportation",
    title: "Wedding transportation calculator",
    h1: "Transportation cost",
    kicker: "Transportation",
    description: "The Knot's transportation line, localized. A vendor quote replaces that line when you type one.",
    vendorCategory: null,
    studyIds: ["transportation"],
    ask: [
      "How many hours, and what is overtime?",
      "How many vehicles, and how many seats?",
      "Is gratuity included?",
      "What is the holiday or Friday minimum?",
    ],
    faqs: [
      { q: "Is this a per-car price?", a: "No. The first number is The Knot's transportation average, scaled to your place. Type a quote to replace it." },
    ],
  },
  {
    slug: "stationery",
    nav: "Stationery",
    title: "Stationery and postage calculator",
    h1: "Stationery and postage",
    kicker: "Stationery",
    description: "The Knot's invitation line, localized. Postage stays blank until you type it.",
    vendorCategory: null,
    studyIds: ["invitations"],
    ask: [
      "How many pieces are in the suite?",
      "Are guest addressing and assembly included?",
      "When do you need final counts?",
      "Do you mail them, or do we?",
    ],
    faqs: [
      { q: "Is postage in The Knot's invitation average?", a: "We can't tell from the readout, so postage is not added unless you type it." },
    ],
  },
  {
    slug: "favors",
    nav: "Favors",
    title: "Wedding favor calculator",
    h1: "Favor cost",
    kicker: "Favors",
    description: "The Knot's favor line, localized, and that line divided by your guest count. A price you type replaces the study line.",
    vendorCategory: null,
    studyIds: ["favors"],
    ask: [
      "Is the price per guest or per couple?",
      "Are tags, bags, and assembly included?",
      "What is the minimum order?",
    ],
    faqs: [
      { q: "Is the per-guest favor a store price?", a: "No. It is The Knot's favor line divided by your guest count. Type a per-favor price to replace the study line." },
    ],
  },
];

export function calcBySlug(slug) {
  return COST_CALCS.find((calc) => calc.slug === slug) || null;
}

export function seasonFactor(costs, tier) {
  const knot = costs.national.knotAverage.value;
  const winter = costs.seasons.find((season) => season.id === "winter").value;
  const summer = costs.seasons.find((season) => season.id === "summer").value;
  if (tier === "budget") {
    return {
      id: "budget",
      label: "Budget",
      factor: winter / knot,
      note: `Study lines times The Knot's winter average ($${winter.toLocaleString("en-US")}) divided by the overall average ($${knot.toLocaleString("en-US")}). Not a local package price.`,
    };
  }
  if (tier === "splurge") {
    return {
      id: "splurge",
      label: "Splurge",
      factor: summer / knot,
      note: `Study lines times The Knot's summer average ($${summer.toLocaleString("en-US")}) divided by the overall average ($${knot.toLocaleString("en-US")}). Not a local package price.`,
    };
  }
  return {
    id: "typical",
    label: "Typical",
    factor: 1,
    note: "The study lines for this place and guest count.",
  };
}

export function parseTyped(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const n = Number(text.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function studyBundle(place, guests, costs) {
  const plan = planFor(place, guests, costs);
  const split = categorySplit(plan, costs);
  const map = Object.fromEntries(split.lines.map((line) => [line.id, line]));
  return { plan, split, map };
}

export function tableCount(guests, perTable) {
  const n = parseTyped(perTable);
  if (n == null || n <= 0) return null;
  return Math.ceil(Number(guests) / n);
}

export function cakeSliceRate(amount, guests) {
  const g = Number(guests);
  if (!Number.isFinite(amount) || !g) return null;
  return {
    rate: amount / g,
    note: "Calculated from The Knot's cake line divided by your guest count. Not a published per-slice price.",
  };
}

function zolaAside(id, costs) {
  const zolaId = ZOLA_ASIDE[id];
  if (!zolaId) return null;
  const row = costs.zolaCategories.find((cat) => cat.id === zolaId);
  if (!row) return null;
  return {
    label: `Zola national · ${row.label}`,
    amount: row.amount,
    low: row.low,
    high: row.high,
    note: "Shown beside the Knot line. Not averaged in.",
  };
}

function peopleCount(value) {
  if (value == null || String(value).trim() === "") return 1;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.round(n);
}

function scaledStudy(line, factor) {
  return {
    id: line.id,
    label: line.label,
    amount: Math.round(line.amount * factor),
    note: factor === 1 ? "Study line for this place." : "Study line times the season ratio.",
    source: "study",
  };
}

function quoteResult(calc, { rows, target, locks, aside = [], notes = [], fees = null, extra = {} }) {
  const total = Math.round(rows.filter((row) => row.inTotal !== false && row.amount != null).reduce((sum, row) => sum + row.amount, 0));
  return {
    slug: calc.slug,
    total,
    target: Math.round(target),
    rows,
    locks,
    lockParam: lockParam(locks),
    aside,
    notes,
    fees,
    ask: calc.ask,
    verdict: quoteVerdict(target, total),
    ...extra,
  };
}

export function lockParam(locks) {
  const parts = Object.entries(locks)
    .filter(([, amount]) => amount != null && Number.isFinite(Number(amount)))
    .map(([id, amount]) => `${id}:${Math.round(Number(amount))}`);
  return parts.join(",");
}

export function budgetLockHref(place, guests, locks) {
  const params = new URLSearchParams();
  if (place && place.id && place.id !== "national") params.set("loc", place.id);
  if (guests) params.set("g", String(guests));
  const lock = lockParam(locks);
  if (lock) params.set("lock", lock);
  const q = params.toString();
  return q ? `/budget?${q}` : "/budget";
}

export function quoteCalc(slug, args) {
  const calc = calcBySlug(slug);
  if (!calc) return null;
  const bundle = studyBundle(args.place, args.guests, args.costs);
  const tier = seasonFactor(args.costs, args.tier || "typical");
  const inputs = args.inputs || {};
  const built = BUILDERS[slug]({ calc, bundle, tier, inputs, guests: bundle.plan.guests, costs: args.costs });
  return built;
}

const BUILDERS = {
  catering: cateringQuote,
  music: musicQuote,
  photo: photoQuote,
  flowers: flowersQuote,
  cake: cakeQuote,
  beauty: beautyQuote,
  attire: attireQuote,
  officiant: simpleReplaceQuote,
  rentals: rentalsQuote,
  transportation: simpleReplaceQuote,
  stationery: stationeryQuote,
  favors: favorsQuote,
};

function cateringQuote({ calc, bundle, tier, inputs, costs }) {
  const foodTyped = parseTyped(inputs.foodQuote);
  const barTyped = parseTyped(inputs.barQuote);
  const food = foodTyped != null
    ? { id: "catering", label: "Food, your price", amount: Math.round(foodTyped), note: mealNote(inputs.meal), source: "typed" }
    : { ...scaledStudy(bundle.map.catering, tier.factor), note: `${mealNote(inputs.meal)} ${tier.note}` };
  const bar = barTyped != null
    ? { id: "alcohol", label: "Bar, your price", amount: Math.round(barTyped), note: barNote(inputs.bar), source: "typed" }
    : { ...scaledStudy(bundle.map.alcohol, tier.factor), label: "Drinks", note: `${barNote(inputs.bar)} ${tier.note}` };
  const cakeCut = parseTyped(inputs.cakeCut);
  const rows = [food, bar];
  if (cakeCut != null) {
    rows.push({ id: "cakeCut", label: "Cake-cutting fee", amount: Math.round(cakeCut), note: "You typed this. It is not a published fee.", source: "typed" });
  } else {
    rows.push({ id: "cakeCut", label: "Cake-cutting fee", amount: null, note: "No published cake-cutting fee. Type one if the caterer charges it.", source: "empty", inTotal: false });
  }
  const servicePct = parseTyped(inputs.servicePct);
  const taxPct = parseTyped(inputs.taxPct);
  const grat = parseTyped(inputs.gratuityPct);
  let fees = null;
  if (servicePct != null || taxPct != null || grat != null) {
    fees = hiddenCostBreakdown({
      quote: food.amount + bar.amount,
      servicePct: servicePct ?? 0,
      taxPct: taxPct ?? 0,
      gratuityPct: grat ?? 0,
      taxOnService: inputs.taxOnService === true || inputs.taxOnService === "on" || inputs.taxOnService === "true",
    });
    if (servicePct != null) rows.push({ label: "Service charge", amount: Math.round(fees.serviceAmount), note: `${servicePct}% of the food and bar prices. Zola cites 18–22%.`, source: "typed" });
    if (taxPct != null) rows.push({ label: "Tax", amount: Math.round(fees.taxAmount), note: inputs.taxOnService ? "Your rate, on food, bar, and service." : "Your rate, on food and bar. Service is not taxed.", source: "typed" });
    if (grat != null) rows.push({ label: "Gratuity", amount: Math.round(fees.tipAmount), note: `${grat}% of the food and bar prices.`, source: "typed" });
  } else {
    rows.push({ label: "Service, tax, gratuity", amount: null, note: `Not added. Zola cites a ${costs.hidden.serviceChargeLowPct.value}–${costs.hidden.serviceChargeHighPct.value}% service charge. Tax and gratuity stay blank until you type them.`, source: "empty", inTotal: false });
  }
  const feeSum = fees ? Math.round(fees.serviceAmount + fees.taxAmount + fees.tipAmount) : 0;
  const locks = {
    catering: food.amount + (cakeCut || 0) + feeSum,
    alcohol: bar.amount,
  };
  return quoteResult(calc, {
    rows,
    target: bundle.map.catering.amount + bundle.map.alcohol.amount,
    locks,
    aside: [zolaAside("catering", costs), zolaAside("alcohol", costs)].filter(Boolean),
    notes: [tier.note],
    fees,
  });
}

function mealNote(meal) {
  const labels = { plated: "Plated", buffet: "Buffet", family: "Family style", stations: "Stations", truck: "Food truck" };
  const label = labels[meal] || "Style not chosen";
  return `${label}. No published price separates meal styles.`;
}

function barNote(bar) {
  const labels = { open: "Open bar", beer: "Beer and wine", cash: "Cash bar", dry: "Dry" };
  const label = labels[bar] || "Bar package not chosen";
  return `${label}. No published price separates bar packages.`;
}

function musicQuote({ calc, bundle, tier, inputs, costs }) {
  const mode = inputs.music || "dj";
  const djNational = costs.categories.find((cat) => cat.id === "dj").amount;
  const bandNational = costs.extras.liveBandKnot.value;
  const study = Math.round(bundle.map.dj.amount * tier.factor);
  let base;
  let musicNote;
  if (mode === "band") {
    base = Math.round(study * (bandNational / djNational));
    musicNote = `National band average $${bandNational.toLocaleString("en-US")} ÷ national DJ average $${djNational.toLocaleString("en-US")}, times your music line. Not a local band survey.`;
  } else if (mode === "playlist") {
    const typed = parseTyped(inputs.playlist);
    base = typed == null ? null : Math.round(typed);
    musicNote = typed == null
      ? "No published playlist price. Music is left out until you type a cost."
      : "Your playlist cost. There is no published playlist average in these studies.";
  } else {
    base = study;
    musicNote = `Reception DJ. ${tier.note}`;
  }
  const hours = parseTyped(inputs.hours);
  const rate = parseTyped(inputs.hourly);
  if (hours != null && rate != null) {
    base = Math.round(hours * rate);
    musicNote = "Hours times the hourly price you typed. That replaces the study line.";
  }
  const rows = [];
  if (base == null) {
    rows.push({ id: "dj", label: mode === "playlist" ? "Playlist" : "Music", amount: null, note: musicNote, source: "empty", inTotal: false });
  } else {
    rows.push({ id: "dj", label: mode === "band" ? "Band" : mode === "playlist" ? "Playlist" : "DJ", amount: base, note: musicNote, source: mode === "dj" && hours == null ? "study" : "typed" });
  }
  const adds = [
    ["ceremony", "Ceremony add-on"],
    ["mc", "MC"],
    ["lighting", "Lighting"],
  ];
  let extra = 0;
  for (const [key, label] of adds) {
    const typed = parseTyped(inputs[key]);
    if (typed == null) {
      rows.push({ label, amount: null, note: "No published add-on price. Type one if the vendor charges it.", source: "empty", inTotal: false });
    } else {
      rows.push({ label, amount: Math.round(typed), note: "You typed this.", source: "typed" });
      extra += Math.round(typed);
    }
  }
  const locks = {};
  if (base != null || extra > 0) locks.dj = (base || 0) + extra;
  return quoteResult(calc, {
    rows,
    target: bundle.map.dj.amount,
    locks,
    aside: [zolaAside("dj", costs)].filter(Boolean),
    notes: [musicNote, tier.note],
    extra: { musicMode: mode },
  });
}

function photoQuote({ calc, bundle, tier, inputs, costs }) {
  const rows = [];
  const photoHours = parseTyped(inputs.photoHours);
  const photoRate = parseTyped(inputs.photoRate);
  let photo;
  if (photoHours != null && photoRate != null) {
    photo = { id: "photography", label: "Photography, your hours", amount: Math.round(photoHours * photoRate), note: "Hours times the rate you typed.", source: "typed" };
  } else {
    photo = { ...scaledStudy(bundle.map.photography, tier.factor), label: "Photographer" };
    if (photoHours != null || photoRate != null) photo.note = "Type both hours and an hourly rate to replace this line. One of them is still blank.";
  }
  let video;
  const videoTyped = parseTyped(inputs.videoQuote);
  if (videoTyped != null) video = { id: "videography", label: "Videography, your price", amount: Math.round(videoTyped), note: "You typed this.", source: "typed" };
  else video = { ...scaledStudy(bundle.map.videography, tier.factor), label: "Videographer" };
  rows.push(photo, video);
  let add = 0;
  for (const [key, label] of [["second", "Second shooter"], ["engagement", "Engagement shoot"], ["album", "Album"]]) {
    const typed = parseTyped(inputs[key]);
    if (typed == null) rows.push({ label, amount: null, note: "No published add-on price.", source: "empty", inTotal: false });
    else {
      rows.push({ label, amount: Math.round(typed), note: "You typed this. Added on top of the study lines.", source: "typed" });
      add += Math.round(typed);
    }
  }
  return quoteResult(calc, {
    rows,
    target: bundle.map.photography.amount + bundle.map.videography.amount,
    locks: { photography: photo.amount + add, videography: video.amount },
    aside: [zolaAside("photography", costs), zolaAside("videography", costs)].filter(Boolean),
    notes: [tier.note],
  });
}

function flowersQuote({ calc, bundle, tier, inputs, guests, costs }) {
  const itemKeys = [
    ["bouquets", "Bouquets"],
    ["boutonnieres", "Boutonnieres"],
    ["arch", "Arch"],
  ];
  const center = centerpieceAmount(guests, inputs.perTable, inputs.centerpiece);
  const items = [];
  for (const [key, label] of itemKeys) {
    const typed = parseTyped(inputs[key]);
    items.push({ key, label, amount: typed == null ? null : Math.round(typed) });
  }
  items.push({
    key: "centerpieces",
    label: "Centerpieces",
    amount: center.amount == null ? null : Math.round(center.amount),
    note: center.note,
  });
  const anyFloral = items.some((item) => item.amount != null);
  const rows = [];
  if (anyFloral) {
    for (const item of items) {
      rows.push({
        label: item.label,
        amount: item.amount,
        note: item.note || (item.amount == null ? "Blank. Not guessed." : "You typed this. Itemized flowers replace the study line."),
        source: item.amount == null ? "empty" : "typed",
        inTotal: item.amount != null,
      });
    }
  } else {
    rows.push({ ...scaledStudy(bundle.map.flowers, tier.factor), label: "Flowers" });
    for (const item of items) {
      rows.push({ label: item.label, amount: null, note: item.note || "No published price. Type one to itemize.", source: "empty", inTotal: false });
    }
  }
  const rental = parseTyped(inputs.decorRental);
  if (rental != null) rows.push({ id: "lighting", label: "Decor rentals, your price", amount: Math.round(rental), note: "You typed this. It replaces the lighting and decor line.", source: "typed" });
  else rows.push({ ...scaledStudy(bundle.map.lighting, tier.factor), label: "Lighting and decor" });
  const floralSum = anyFloral
    ? items.reduce((sum, item) => sum + (item.amount || 0), 0)
    : rows.find((row) => row.id === "flowers" || row.label === "Flowers").amount;
  const lightRow = rows.find((row) => row.id === "lighting" || row.label === "Lighting and decor");
  return quoteResult(calc, {
    rows,
    target: bundle.map.flowers.amount + bundle.map.lighting.amount,
    locks: { flowers: floralSum, lighting: lightRow.amount },
    aside: [zolaAside("flowers", costs)].filter(Boolean).map((row) => ({ ...row, note: "Zola's flowers figure includes decor. Not averaged into these lines." })),
    notes: [center.note, tier.note].filter(Boolean),
    extra: { tables: center.tables },
  });
}

function centerpieceAmount(guests, perTable, each) {
  const per = parseTyped(perTable);
  const price = parseTyped(each);
  if (per == null && price == null) {
    return { amount: null, tables: null, note: "Type guests per table and a price per centerpiece. Neither is filled in for you." };
  }
  if (per == null || per <= 0 || price == null) {
    return { amount: null, tables: per > 0 ? Math.ceil(guests / per) : null, note: "Centerpieces need both a guests-per-table count and a price. One is still blank." };
  }
  const tables = Math.ceil(guests / per);
  return { amount: tables * price, tables, note: `${tables} tables from ${guests} guests at ${per} per table, times your centerpiece price.` };
}

function cakeQuote({ calc, bundle, tier, inputs, guests, costs }) {
  const study = scaledStudy(bundle.map.cake, tier.factor);
  const slice = cakeSliceRate(study.amount, guests);
  const typed = parseTyped(inputs.perSlice);
  const rows = [];
  let amount = study.amount;
  if (typed != null) {
    amount = Math.round(typed * guests);
    rows.push({ id: "cake", label: "Cake, your per-slice price", amount, note: `${typed} times ${guests} guests. Replaces the study line.`, source: "typed" });
  } else {
    rows.push({ ...study, label: "Cake" });
  }
  rows.push({
    label: "Per slice, calculated",
    amount: null,
    note: slice.note + ` About $${slice.rate.toFixed(2)} from the study line on screen.`,
    source: "calc",
    inTotal: false,
    rate: slice.rate,
  });
  return quoteResult(calc, {
    rows,
    target: bundle.map.cake.amount,
    locks: { cake: amount },
    aside: [zolaAside("cake", costs)].filter(Boolean),
    notes: [slice.note, tier.note],
    extra: { slice },
  });
}

function beautyQuote({ calc, bundle, tier, inputs, costs }) {
  const people = peopleCount(inputs.people);
  const hair = Math.round(bundle.map.hair.amount * tier.factor * people);
  const makeup = Math.round(bundle.map.makeup.amount * tier.factor * people);
  const rows = [
    { id: "hair", label: `Hair × ${people}`, amount: hair, note: people === 1 && (inputs.people == null || String(inputs.people).trim() === "" || String(inputs.people) === "1") ? "The Knot's hair average is for one person." : `Study hair line times ${people} people.`, source: "study" },
    { id: "makeup", label: `Makeup × ${people}`, amount: makeup, note: "The Knot's makeup average is for one person, times your count.", source: "study" },
  ];
  let extra = 0;
  for (const [key, label] of [["trial", "Trial"], ["travel", "Travel"]]) {
    const typed = parseTyped(inputs[key]);
    if (typed == null) rows.push({ label, amount: null, note: "No published price. Type one if the artist charges it.", source: "empty", inTotal: false });
    else {
      rows.push({ label, amount: Math.round(typed), note: "You typed this.", source: "typed" });
      extra += Math.round(typed);
    }
  }
  const zola = costs.zolaCategories.find((cat) => cat.id === "hair");
  return quoteResult(calc, {
    rows,
    target: bundle.map.hair.amount + bundle.map.makeup.amount,
    locks: { hair: hair + extra, makeup },
    aside: zola ? [{ label: "Zola national · hair and makeup", amount: zola.amount, low: zola.low, high: zola.high, note: "One combined Zola figure. Not split or averaged into the Knot lines." }] : [],
    notes: [tier.note, "Trial and travel lock onto the hair line because those fees have no budget category of their own."],
  });
}

function attireQuote({ calc, bundle, tier, inputs, costs }) {
  const dress = scaledStudy(bundle.map.dress, tier.factor);
  const rows = [{ ...dress, label: "Wedding dress" }];
  const groom = parseTyped(inputs.groom);
  if (groom == null) rows.push({ label: "Groom's attire", amount: null, note: "Not in The Knot readout we use. Type a price if you have one.", source: "empty", inTotal: false });
  else rows.push({ label: "Groom's attire", amount: Math.round(groom), note: "You typed this.", source: "typed" });
  const alterations = costs.zolaCategories.find((cat) => cat.id === "alterations");
  const tux = costs.zolaCategories.find((cat) => cat.id === "tux");
  let extra = groom || 0;
  if (inputs.alterations === true || inputs.alterations === "on" || inputs.alterations === "true") {
    rows.push({ label: "Alterations", amount: alterations.amount, note: "Zola's national average, added because you checked it.", source: "zola" });
    extra += alterations.amount;
  }
  if (inputs.tux === true || inputs.tux === "on" || inputs.tux === "true") {
    rows.push({ label: "Tuxedo rental", amount: tux.amount, note: "Zola's national average, added because you checked it.", source: "zola" });
    extra += tux.amount;
  }
  return quoteResult(calc, {
    rows,
    target: bundle.map.dress.amount,
    locks: { dress: dress.amount + extra },
    aside: [
      { label: "Zola national · alterations", amount: alterations.amount, low: alterations.low, high: alterations.high, note: "Not in the total unless you check it." },
      { label: "Zola national · tuxedo rental", amount: tux.amount, low: tux.low, high: tux.high, note: "Not in the total unless you check it." },
    ],
    notes: [bundle.map.dress.note || "The Knot's dress average. Groom's attire is not included.", tier.note],
  });
}

function simpleReplaceQuote({ calc, bundle, tier, inputs, costs }) {
  const id = calc.studyIds[0];
  const typed = parseTyped(inputs.quote);
  const study = scaledStudy(bundle.map[id], tier.factor);
  const row = typed != null
    ? { id, label: `${study.label}, your price`, amount: Math.round(typed), note: "You typed this. It replaces the study line.", source: "typed" }
    : study;
  return quoteResult(calc, {
    rows: [row],
    target: bundle.map[id].amount,
    locks: { [id]: row.amount },
    aside: [zolaAside(id, costs)].filter(Boolean),
    notes: [tier.note],
  });
}

function rentalsQuote({ calc, bundle, tier, inputs, costs }) {
  const pairs = [
    ["chairCount", "chairPrice", "Chairs"],
    ["tableCount", "tablePrice", "Tables"],
  ];
  const singles = [
    ["linens", "Linens"],
    ["tent", "Tent"],
  ];
  const itemRows = [];
  for (const [countKey, priceKey, label] of pairs) {
    const count = parseTyped(inputs[countKey]);
    const price = parseTyped(inputs[priceKey]);
    if (count == null && price == null) {
      itemRows.push({ label, amount: null, note: "Type a count and a price. Neither is filled in.", source: "empty" });
    } else if (count == null || price == null) {
      itemRows.push({ label, amount: null, note: "Needs both a count and a price.", source: "empty" });
    } else {
      itemRows.push({ label, amount: Math.round(count * price), note: `${count} × your price.`, source: "typed" });
    }
  }
  for (const [key, label] of singles) {
    const typed = parseTyped(inputs[key]);
    itemRows.push(typed == null
      ? { label, amount: null, note: "No published price.", source: "empty" }
      : { label, amount: Math.round(typed), note: "You typed this.", source: "typed" });
  }
  const complete = itemRows.filter((row) => row.amount != null);
  const rows = [];
  let lockAmount;
  if (complete.length) {
    rows.push(...itemRows.map((row) => ({ ...row, inTotal: row.amount != null })));
    lockAmount = complete.reduce((sum, row) => sum + row.amount, 0);
  } else {
    const study = scaledStudy(bundle.map.rentals, tier.factor);
    rows.push(study, ...itemRows.map((row) => ({ ...row, inTotal: false })));
    lockAmount = study.amount;
  }
  return quoteResult(calc, {
    rows,
    target: bundle.map.rentals.amount,
    locks: { rentals: lockAmount },
    notes: [complete.length ? "Your itemized rentals replace the study line. Blank rows are not guessed." : tier.note],
  });
}

function stationeryQuote({ calc, bundle, tier, inputs, costs }) {
  const study = scaledStudy(bundle.map.invitations, tier.factor);
  const postage = parseTyped(inputs.postage);
  const rows = [{ ...study, label: "Invitations" }];
  if (postage == null) rows.push({ label: "Postage", amount: null, note: "Not added. We can't tell whether The Knot's invitation average includes stamps.", source: "empty", inTotal: false });
  else rows.push({ label: "Postage", amount: Math.round(postage), note: "You typed this. Added on top of the invitation line.", source: "typed" });
  return quoteResult(calc, {
    rows,
    target: bundle.map.invitations.amount,
    locks: { invitations: study.amount + (postage || 0) },
    aside: [zolaAside("invitations", costs)].filter(Boolean),
    notes: [tier.note],
  });
}

function favorsQuote({ calc, bundle, tier, inputs, guests, costs }) {
  const study = scaledStudy(bundle.map.favors, tier.factor);
  const rate = study.amount / guests;
  const typed = parseTyped(inputs.each);
  const rows = [];
  let amount = study.amount;
  if (typed != null) {
    amount = Math.round(typed * guests);
    rows.push({ id: "favors", label: "Favors, your price", amount, note: `${typed} times ${guests} guests. Replaces the study line.`, source: "typed" });
  } else rows.push({ ...study, label: "Favors" });
  rows.push({ label: "Per guest, calculated", amount: null, note: `About $${rate.toFixed(2)} from the study line divided by ${guests} guests. Not a store price.`, source: "calc", inTotal: false, rate });
  return quoteResult(calc, {
    rows,
    target: bundle.map.favors.amount,
    locks: { favors: amount },
    notes: [tier.note],
  });
}

const VENDOR_CATEGORY_FOR_LINE = {
  catering: "catering",
  alcohol: "catering",
  dj: "music",
  photography: "photo",
  videography: "photo",
  flowers: "florist",
  cake: "bakery",
  hair: "beauty",
  makeup: "beauty",
};

const CALC_FOR_LINE = {
  catering: "catering",
  alcohol: "catering",
  cake: "cake",
  dj: "music",
  photography: "photo",
  videography: "photo",
  flowers: "flowers",
  lighting: "flowers",
  hair: "beauty",
  makeup: "beauty",
  dress: "attire",
  officiant: "officiant",
  rentals: "rentals",
  transportation: "transportation",
  invitations: "stationery",
  favors: "favors",
};

export function weddingBuild({ place, guests, costs, tier = "typical", music = "dj", playlist = "" }) {
  const { split } = studyBundle(place, guests, costs);
  const season = seasonFactor(costs, tier);
  const djNational = costs.categories.find((cat) => cat.id === "dj").amount;
  const bandNational = costs.extras.liveBandKnot.value;
  let excluded = 0;
  const lines = split.lines.map((line) => {
    let amount = Math.round(line.amount * season.factor);
    let note = season.factor === 1 ? "" : season.note;
    let swapped = false;
    if (line.id === "dj") {
      if (music === "band") {
        amount = Math.round(Math.round(line.amount * season.factor) * (bandNational / djNational));
        note = `National band average $${bandNational.toLocaleString("en-US")} ÷ national DJ average $${djNational.toLocaleString("en-US")}, times your music line. Not a local band survey.`;
        swapped = true;
      } else if (music === "playlist") {
        const typed = parseTyped(playlist);
        if (typed == null) {
          excluded += amount;
          amount = null;
          note = "No published playlist price. Left out of the total until you type one.";
        } else {
          amount = Math.round(typed);
          note = "Your playlist cost.";
        }
        swapped = true;
      }
    }
    return {
      id: line.id,
      label: line.id === "dj" && music === "band" ? "Band" : line.id === "dj" && music === "playlist" ? "Playlist" : line.label,
      amount,
      note,
      swapped,
      calc: CALC_FOR_LINE[line.id] || null,
      vendorCategory: VENDOR_CATEGORY_FOR_LINE[line.id] || null,
    };
  });
  const total = lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  return { total, excluded, lines, season, music };
}

export function localCategoryRange(place, guests, costs, vendorCategory) {
  const { map } = studyBundle(place, guests, costs);
  const ids = {
    catering: ["catering", "alcohol"],
    music: ["dj"],
    photo: ["photography"],
    florist: ["flowers"],
    bakery: ["cake"],
    beauty: ["hair", "makeup"],
  }[vendorCategory] || [];
  const amount = ids.reduce((sum, id) => sum + (map[id] ? map[id].amount : 0), 0);
  return {
    amount,
    ids,
    note: "Local typical from the study lines. Not a quote from a vendor on this page.",
  };
}

export function vendorListPath(category, metro) {
  return `/vendors/${category}/${metro.stateSlug}/${metro.slug}`;
}

export function vendorDetailPath(vendor, metro) {
  return `${vendorListPath(vendor.category, metro)}/${vendor.id}`;
}

export function vendorAppPath(place, category, metros) {
  const metro = (metros || []).find((item) => place && item.id === place.metroId);
  if (metro && category) return vendorListPath(category, metro);
  const params = new URLSearchParams();
  if (category) params.set("cat", category);
  if (place && place.id && place.id !== "national") params.set("loc", place.id);
  const query = params.toString();
  const hash = metro || !place || place.id === "national" ? "" : "#vendor-gap";
  return `/vendors${query ? `?${query}` : ""}${hash}`;
}

function withExamples(fields) {
  return fields.map((field) => {
    const example = exampleForField(field.name);
    if (!example) return field;
    return { ...field, hint: field.hint ? `${field.hint} ${example}` : example };
  });
}

export function formFields(slug) {
  const meal = { name: "meal", label: "Meal style", kind: "choice", options: [["plated", "Plated"], ["buffet", "Buffet"], ["family", "Family style"], ["stations", "Stations"], ["truck", "Food truck"]], hint: "Changes the label only. No published price separates these." };
  const bar = { name: "bar", label: "Bar package", kind: "choice", options: [["open", "Open bar"], ["beer", "Beer and wine"], ["cash", "Cash bar"], ["dry", "Dry"]], hint: "Changes the label only until you type a bar price." };
  const fields = {
    catering: [
      meal,
      bar,
      { name: "foodQuote", label: "Your food price", kind: "money", placeholder: "e.g. 9,400", hint: "Replaces the study food line." },
      { name: "barQuote", label: "Your bar price", kind: "money", placeholder: "e.g. 2,800", hint: "Replaces the study drinks line." },
      { name: "cakeCut", label: "Cake-cutting fee", kind: "money", placeholder: "e.g. 250", hint: "Leave blank if you don't have a fee yet." },
      { name: "servicePct", label: "Service charge %", kind: "number", placeholder: "18–22 is Zola's range", hint: "Blank means not added." },
      { name: "taxPct", label: "Tax %", kind: "number", placeholder: "your quote's rate", hint: "We don't assume a state rate." },
      { name: "gratuityPct", label: "Gratuity %", kind: "number", placeholder: "e.g. 18", hint: "Blank means not added." },
      { name: "taxOnService", label: "Tax the service charge too", kind: "check" },
    ],
    music: [
      { name: "music", label: "Music", kind: "choice", options: [["dj", "DJ"], ["band", "Band"], ["playlist", "Playlist"]] },
      { name: "playlist", label: "Playlist cost", kind: "money", placeholder: "e.g. 150", hint: "Used only when Playlist is selected. No published default." },
      { name: "hours", label: "Hours", kind: "number", placeholder: "e.g. 5", hint: "Needs an hourly price before it changes the total." },
      { name: "hourly", label: "Hourly price", kind: "money", placeholder: "e.g. 250", hint: "No published hourly rate." },
      { name: "ceremony", label: "Ceremony add-on", kind: "money", placeholder: "e.g. 300" },
      { name: "mc", label: "MC", kind: "money", placeholder: "e.g. 200" },
      { name: "lighting", label: "Lighting", kind: "money", placeholder: "e.g. 400" },
    ],
    photo: [
      { name: "photoHours", label: "Photo hours", kind: "number", placeholder: "e.g. 8" },
      { name: "photoRate", label: "Photo hourly price", kind: "money", placeholder: "e.g. 300", hint: "Both hours and a rate replace the photographer line." },
      { name: "videoQuote", label: "Your video price", kind: "money", placeholder: "e.g. 2,300", hint: "Replaces the videographer line." },
      { name: "second", label: "Second shooter", kind: "money", placeholder: "e.g. 500" },
      { name: "engagement", label: "Engagement shoot", kind: "money", placeholder: "e.g. 400" },
      { name: "album", label: "Album", kind: "money", placeholder: "e.g. 600" },
    ],
    flowers: [
      { name: "bouquets", label: "Bouquets", kind: "money", placeholder: "e.g. 250" },
      { name: "boutonnieres", label: "Boutonnieres", kind: "money", placeholder: "e.g. 120" },
      { name: "perTable", label: "Guests per table", kind: "number", placeholder: "e.g. 8" },
      { name: "centerpiece", label: "Centerpiece price", kind: "money", placeholder: "e.g. 45", hint: "Times the table count from guests per table." },
      { name: "arch", label: "Arch", kind: "money", placeholder: "e.g. 400" },
      { name: "decorRental", label: "Decor rentals", kind: "money", placeholder: "e.g. 700", hint: "Replaces the lighting and decor line." },
    ],
    cake: [
      { name: "perSlice", label: "Your price per slice", kind: "money", placeholder: "e.g. 6", hint: "Times the guest count. Replaces the study line." },
    ],
    beauty: [
      { name: "people", label: "People", kind: "number", placeholder: "1", value: "1", hint: "Starts at 1 because The Knot's figures are for one person." },
      { name: "trial", label: "Trial", kind: "money", placeholder: "e.g. 150" },
      { name: "travel", label: "Travel", kind: "money", placeholder: "e.g. 50" },
    ],
    attire: [
      { name: "groom", label: "Groom's attire", kind: "money", placeholder: "e.g. 300" },
      { name: "alterations", label: "Add Zola's alterations average", kind: "check" },
      { name: "tux", label: "Add Zola's tuxedo rental average", kind: "check" },
    ],
    officiant: [{ name: "quote", label: "Your officiant price", kind: "money", placeholder: "e.g. 400", hint: "Replaces the study line." }],
    rentals: [
      { name: "chairCount", label: "Chairs", kind: "number", placeholder: "e.g. 120" },
      { name: "chairPrice", label: "Price per chair", kind: "money", placeholder: "e.g. 4" },
      { name: "tableCount", label: "Tables", kind: "number", placeholder: "e.g. 15" },
      { name: "tablePrice", label: "Price per table", kind: "money", placeholder: "e.g. 12" },
      { name: "linens", label: "Linens", kind: "money", placeholder: "e.g. 400" },
      { name: "tent", label: "Tent", kind: "money", placeholder: "e.g. 1,500" },
    ],
    transportation: [{ name: "quote", label: "Your transportation price", kind: "money", placeholder: "e.g. 900", hint: "Replaces the study line." }],
    stationery: [{ name: "postage", label: "Postage", kind: "money", placeholder: "e.g. 80", hint: "Added only if you type it." }],
    favors: [{ name: "each", label: "Your price per favor", kind: "money", placeholder: "e.g. 4", hint: "Times the guest count. Replaces the study line." }],
  };
  return withExamples(fields[slug] || []);
}
