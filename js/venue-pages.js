/**
 * Pre-rendered venue finder, metro hubs, and venue pages.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "./html.js";
import { formatMoney } from "./format.js";
import { describe } from "./describe.js";
import { quoteVenue } from "./venue-quote.js";
import { allIn } from "./price-engine.js";
import { allInHeadline, allInHtml, listedPrice } from "./price-present.js";
import {
  metroById, metroPath, venueMetros, venuePath, venues, venuesForMetro, venuesForState,
} from "./venue-catalog.js";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data");
const costs = JSON.parse(readFileSync(path.join(dataDir, "costs.json"), "utf8"));
const geo = JSON.parse(readFileSync(path.join(dataDir, "geo.json"), "utf8"));
const taxTable = JSON.parse(readFileSync(path.join(dataDir, "tax.json"), "utf8"));
const feeTable = JSON.parse(readFileSync(path.join(dataDir, "venue-fees.json"), "utf8"));

function placeFor(venue) {
  return describe(`metro:${venue.metro}`, { geo, costs });
}

function allInFor(venue, guests = 100, day = "sat") {
  return allIn(venue, {
    guests,
    day,
    season: "peak",
    costs,
    place: placeFor(venue),
    taxTable,
    fees: feeTable,
  });
}

const money = (n) => formatMoney(n, { exact: true });

export function venuePages() {
  return [hubPage(), ...venueMetros.map(metroPage), ...venues.map(venuePage)];
}

function hubPage() {
  const cards = venueMetros.map((metro) => {
    const count = venuesForMetro(metro.id).length;
    const priced = venuesForMetro(metro.id).filter((venue) => venue.price.confidence === "published").length;
    const label = `${metro.name}, ${metro.state}`;
    return `<a class="tool-card card" href="${metroPath(metro)}"><span class="swatch swatch-garden" aria-hidden="true"></span><h2>${escapeHtml(label)}</h2><p>${count} ${count === 1 ? "venue" : "venues"}${priced ? ` · ${priced} with a published price` : ""}</p></a>`;
  }).join("");
  const cityGrid = `<section id="city-grid" aria-labelledby="city-grid-title">
  <h2 id="city-grid-title">Pick your city</h2>
  <p class="hint">${venueMetros.length} cities with a curated list. Every venue is below until you pick one.</p>
  <div class="app-grid">${cards}</div>
</section>`;
  return {
    file: "venues.html",
    path: "/venues",
    title: "Wedding Venue Finder",
    description: "Find a wedding venue by guests, budget, and vibe. Prices come from each venue's own site, with the date we checked.",
    script: "/js/venues.js",
    wide: true,
    schema: "collection",
    crumbs: [{ name: "Home", path: "/" }, { name: "Venues", path: "/venues" }],
    faqs: [
      { q: "How do venue prices work?", a: "Each price is copied from that venue's own website or pricing PDF, with the date it was checked. If the venue does not publish a price, the card says so. Marketplace sites are not used." },
      { q: "What if my city is not listed?", a: "You still get the local venue-cost range from the wedding studies, and a link to suggest a venue. Curated cards start in a handful of metros." },
    ],
    explainerTitle: "How the venue finder chooses a number",
    explainer: [
      "When the site fee, food, service charge, and tax can each be labeled, the card shows that all-in total at 100 guests and says all-in. Otherwise it shows the published site fee and says site fee only. A venue with no published fee stays ask-the-venue. A range means the source lists more than one Saturday figure.",
      "Outside the seeded metros, the page shows the local venue benchmark from The Knot's national venue average scaled to that place. That benchmark is not a quote from a real venue.",
    ],
    body: `<section class="hero hero-tight">
  <div>
    <p class="kicker">Venue finder</p>
    <h1>Find a venue that fits the guest list</h1>
    <p class="hero-sub">Guests, a place, and a venue budget. A card says all-in when food, service, and tax are labeled with the site fee. Otherwise it says site fee only.</p>
  </div>
</section>
${finderShell("", cityGrid)}
<section class="card" id="venue-gap" hidden tabindex="-1">
  <p class="kicker">This city</p>
  <h2 data-gap-title>Cost results</h2>
  <p class="money-sm" data-gap-total></p>
  <p data-gap-copy>We don't have curated venues for this place yet.</p>
  <p data-gap-range></p>
  <div data-gap-near></div>
  <p><a class="btn" href="/list-your-venue">Know a venue? Suggest it</a></p>
</section>`,
  };
}

function metroPage(metro) {
  const list = venuesForMetro(metro.id);
  return {
    file: `venues/${metro.stateSlug}/${metro.slug}.html`,
    path: metroPath(metro),
    title: `Wedding Venues in ${metro.name}`,
    description: `Wedding venues in ${metro.label}. Filter by guests, budget, and vibe. Published prices are cited to each venue's site.`,
    script: "/js/venues.js",
    wide: true,
    schema: "collection",
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Venues", path: "/venues" },
      { name: metro.name, path: metroPath(metro) },
    ],
    faqs: [
      { q: `How much does a wedding venue cost in ${metro.name}?`, a: `The cards below use each venue's own published price when one exists. ${list.filter((venue) => venue.price.confidence === "published").length} of ${list.length} venues on this page had a public price when we checked.` },
    ],
    explainerTitle: `Venues in ${metro.name}`,
    explainer: [`This list is a starter set for ${metro.label}. A missing price means the venue's site did not publish one. It is not a guess.`],
    body: `<section class="hero hero-tight">
  <div>
    <p class="kicker">${escapeHtml(metro.label)}</p>
    <h1>Wedding venues in ${escapeHtml(metro.name)}</h1>
    <p class="hero-sub">${list.length} places. Filter by guests, budget, and vibe.</p>
  </div>
</section>
${finderShell(metro.id)}`,
  };
}

function finderShell(metroId, beforeResults = "") {
  const list = metroId ? venuesForMetro(metroId) : venues;
  const data = JSON.stringify(list.map(clientVenue)).replaceAll("<", "\\u003c");
  return `<form class="finder card stack" data-venue-app data-metro="${escapeHtml(metroId)}" id="venue-finder">
  <div class="loc" data-location>
    <label for="where">Where's the wedding?</label>
    <input id="where" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="where-list" placeholder="ZIP code or city">
    <ul id="where-list" class="suggestions" role="listbox" hidden></ul>
    <p class="loc-status" data-status role="status"></p>
  </div>
  <div class="form-grid two">
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
    <div>
      <label for="venue-budget">All-in venue budget <span class="hint">Optional</span></label>
      <p id="budget-readout" class="hint">Any budget</p>
      <div class="stepper">
        <input id="venue-budget" type="text" inputmode="numeric" placeholder="e.g. 20,000" autocomplete="off">
        <input id="venue-budget-range" type="range" min="0" max="100" step="1" value="0" aria-label="Venue budget">
      </div>
      <div class="choices" id="budget-chips">
        <button type="button" data-budget-chip="5000">$5k</button>
        <button type="button" data-budget-chip="10000">$10k</button>
        <button type="button" data-budget-chip="20000">$20k</button>
        <button type="button" data-budget-chip="0">Any</button>
      </div>
    </div>
  </div>
  <div>
    <label for="venue-sort">Sort</label>
    <select id="venue-sort">
      <option value="best">Best match for budget</option>
      <option value="price">Lowest price</option>
      <option value="capacity">Largest capacity</option>
      <option value="name">A–Z</option>
    </select>
  </div>
  <div>
    <p class="label" id="vibe-label">Vibe</p>
    <div class="choices" id="vibes" role="group" aria-labelledby="vibe-label">
      ${["garden", "historic", "waterfront", "estate", "resort", "art", "museum", "ballroom", "all-inclusive"].map((vibe) => `<button type="button" data-vibe="${vibe}" aria-pressed="false">${labelVibe(vibe)}</button>`).join("")}
    </div>
  </div>
  <details class="more-filters">
    <summary id="more-filters-label">More filters</summary>
    <div class="choices" id="more-filters">
      <button type="button" data-filter="indoor" aria-pressed="false">Indoor option</button>
      <button type="button" data-filter="outdoor" aria-pressed="false">Outdoor</button>
      <button type="button" data-filter="ceremony" aria-pressed="false">Ceremony on site</button>
      <button type="button" data-filter="rooms" aria-pressed="false">Guest rooms</button>
      <button type="button" data-filter="rain" aria-pressed="false">Rain plan</button>
      <button type="button" data-filter="access" aria-pressed="false">Accessible</button>
      <button type="button" data-filter="offday" aria-pressed="false">Off-day price listed</button>
    </div>
  </details>
</form>
${beforeResults}
<div id="venue-results" class="results-head" tabindex="-1">
  <h2 id="results-title">Venues</h2>
  <p id="result-count" aria-live="polite"></p>
  <div id="result-chips" class="chip-row"></div>
  <p class="no-print"><button type="button" class="text-btn" data-share>Copy link</button></p>
</div>
<div id="saved-compare" hidden></div>
<div id="venue-grid" class="venue-grid">${list.map((venue) => venueCard(venue)).join("")}</div>
<p id="capacity-note" class="hint" hidden></p>
<div id="venue-none" class="empty-note card" hidden>
  <p data-none-copy>No venues match these filters.</p>
  <button type="button" class="btn" id="loosen-filters">Loosen filters</button>
</div>
<script type="application/json" id="venue-data">${data}</script>`;
}

function venuePage(venue) {
  const metro = metroById(venue.metro);
  const quote = displayQuote(venue, 100);
  const priced = allInFor(venue, 100, quote.day === "off" ? "off" : "sat");
  const saturday = quoteVenue(venue, 100, "sat");
  const off = quoteVenue(venue, 100, "off");
  const path = venuePath(venue);
  return {
    file: `venues/${metro.stateSlug}/${metro.slug}/${venue.id}.html`,
    path,
    title: `${venue.name} Wedding Cost`,
    description: `${venue.name} in ${venue.city}. ${blurb(quote)} Checked ${venue.price.verifiedOn}.`,
    script: "/js/venue.js",
    wide: true,
    schema: "venue",
    venueName: venue.name,
    website: venue.website,
    address: venue.address,
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Venues", path: "/venues" },
      { name: metro.name, path: metroPath(metro) },
      { name: venue.name, path },
    ],
    faqs: [
      { q: `How much does ${venue.name} cost?`, a: venue.price.note },
      { q: `What is included at ${venue.name}?`, a: venue.included.join(" ") },
    ],
    explainerTitle: "Before you tour",
    explainer: [venue.price.note],
    body: `<article class="venue-page" data-venue-page>
  <div class="venue-hero">
    <div class="swatch swatch-${escapeHtml(venue.vibes[0] || "garden")} swatch-lg" aria-hidden="true">${swatchIcon(venue.vibes[0])}</div>
    <div>
      <p class="kicker">${escapeHtml(metro.name)} · ${escapeHtml(venue.city)}${venue.nearby ? " · Nearby, outside the metro" : ""}</p>
      <h1>${escapeHtml(venue.name)}</h1>
      <p class="chip-row">${venue.vibes.map((vibe) => `<span class="chip">${escapeHtml(labelVibe(vibe))}</span>`).join("")}</p>
      <p class="subhead">${escapeHtml(venue.address)}</p>
    </div>
  </div>
  <section class="summary-card card" id="quote">
    <div class="summary-top">
      <div>
        <p class="kicker" data-quote-label>${escapeHtml(priced.allInReady ? "All-in estimate" : quote.label)}</p>
        <p class="money" data-quote-total>${escapeHtml(priced.allInReady ? allInHeadline(priced) : headline(quote))}</p>
        <p class="subhead" data-quote-detail>At 100 guests, ${quote.day === "off" ? "a weekday" : "Saturday"}. ${escapeHtml(quote.note)}</p>
      </div>
      <div class="summary-actions no-print">
        <button type="button" class="btn" data-heart="${escapeHtml(venue.id)}" aria-pressed="false">Save</button>
        <a class="btn-ghost" data-budget href="/budget?loc=metro:${metro.id}&amp;g=100">Send to my budget</a>
      </div>
    </div>
    <div class="form-grid two">
      <div>
        <label for="guests">Guests</label>
        <div class="stepper" data-stepper>
          <div class="stepper-row">
            <button type="button" class="step" data-step="-10" aria-label="Ten fewer guests">−</button>
            <input id="guests" type="number" min="10" max="400" value="100">
            <button type="button" class="step" data-step="10" aria-label="Ten more guests">+</button>
          </div>
          <input type="range" min="10" max="400" value="100" aria-label="Guest count">
        </div>
      </div>
      <div>
        <p class="label">Day</p>
        <div class="choices">
          <button type="button" id="day-sat" data-day="sat" aria-pressed="true">Saturday</button>
          <button type="button" id="day-off" data-day="off" aria-pressed="false">Off day</button>
        </div>
      </div>
    </div>
    <div class="compare-bars" data-day-bars>
      ${dayBar("Saturday", saturday, barMax(saturday, off))}
      ${dayBar("Off day", off, barMax(saturday, off))}
    </div>
    <div>
      <p class="label">Season</p>
      <div class="choices">
        <button type="button" id="season-peak" data-season="peak" aria-pressed="true">Peak</button>
        <button type="button" id="season-off" data-season="off" aria-pressed="false">Off-peak</button>
      </div>
      <p class="hint">Peak and off-peak change the total only when this venue's price list has both.</p>
    </div>
    <p class="hint">Verified ${escapeHtml(venue.price.verifiedOn)} · ${escapeHtml(venue.price.confidence)} · <a href="${escapeHtml(venue.price.sourceUrl)}">Source</a></p>
    ${allInHtml(priced)}
  </section>
  <div class="split-2">
    <section class="card">
      <h2>What's included</h2>
      <ul class="check-list">${venue.included.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <h2>Not included</h2>
      <ul class="cross-list">${venue.notIncluded.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section class="card">
      <h2>Ask on the tour</h2>
      <ol class="question-list">${venue.questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      <p><a class="btn" href="${escapeHtml(venue.website)}">Venue website</a></p>
      <p class="hint">Capacity ${venue.capacity ? `${venue.capacity} guests` : "not published"}. ${escapeHtml(policyLine(venue))}</p>
    </section>
  </div>
  <script type="application/json" id="venue-record">${JSON.stringify(clientVenue(venue)).replaceAll("<", "\\u003c")}</script>
</article>`,
  };
}

function displayQuote(venue, guests) {
  const saturday = quoteVenue(venue, guests, "sat");
  if (saturday.status === "priced" || saturday.status === "range") return saturday;
  const off = quoteVenue(venue, guests, "off");
  if (off.status === "priced" || off.status === "range") return off;
  return saturday;
}

function venueCard(venue) {
  const quote = displayQuote(venue, 100);
  const priced = allInFor(venue, 100, "sat");
  const listed = listedPrice(venue, { result: priced });
  const priceText = listed.basis === "ask" ? headline(quote) : listed.text;
  const priceNote = listed.basis === "all-in"
    ? "All-in estimate at 100 guests"
    : listed.basis === "site"
      ? "Site fee only"
      : quote.label;
  const metro = metroById(venue.metro);
  return `<article class="venue-card card" data-venue-card data-id="${escapeHtml(venue.id)}" data-capacity="${venue.capacity || ""}" data-vibes="${escapeHtml(venue.vibes.join(" "))}" data-indoor="${venue.indoorOutdoor}" data-ceremony="${venue.ceremonyOnsite ? "1" : ""}" data-rooms="${venue.accommodations ? "1" : ""}" data-rain="${venue.rainPlan ? "1" : ""}" data-access="${venue.accessible ? "1" : ""}" data-offday="${venue.price.offday != null ? "1" : ""}">
  <a class="venue-card-link" href="${venuePath(venue)}">
    <span class="swatch swatch-${escapeHtml(venue.vibes[0] || "garden")}" aria-hidden="true">${swatchIcon(venue.vibes[0])}</span>
    <span class="venue-card-copy">
      <span class="kicker">${escapeHtml(venue.city)}${venue.nearby ? " · Nearby" : ""}</span>
      <h2>${escapeHtml(venue.name)}</h2>
      <span class="chip-row">${venue.vibes.slice(0, 2).map((vibe) => `<span class="chip">${escapeHtml(labelVibe(vibe))}</span>`).join("")}</span>
      <span class="venue-price" data-price>${escapeHtml(priceText)}</span>
      <span class="hint" data-price-note>${escapeHtml(priceNote)} · ${venue.capacity ? `Up to ${venue.capacity}` : "Capacity not published"} · ${escapeHtml(includedShort(venue))}</span>
    </span>
  </a>
  <button type="button" class="heart" data-heart="${escapeHtml(venue.id)}" aria-pressed="false" aria-label="Save ${escapeHtml(venue.name)}">♡</button>
  <a class="sr" href="/venues/${metro.stateSlug}/${metro.slug}">More in ${escapeHtml(metro.name)}</a>
</article>`;
}

export function venueLinksForState(abbr) {
  const list = venuesForState(abbr);
  if (!list.length) return `<p><a href="/venues">Venue finder</a> · <a href="/list-your-venue">Suggest a venue</a></p>`;
  const items = list.slice(0, 6).map((venue) => `<a href="${venuePath(venue)}">${escapeHtml(venue.name)}</a>`).join("");
  const metro = metroById(list[0].metro);
  return `<h2>Venues</h2><p class="chip-row">${items}</p><p><a class="btn" href="${metroPath(metro)}">See ${escapeHtml(metro.name)} venues</a></p>`;
}

function clientVenue(venue) {
  return {
    id: venue.id,
    name: venue.name,
    metro: venue.metro,
    city: venue.city,
    capacity: venue.capacity,
    vibes: venue.vibes,
    indoorOutdoor: venue.indoorOutdoor,
    ceremonyOnsite: venue.ceremonyOnsite,
    accommodations: venue.accommodations,
    accessible: venue.accessible,
    rainPlan: venue.rainPlan,
    nearby: Boolean(venue.nearby),
    price: venue.price,
    path: venuePath(venue),
  };
}

function headline(quote) {
  if (quote.status === "range") return `${money(quote.low)}–${money(quote.high)}`;
  if (quote.status === "priced" && quote.total != null) return money(quote.total);
  return "Pricing not published, ask the venue";
}

function blurb(quote) {
  if (quote.status === "priced") return `${quote.label}: ${money(quote.total)} at 100 guests on a Saturday.`;
  if (quote.status === "range") return `Published Saturday packages span ${money(quote.low)} to ${money(quote.high)}.`;
  return "Pricing not published, ask the venue.";
}

function barMax(a, b) {
  const value = (quote) => quote.total || quote.high || quote.low || 0;
  return Math.max(value(a), value(b), 1);
}

function dayBar(label, quote, max) {
  const text = quote.status === "priced" ? money(quote.total) : quote.status === "range" ? `${money(quote.low)}–${money(quote.high)}` : "Ask the venue";
  const amount = quote.total || quote.high || 0;
  const width = amount ? Math.min(100, Math.max(8, Math.round((amount / max) * 100))) : 0;
  return `<div class="bar-row"><span>${escapeHtml(label)}</span><span class="bar-track" aria-hidden="true"><span style="--w:${width}%"></span></span><strong>${escapeHtml(text)}</strong></div>`;
}

function includedShort(venue) {
  if (venue.price.includesFood) return "Package includes food";
  if (venue.price.kind === "unpublished") return "Ask what's included";
  if (venue.price.kind === "minimum") return "Event minimum, not a guest total";
  if (venue.price.kind === "range") return "Several packages on their PDF";
  return "Rental only, food extra";
}

function policyLine(venue) {
  const bits = [];
  if (venue.indoorOutdoor) bits.push(venue.indoorOutdoor === "both" ? "Indoor and outdoor" : venue.indoorOutdoor);
  if (venue.ceremonyOnsite) bits.push("ceremony on site");
  if (venue.catering) bits.push(`catering: ${venue.catering}`);
  if (venue.accommodations) bits.push("guest rooms");
  if (venue.rainPlan) bits.push("rain plan noted");
  if (venue.accessible) bits.push("accessibility noted by the venue");
  return bits.join(" · ");
}

function labelVibe(vibe) {
  if (vibe === "all-inclusive") return "All-inclusive";
  return vibe.charAt(0).toUpperCase() + vibe.slice(1);
}

function swatchIcon(vibe) {
  const common = `viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"`;
  if (vibe === "waterfront") return `<svg ${common} aria-hidden="true"><path d="M6 30c4 4 8 4 12 0s8-4 12 0 8 4 12 0"/><path d="M8 36c4 3 8 3 12 0s8-3 12 0 6 3 8 0"/><circle cx="34" cy="14" r="4"/></svg>`;
  if (vibe === "historic" || vibe === "estate") return `<svg ${common} aria-hidden="true"><path d="M8 40V22L24 10l16 12v18"/><path d="M20 40V28h8v12"/></svg>`;
  if (vibe === "art" || vibe === "museum") return `<svg ${common} aria-hidden="true"><rect x="10" y="14" width="28" height="20" rx="2"/><path d="M10 20h28M18 14v-4h12v4"/></svg>`;
  if (vibe === "resort" || vibe === "ballroom" || vibe === "all-inclusive") return `<svg ${common} aria-hidden="true"><path d="M8 34V18h32v16"/><path d="M8 26h32M16 18v-4h16v4"/></svg>`;
  return `<svg ${common} aria-hidden="true"><path d="M24 40V18"/><path d="M24 28c-8 0-12-6-12-12 6 0 12 4 12 12zM24 24c8-2 14-8 14-14-8 2-14 8-14 14z"/></svg>`;
}
