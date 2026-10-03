/**
 * Vendor finder pages and per-vendor cost calculators.
 */

import { escapeHtml } from "./html.js";
import { formatMoney } from "./format.js";
import { describe } from "./describe.js";
import {
  COST_CALCS, calcBySlug, formFields, localCategoryRange, quoteCalc, vendorDetailPath, vendorListPath, VENDOR_CATEGORIES,
} from "./vendor-math.js";
import { metroByVendorId, vendorMetros, vendors, vendorsFor } from "./vendor-catalog.js";

const money = (n) => formatMoney(n, { exact: true });

export function vendorPages(costs, geo) {
  const national = describe("national", { geo, costs });
  return [
    costHub(national, costs),
    ...COST_CALCS.map((calc) => costPage(calc, national, costs)),
    vendorHub(),
    ...vendorMetros.flatMap((metro) => VENDOR_CATEGORIES.map((cat) => categoryMetroPage(metro, cat, costs, geo))),
    ...vendors.map((vendor) => vendorPage(vendor)),
    suggestPage(),
  ];
}

function costHub(national, costs) {
  const cards = COST_CALCS.map((calc) => {
    const quote = quoteCalc(calc.slug, { place: national, guests: 117, costs });
    return `<li class="tool-card card"><a href="/costs/${calc.slug}"><h2>${escapeHtml(calc.nav)}</h2><p>${money(quote.total)} at 117 US guests</p></a></li>`;
  }).join("");
  return {
    file: "costs.html",
    path: "/costs",
    title: "Wedding vendor cost calculators",
    description: "Food, music, photo, flowers, cake, and the other vendor lines. Each one starts from a cited study figure at 117 US guests.",
    wide: true,
    schema: "collection",
    crumbs: [{ name: "Home", path: "/" }, { name: "Vendor calculators", path: "/costs" }],
    faqs: [
      { q: "Where do the first numbers come from?", a: "Each calculator starts from The Knot category lines in the wedding model, localized to the place you pick. Zola figures sit beside them and are not averaged in. A blank field has no published default." },
    ],
    body: `<section class="hero hero-tight">
  <div>
    <p class="kicker">Vendor calculators</p>
    <h1>Price a vendor before you book</h1>
    <p class="hero-sub">117 US guests, then your city. Blank fields are waiting for a quote.</p>
  </div>
</section>
<ul class="app-grid">${cards}</ul>
<p><a class="btn" href="/vendors">Find vendors</a></p>`,
  };
}

function costPage(calc, national, costs) {
  const quote = quoteCalc(calc.slug, { place: national, guests: 117, costs, inputs: calc.slug === "beauty" ? { people: "1" } : {} });
  const fields = formFields(calc.slug).map(fieldHtml).join("");
  return {
    file: `costs/${calc.slug}.html`,
    path: `/costs/${calc.slug}`,
    title: calc.title,
    description: calc.description,
    script: "/js/cost.js",
    sticky: true,
    wide: true,
    schema: "app",
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Vendor calculators", path: "/costs" },
      { name: calc.nav, path: `/costs/${calc.slug}` },
    ],
    faqs: calc.faqs,
    body: `<section class="hero home-hero calc-grid">
  <div>
    <p class="kicker">${escapeHtml(calc.kicker)}</p>
    <h1>${escapeHtml(calc.h1)}</h1>
    <div id="out" class="stack" aria-live="polite">
      <article class="big-card main">
        <p class="kicker">US average · 117 guests</p>
        <p class="money-sm" data-total>${money(quote.total)}</p>
        <p class="hint">${escapeHtml(calc.description)}</p>
      </article>
    </div>
  </div>
  <form id="cost-form" class="card stack calc-inputs">
    <div id="cost-presets"></div>
    <div class="loc" data-location>
      <label for="where">Where's the wedding?</label>
      <input id="where" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="where-list" placeholder="ZIP code or city">
      <ul id="where-list" class="suggestions" role="listbox" hidden></ul>
      <button type="button" class="text-btn" data-national>Not sure yet</button>
      <p class="loc-status" data-status role="status"></p>
    </div>
    <div>
      <label for="guests">Guests</label>
      <div class="stepper" data-stepper>
        <div class="stepper-row">
          <button type="button" class="step" data-step="-10" aria-label="Ten fewer guests">−</button>
          <input id="guests" type="number" inputmode="numeric" min="10" max="400" value="117">
          <button type="button" class="step" data-step="10" aria-label="Ten more guests">+</button>
        </div>
        <input type="range" min="10" max="400" value="117" aria-label="Guest count">
      </div>
    </div>
    ${fields}
  </form>
</section>
<script type="application/json" id="calc-config">${JSON.stringify({ slug: calc.slug }).replaceAll("<", "\\u003c")}</script>`,
  };
}

function fieldHtml(field) {
  if (field.kind === "choice") {
    const buttons = field.options.map(([id, label], index) => `<button type="button" data-choice="${escapeHtml(field.name)}" data-value="${escapeHtml(id)}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(label)}</button>`).join("");
    return `<div><p class="label" id="label-${escapeHtml(field.name)}">${escapeHtml(field.label)}</p><div class="choices" role="group" aria-labelledby="label-${escapeHtml(field.name)}">${buttons}</div><input type="hidden" name="${escapeHtml(field.name)}" value="${escapeHtml(field.options[0][0])}">${field.hint ? `<p class="hint">${escapeHtml(field.hint)}</p>` : ""}</div>`;
  }
  if (field.kind === "check") {
    return `<label class="check-row"><input type="checkbox" name="${escapeHtml(field.name)}"> ${escapeHtml(field.label)}</label>`;
  }
  const moneyClass = field.kind === "money" ? ` class="money-field"` : "";
  const input = `<input id="field-${escapeHtml(field.name)}" name="${escapeHtml(field.name)}" type="text" inputmode="decimal" placeholder="${escapeHtml(field.placeholder || "")}"${field.value ? ` value="${escapeHtml(field.value)}"` : ""}${field.kind === "money" ? " data-money" : ""} autocomplete="off">`;
  return `<div><label for="field-${escapeHtml(field.name)}">${escapeHtml(field.label)}</label><span${moneyClass}>${input}</span>${field.hint ? `<p class="hint">${escapeHtml(field.hint)}</p>` : ""}</div>`;
}

function vendorHub() {
  const cards = vendorMetros.map((metro) => {
    const count = vendors.filter((vendor) => vendor.metro === metro.id).length;
    const links = VENDOR_CATEGORIES.map((cat) => `<a href="${vendorListPath(cat.id, metro)}">${escapeHtml(cat.label)}</a>`).join("");
    return `<article class="tool-card card"><h2>${escapeHtml(metro.name)}, ${escapeHtml(metro.state)}</h2><p>${count} vendors checked</p><p class="chip-row">${links}</p></article>`;
  }).join("");
  const cats = VENDOR_CATEGORIES.map((cat) => `<button type="button" data-cat="${cat.id}" aria-pressed="false">${escapeHtml(cat.plural)}</button>`).join("");
  return {
    file: "vendors.html",
    path: "/vendors",
    title: "Wedding vendor finder",
    description: "Caterers, DJs, photographers, florists, bakers, and hair and makeup artists. Prices come from each vendor's own site.",
    script: "/js/vendors.js",
    wide: true,
    schema: "collection",
    crumbs: [{ name: "Home", path: "/" }, { name: "Vendors", path: "/vendors" }],
    faqs: [
      { q: "Where do vendor prices come from?", a: "From the vendor's own website, with the date we checked. If the site does not publish a price, the card says to ask, and shows the local study range labeled as a study range." },
      { q: "What if my city is not listed?", a: "You still get the local study range for that category, and a link to suggest a vendor. Curated cards cover ten metros." },
    ],
    body: `<section class="hero hero-tight">
  <div>
    <p class="kicker">Vendor finder</p>
    <h1>Find a vendor</h1>
    <p class="hero-sub">Caterers, music, photo, flowers, cake, and beauty. Prices from each vendor's own site.</p>
  </div>
</section>
${finderShell("", "")}
<section id="city-grid" aria-labelledby="city-grid-title">
  <h2 id="city-grid-title">Pick your city</h2>
  <div class="app-grid">${cards}</div>
</section>
<div class="choices" id="cat-filters">${cats}</div>
<div id="vendor-grid" class="venue-grid">${vendors.map((vendor) => vendorCard(vendor)).join("") || `<p class="empty-note card">No vendors are listed yet. <a href="/suggest-a-vendor">Suggest a vendor</a>.</p>`}</div>
<section class="card" id="vendor-gap" hidden tabindex="-1">
  <h2 data-gap-title>This city</h2>
  <p data-gap-copy>We don't have a curated vendor list here yet.</p>
  <p class="money-sm" data-gap-total></p>
  <p data-gap-note></p>
  <p><a class="btn" href="/suggest-a-vendor">Suggest a vendor</a></p>
</section>`,
  };
}

function categoryMetroPage(metro, cat, costs, geo) {
  const list = vendorsFor(metro.id, cat.id);
  const place = describe(`metro:${metro.id}`, { geo, costs });
  const range = localCategoryRange(place, 117, costs, cat.id);
  const path = vendorListPath(cat.id, metro);
  return {
    file: `vendors/${cat.id}/${metro.stateSlug}/${metro.slug}.html`,
    path,
    title: `${cat.plural} in ${metro.name}`,
    description: `${cat.plural} in ${metro.label}. Published prices are cited to each vendor's site. Everyone else says ask, next to the local study range.`,
    script: "/js/vendors.js",
    wide: true,
    schema: "collection",
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Vendors", path: "/vendors" },
      { name: `${cat.plural} in ${metro.name}`, path },
    ],
    faqs: [
      { q: `How much do ${cat.plural.toLowerCase()} cost in ${metro.name}?`, a: `${list.filter((vendor) => vendor.price.confidence === "published").length} of ${list.length} vendors on this page published a price on their own site. The local study figure for this category at 117 guests is ${money(range.amount)}. That study figure is not a quote.` },
    ],
    body: `<section class="hero hero-tight">
  <div>
    <p class="kicker">${escapeHtml(metro.label)}</p>
    <h1>${escapeHtml(cat.plural)} in ${escapeHtml(metro.name)}</h1>
    <p class="hero-sub">${list.length} checked. Local typical at 117 guests: ${money(range.amount)}. That is the study line, not a vendor's price.</p>
  </div>
</section>
${finderShell(metro.id, cat.id)}
<div id="vendor-grid" class="venue-grid">${list.map((vendor) => vendorCard(vendor, range)).join("") || `<div class="card empty-note"><p>No ${escapeHtml(cat.plural.toLowerCase())} verified in ${escapeHtml(metro.name)} yet.</p><p><a class="btn" href="/suggest-a-vendor?cat=${cat.id}&metro=${metro.id}">Suggest a vendor</a></p></div>`}</div>
<p class="hint">Outside this list, use the study range ${money(range.amount)} and <a href="/suggest-a-vendor?cat=${cat.id}&metro=${metro.id}">suggest a vendor</a>.</p>`,
  };
}

function finderShell(metroId, category) {
  const styles = ["plated", "buffet", "family", "stations", "food-truck", "dj", "band", "documentary", "film", "garden", "modern", "bridal"];
  return `<form class="finder card stack" id="vendor-finder" data-metro="${escapeHtml(metroId)}" data-category="${escapeHtml(category)}">
  <div class="loc" data-location>
    <label for="where">Where's the wedding?</label>
    <input id="where" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="where-list" placeholder="ZIP code or city">
    <ul id="where-list" class="suggestions" role="listbox" hidden></ul>
    <p class="loc-status" data-status role="status"></p>
  </div>
  <div class="form-grid two">
    <div>
      <label for="guests">Guests</label>
      <input id="guests" type="number" inputmode="numeric" min="10" max="400" value="117">
    </div>
    <div>
      <label for="vendor-budget">Budget for this category <span class="hint">Optional</span></label>
      <span class="money-field"><input id="vendor-budget" type="text" inputmode="numeric" placeholder="e.g. 8,000" data-money autocomplete="off"></span>
    </div>
  </div>
  <div>
    <p class="label" id="style-label">Style or genre</p>
    <div class="choices" role="group" aria-labelledby="style-label">
      ${styles.map((style) => `<button type="button" data-style="${style}" aria-pressed="false">${escapeHtml(style)}</button>`).join("")}
    </div>
  </div>
</form>`;
}

function vendorCard(vendor, range) {
  const metro = metroByVendorId(vendor.metro);
  const price = priceLine(vendor);
  const local = range ? `<span class="hint">Local typical ${money(range.amount)} · study line, not this vendor</span>` : "";
  return `<article class="venue-card card" data-vendor-card data-id="${escapeHtml(vendor.id)}" data-metro="${escapeHtml(vendor.metro)}" data-cat="${escapeHtml(vendor.category)}" data-styles="${escapeHtml(vendor.styles.join(" "))}" data-published="${vendor.price.confidence === "published" ? "1" : ""}" data-amount="${vendor.price.amount ?? ""}" data-low="${vendor.price.low ?? ""}" data-unit="${escapeHtml(vendor.price.unit || "")}" data-guest-min="${vendor.guestMin ?? ""}" data-guest-max="${vendor.guestMax ?? ""}">
  <a class="venue-card-link" href="${vendorDetailPath(vendor, metro)}">
    <span class="venue-card-copy">
      <span class="kicker">${escapeHtml(vendor.city)} · ${escapeHtml(categoryLabel(vendor.category))}</span>
      <h2>${escapeHtml(vendor.name)}</h2>
      <span class="chip-row">${vendor.styles.slice(0, 3).map((style) => `<span class="chip">${escapeHtml(style)}</span>`).join("")}</span>
      <span class="venue-price">${escapeHtml(price)}</span>
      ${local}
      <span class="hint">${escapeHtml(vendor.price.label)} · checked ${escapeHtml(vendor.price.verifiedOn)}</span>
    </span>
  </a>
  <button type="button" class="heart" data-heart="vendor:${escapeHtml(vendor.id)}" aria-pressed="false" aria-label="Save ${escapeHtml(vendor.name)}">♡</button>
</article>`;
}

function vendorPage(vendor) {
  const metro = metroByVendorId(vendor.metro);
  const path = vendorDetailPath(vendor, metro);
  const cat = categoryLabel(vendor.category);
  const price = priceLine(vendor);
  return {
    file: `vendors/${vendor.category}/${metro.stateSlug}/${metro.slug}/${vendor.id}.html`,
    path,
    title: `${vendor.name} wedding pricing`,
    description: `${vendor.name} in ${vendor.city}. ${price} Checked ${vendor.price.verifiedOn}.`,
    script: "/js/vendor.js",
    wide: true,
    schema: "vendor",
    vendorName: vendor.name,
    website: vendor.website,
    address: vendor.address,
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Vendors", path: "/vendors" },
      { name: `${cat} in ${metro.name}`, path: vendorListPath(vendor.category, metro) },
      { name: vendor.name, path },
    ],
    faqs: [
      { q: `Does ${vendor.name} publish a price?`, a: vendor.price.confidence === "published" ? `${vendor.price.label} Source: ${vendor.price.sourceUrl}. Checked ${vendor.price.verifiedOn}.` : `${vendor.name}'s site did not publish a price when we checked on ${vendor.price.verifiedOn}. Ask them, and use the local study range as context only.` },
    ],
    body: `<article>
  <p class="kicker">${escapeHtml(vendor.city)}, ${escapeHtml(vendor.state)} · ${escapeHtml(cat)}</p>
  <h1>${escapeHtml(vendor.name)}</h1>
  <p class="money-sm">${escapeHtml(price)}</p>
  <p>${escapeHtml(vendor.blurb)}</p>
  <p class="hint">${escapeHtml(vendor.price.note || vendor.price.label)} · <a href="${escapeHtml(vendor.price.sourceUrl)}">Source</a> · checked ${escapeHtml(vendor.price.verifiedOn)} · ${escapeHtml(vendor.price.confidence)}</p>
  <p>${escapeHtml(vendor.address)}</p>
  <div class="inline-actions">
    <a class="btn" href="${escapeHtml(vendor.website)}">Vendor website</a>
    <button type="button" class="btn-ghost heart" data-heart="vendor:${escapeHtml(vendor.id)}" aria-pressed="false">Save</button>
    <a href="${calcPath(vendor.category)}">Open the calculator</a>
  </div>
  <p id="local-range" class="hint"></p>
</article>
<script type="application/json" id="vendor-record">${JSON.stringify({ id: vendor.id, category: vendor.category, metro: vendor.metro, name: vendor.name }).replaceAll("<", "\\u003c")}</script>`,
  };
}

function suggestPage() {
  return {
    file: "suggest-a-vendor.html",
    path: "/suggest-a-vendor",
    title: "Suggest a wedding vendor",
    description: "Suggest a caterer, DJ, photographer, florist, baker, or beauty artist. We only list prices from the vendor's own website.",
    script: "/js/list-venue.js",
    schema: "page",
    crumbs: [{ name: "Home", path: "/" }, { name: "Suggest a vendor", path: "/suggest-a-vendor" }],
    body: `<p class="kicker">Suggest a vendor</p>
<h1>Suggest a vendor</h1>
<p class="lede">Send the business name and a page on their own website. We don't list prices from The Knot, WeddingWire, Zola, Thumbtack, or Yelp.</p>
<form class="card stack" id="suggest-form">
  <div><label for="venue-name">Vendor name</label><input id="venue-name" name="venue" required autocomplete="organization"></div>
  <div><label for="venue-city">City</label><input id="venue-city" name="city" required autocomplete="address-level2"></div>
  <div><label for="venue-url">Their website</label><input id="venue-url" name="url" type="url" placeholder="https://" required></div>
  <div><label for="venue-note">Category and what to check</label><textarea id="venue-note" name="note" placeholder="Caterer, DJ, photographer…"></textarea></div>
  <button class="btn" type="submit">Copy suggestion</button>
  <p class="hint" id="suggest-status" role="status"></p>
</form>
<p class="hint">This form does not send yet. The button copies a note you can paste into an email.</p>`,
  };
}

function priceLine(vendor) {
  if (vendor.price.confidence !== "published") return "Ask for pricing";
  if (vendor.price.low != null && vendor.price.high != null) return `${money(vendor.price.low)}–${money(vendor.price.high)}`;
  if (vendor.price.amount != null) {
    const unit = vendor.price.unit ? ` ${vendor.price.unit}` : "";
    return `${money(vendor.price.amount)}${unit}`;
  }
  return "Ask for pricing";
}

function categoryLabel(id) {
  return VENDOR_CATEGORIES.find((cat) => cat.id === id)?.plural || id;
}

function calcPath(category) {
  const map = { catering: "catering", music: "music", photo: "photo", florist: "flowers", bakery: "cake", beauty: "beauty" };
  const slug = map[category];
  return slug ? `/costs/${slug}` : "/costs";
}

export function calcByPath(slug) {
  return calcBySlug(slug);
}
