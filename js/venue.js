import { describe } from "./describe.js";
import { formatMoney } from "./format.js";
import { allIn } from "./price-engine.js";
import { allInHeadline, allInHtml, listedPrice } from "./price-present.js";
import { fitsCapacity, quoteVenue } from "./venue-quote.js";
import { bindGlobals, readShortlist, siteHref, toggleShortlist } from "./common.js";

bindGlobals();
const venue = JSON.parse(document.querySelector("#venue-record").textContent);
const guestsInput = document.querySelector("#guests");
const totalEl = document.querySelector("[data-quote-total]");
const labelEl = document.querySelector("[data-quote-label]");
const detailEl = document.querySelector("[data-quote-detail]");
const budgetLink = document.querySelector("[data-budget]");
const saturdayQuote = quoteVenue(venue, 100, "sat");
let day = saturdayQuote.status === "priced" || saturdayQuote.status === "range" ? "sat" : "off";
let season = "peak";
let pricing = null;
document.querySelectorAll("[data-day]").forEach((button) => {
  button.setAttribute("aria-pressed", button.dataset.day === day ? "true" : "false");
});

document.querySelectorAll("[data-day]").forEach((button) => {
  button.addEventListener("click", () => {
    day = button.dataset.day;
    document.querySelectorAll("[data-day]").forEach((other) => {
      other.setAttribute("aria-pressed", other === button ? "true" : "false");
    });
    render();
  });
});
document.querySelectorAll("[data-season]").forEach((button) => {
  button.addEventListener("click", () => {
    season = button.dataset.season;
    document.querySelectorAll("[data-season]").forEach((other) => {
      other.setAttribute("aria-pressed", other === button ? "true" : "false");
    });
    render();
  });
});
guestsInput.addEventListener("input", render);
loadPricing();
paintHeart();
render();

function render() {
  const guests = Number(guestsInput.value) || 100;
  const quote = quoteVenue(venue, guests, day);
  const over = venue.capacity && !fitsCapacity(venue, guests);
  const warn = over ? `Over capacity: the venue lists ${venue.capacity} guests, and this count is ${guests}. ` : "";
  let result = null;
  if (pricing) {
    const place = describe(`metro:${venue.metro}`, { geo: pricing.geo, costs: pricing.costs });
    result = allIn(venue, {
      guests,
      day,
      season,
      costs: pricing.costs,
      place,
      taxTable: pricing.taxTable,
      fees: pricing.fees,
    });
  }
  if (result && result.allInReady) {
    labelEl.textContent = "All-in estimate";
    totalEl.textContent = allInHeadline(result);
  } else {
    labelEl.textContent = quote.label;
    totalEl.textContent = quote.status === "priced"
      ? formatMoney(quote.total, { exact: true })
      : quote.status === "range"
        ? `${formatMoney(quote.low, { exact: true })}–${formatMoney(quote.high, { exact: true })}`
        : "Pricing not published, ask the venue";
  }
  const bits = [`${guests} guests`, day === "sat" ? "Saturday" : "Off day", season === "off" ? "off-peak" : "peak"];
  if (!result || !result.allInReady) {
    if (quote.tax) bits.push(`includes ${formatMoney(quote.tax, { exact: true })} tax`);
    if (quote.food) bits.push(`food from ${formatMoney(quote.food, { exact: true })}`);
    if (!quote.includesFood && quote.status === "priced" && quote.label !== "Published event minimum") bits.push("food is extra");
  }
  detailEl.textContent = `${warn}${bits.join(" · ")}. ${quote.note}`;
  const box = document.querySelector("[data-allin]");
  if (box && result) box.outerHTML = allInHtml(result);
  const listed = result
    ? listedPrice(venue, { result })
    : { basis: quote.status === "priced" || quote.status === "range" ? "site" : "ask", low: quote.total ?? quote.low ?? null, high: quote.total ?? quote.high ?? null };
  const params = new URLSearchParams({ loc: `metro:${venue.metro}`, g: String(guests), venueName: venue.name });
  if (listed.low != null) params.set("venueTotal", String(listed.low));
  if (listed.high != null && listed.high !== listed.low) params.set("venueHigh", String(listed.high));
  if (listed.basis !== "ask") params.set("venueBasis", listed.basis);
  budgetLink.href = siteHref(`/budget?${params.toString()}`);
}

function loadPricing() {
  const file = (name) => fetch(new URL(`../data/${name}`, import.meta.url)).then((response) => response.json());
  Promise.all([file("costs.json"), file("geo.json"), file("tax.json"), file("venue-fees.json")])
    .then(([costs, geo, taxTable, fees]) => {
      pricing = { costs, geo, taxTable, fees };
      render();
    })
    .catch(() => {});
}

function paintHeart() {
  const button = document.querySelector("[data-heart]");
  const on = readShortlist().includes(venue.id);
  button.setAttribute("aria-pressed", on ? "true" : "false");
  button.textContent = on ? "Saved" : "Save";
}

document.querySelector("[data-heart]").addEventListener("click", () => {
  toggleShortlist(venue.id);
  paintHeart();
});
