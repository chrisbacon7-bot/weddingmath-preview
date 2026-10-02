import { venueBenchmarks } from "./estimate.js";
import { formatMoney } from "./format.js";
import { quoteVenue, fitsCapacity } from "./venue-quote.js";
import {
  bindGlobals, loadData, mountLocation, readShortlist, storageGet, toggleShortlist,
} from "./common.js";

bindGlobals();
const root = document.querySelector("[data-venue-app]");
const records = JSON.parse(document.querySelector("#venue-data").textContent);
const results = document.querySelector("#venue-results");
const none = document.querySelector("#venue-none");
const gap = document.querySelector("#venue-gap");
const guestsInput = document.querySelector("#guests");
const budgetInput = document.querySelector("#venue-budget");
const budgetRange = document.querySelector("#venue-budget-range");
const lockedMetro = root.dataset.metro || "";
let place = null;
let data = null;

const vibes = new Set();
document.querySelectorAll("[data-vibe]").forEach((button) => {
  button.addEventListener("click", () => {
    const vibe = button.dataset.vibe;
    if (vibes.has(vibe)) vibes.delete(vibe);
    else vibes.add(vibe);
    button.setAttribute("aria-pressed", vibes.has(vibe) ? "true" : "false");
    render();
  });
});
const filters = new Set();
document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.filter;
    if (filters.has(key)) filters.delete(key);
    else filters.add(key);
    button.setAttribute("aria-pressed", filters.has(key) ? "true" : "false");
    render();
  });
});

budgetRange.addEventListener("input", () => {
  budgetInput.value = budgetRange.value === "0" ? "" : budgetRange.value;
  render();
});
budgetInput.addEventListener("input", () => {
  budgetRange.value = budgetInput.value || "0";
  render();
});
guestsInput.addEventListener("input", render);

loadData().then((loaded) => {
  data = loaded;
  mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: lockedMetro ? `metro:${lockedMetro}` : (new URLSearchParams(location.search).get("loc") || storageGet("loc", "")),
    onChange(next) {
      place = next;
      render();
    },
  });
  paintHearts();
  render();
});

function render() {
  const guests = Number(guestsInput.value) || 100;
  const budget = Number(budgetInput.value) || 0;
  const metroId = lockedMetro || (place && place.metroId) || "";
  const seeded = records.some((venue) => venue.metro === metroId);
  if (gap) {
    const showGap = place && !seeded && !lockedMetro;
    gap.hidden = !showGap;
    if (showGap) fillGap(guests);
  }
  const cards = [...results.querySelectorAll("[data-venue-card]")];
  let shown = 0;
  const ranked = cards.map((card) => {
    const venue = records.find((item) => item.id === card.dataset.id);
    let quote = quoteVenue(venue, guests, "sat");
    if (quote.status !== "priced" && quote.status !== "range") {
      const off = quoteVenue(venue, guests, "off");
      if (off.status === "priced" || off.status === "range") quote = off;
    }
    const priceEl = card.querySelector("[data-price]");
    if (priceEl) {
      priceEl.textContent = quote.status === "priced"
        ? formatMoney(quote.total, { exact: true })
        : quote.status === "range"
          ? `${formatMoney(quote.low, { exact: true })}–${formatMoney(quote.high, { exact: true })}`
          : "Pricing not published";
    }
    return { card, venue, quote };
  });
  ranked.sort((a, b) => score(a, budget) - score(b, budget));
  for (const item of ranked) results.append(item.card);
  for (const { card, venue, quote } of ranked) {
    const metroOk = !metroId || venue.metro === metroId;
    const vibeOk = !vibes.size || venue.vibes.some((vibe) => vibes.has(vibe));
    const filterOk = passes(card);
    const amount = quote.total ?? quote.high ?? null;
    const budgetOk = !budget || amount == null || amount <= budget * 1.05;
    const visible = metroOk && vibeOk && filterOk && budgetOk && (seeded || lockedMetro || !place);
    card.style.order = fitsCapacity(venue, guests) ? "0" : "1";
    card.classList.toggle("is-hidden", !visible);
    if (visible) shown += 1;
  }
  if (none) none.hidden = shown !== 0;
}

function score(item, budget) {
  const amount = item.quote.total ?? item.quote.high ?? null;
  if (!budget || amount == null) return amount == null ? 1e12 : amount;
  return Math.abs(amount - budget);
}

function passes(card) {
  if (filters.has("indoor") && card.dataset.indoor === "outdoor") return false;
  if (filters.has("outdoor") && card.dataset.indoor === "indoor") return false;
  if (filters.has("ceremony") && !card.dataset.ceremony) return false;
  if (filters.has("rooms") && !card.dataset.rooms) return false;
  if (filters.has("rain") && !card.dataset.rain) return false;
  if (filters.has("access") && !card.dataset.access) return false;
  if (filters.has("offday") && !card.dataset.offday) return false;
  return true;
}

function fillGap(guests) {
  const copy = gap.querySelector("[data-gap-copy]");
  const range = gap.querySelector("[data-gap-range]");
  copy.textContent = `We don't have curated venues in ${place.shortLabel} yet.`;
  const benches = data ? venueBenchmarks(place, guests, data.costs) : [];
  if (!benches.length) {
    range.textContent = "The local venue range will show once the cost tables load. Suggest a venue you know.";
    return;
  }
  const bits = benches.map((bench) => `${bench.study}: ${formatMoney(bench.value)} (${bench.note})`);
  range.textContent = `A typical venue share here, not a real venue's price: ${bits.join(" ")}`;
}

function paintHearts() {
  const saved = new Set(readShortlist());
  document.querySelectorAll("[data-heart]").forEach((button) => {
    const on = saved.has(button.dataset.heart);
    button.setAttribute("aria-pressed", on ? "true" : "false");
    if (button.classList.contains("heart")) button.textContent = on ? "♥" : "♡";
  });
}

document.addEventListener("click", (event) => {
  const heart = event.target.closest("[data-heart]");
  if (!heart) return;
  toggleShortlist(heart.dataset.heart);
  paintHearts();
});
