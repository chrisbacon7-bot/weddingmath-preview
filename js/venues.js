import { categorySplit, planFor, venueBenchmarks, compareBudget } from "./estimate.js";
import { formatMoney, formatPlan } from "./format.js";
import { cityLine, nearestSeeded, venueAppPath } from "./place-nav.js";
import { describe } from "./describe.js";
import { listedPrice } from "./price-present.js";
import { quoteVenue, fitsCapacity } from "./venue-quote.js";
import { capacityBand, pageSlice, venueTypeLabel, venueTypeOf } from "./venue-types.js";
import {
  bindGlobals, clear, el, loadData,   mountLocation, readParams, readShortlist,
  siteHref, storageGet, storageSet, toggleShortlist, writeParams,
} from "./common.js";

const root = document.querySelector("[data-venue-app]");
const records = JSON.parse(document.querySelector("#venue-data").textContent);
const head = document.querySelector("#venue-results");
const title = document.querySelector("#results-title");
const chips = document.querySelector("#result-chips");
const grid = document.querySelector("#venue-grid");
const none = document.querySelector("#venue-none");
const noneCopy = document.querySelector("[data-none-copy]");
const gap = document.querySelector("#venue-gap");
const directory = document.querySelector("#city-grid");
const guestsInput = document.querySelector("#guests");
const budgetInput = document.querySelector("#venue-budget");
const budgetRange = document.querySelector("#venue-budget-range");
const lockedMetro = root.dataset.metro || "";
const params = readParams();
const initialGuests = params.get("g") || storageGet("guests", "") || "117";
guestsInput.value = String(initialGuests);
const guestRange = guestsInput.closest("[data-stepper]")?.querySelector('input[type="range"]');
if (guestRange) guestRange.value = String(initialGuests);
bindGlobals();
let place = null;
let data = null;
let booted = false;
let showOver = false;
let sortMode = params.get("sort") || "best";
let page = Number(params.get("p")) || 1;
const STOPS = [0, 5000, 10000, 20000, 40000, 80000];
const vibes = new Set();
const types = new Set();
const filters = new Set();

const initialBudget = params.get("b") || storageGet("budget", "");
if (initialBudget) {
  budgetInput.value = String(initialBudget);
  budgetRange.value = String(posFromMoney(initialBudget));
}
for (const vibe of (params.get("v") || "").split(",").filter(Boolean)) {
  vibes.add(vibe);
  document.querySelector(`[data-vibe="${vibe}"]`)?.setAttribute("aria-pressed", "true");
}
for (const key of (params.get("f") || "").split(",").filter(Boolean)) {
  filters.add(key);
  document.querySelector(`[data-filter="${key}"]`)?.setAttribute("aria-pressed", "true");
}
for (const type of (params.get("t") || "").split(",").filter(Boolean)) {
  types.add(type);
  document.querySelector(`[data-type="${type}"]`)?.setAttribute("aria-pressed", "true");
}
const sortInput = document.querySelector("#venue-sort");
if (sortInput) {
  sortInput.value = sortMode;
  sortInput.addEventListener("change", () => {
    sortMode = sortInput.value;
    page = 1;
    render();
  });
}
document.querySelectorAll("[data-budget-chip]").forEach((button) => {
  button.addEventListener("click", () => {
    const amount = Number(button.dataset.budgetChip);
    budgetInput.value = amount ? String(amount) : "";
    budgetRange.value = String(posFromMoney(amount));
    page = 1;
    render();
  });
});

document.querySelectorAll("[data-vibe]").forEach((button) => {
  button.addEventListener("click", () => {
    const vibe = button.dataset.vibe;
    if (vibes.has(vibe)) vibes.delete(vibe);
    else vibes.add(vibe);
    button.setAttribute("aria-pressed", vibes.has(vibe) ? "true" : "false");
    page = 1;
    render();
  });
});
document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.filter;
    if (filters.has(key)) filters.delete(key);
    else filters.add(key);
    button.setAttribute("aria-pressed", filters.has(key) ? "true" : "false");
    page = 1;
    render();
  });
});
document.querySelectorAll("[data-type]").forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.type;
    if (types.has(type)) types.delete(type);
    else types.add(type);
    button.setAttribute("aria-pressed", types.has(type) ? "true" : "false");
    page = 1;
    render();
  });
});

budgetRange.addEventListener("input", () => {
  const amount = moneyFromPos(budgetRange.value);
  budgetInput.value = amount ? String(amount) : "";
  page = 1;
  render();
});
budgetInput.addEventListener("input", () => {
  const amount = Number(String(budgetInput.value).replace(/[$,\s]/g, "")) || 0;
  budgetRange.value = String(posFromMoney(amount));
  page = 1;
  render();
});
guestsInput.addEventListener("input", () => {
  page = 1;
  render();
});
document.querySelector("#loosen-filters")?.addEventListener("click", loosen);

loadData().then((loaded) => {
  data = loaded;
  const metros = loaded.venueIndex?.metros || [];
  const loc = params.get("loc") || "";
  if (!lockedMetro && loc.startsWith("metro:")) {
    const id = loc.slice(6);
    if (metros.some((metro) => metro.id === id)) {
      location.replace(siteHref(venueAppPath({ id: loc, metroId: id }, guestCount(), budgetAmount(), metros)));
      return;
    }
  }
  mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: lockedMetro ? `metro:${lockedMetro}` : (params.get("loc") || storageGet("loc", "")),
    commitOnZip: true,
    commitOnEnter: true,
    onChange(next) {
      place = next;
      if (booted && leavesLocked(next)) {
        location.assign(siteHref(venueAppPath(next, guestCount(), budgetAmount(), metros)));
        return;
      }
      render();
    },
    onCommit(next) {
      if (!next) return;
      place = next;
      const seeded = Boolean(next.metroId && metros.some((metro) => metro.id === next.metroId));
      if ((seeded && next.metroId !== lockedMetro) || (!seeded && lockedMetro) || leavesLocked(next)) {
        location.assign(siteHref(venueAppPath(next, guestCount(), budgetAmount(), metros)));
        return;
      }
      render();
      focusResults(seeded);
    },
  });
  booted = true;
  paintHearts();
  render();
  if (location.hash === "#venue-results" || location.hash === "#venue-gap" || params.has("g") || params.has("loc")) {
    focusResults(!gap || gap.hidden);
  }
});

function leavesLocked(next) {
  if (!next || !lockedMetro || next.id === "national") return false;
  return next.metroId !== lockedMetro;
}

function guestCount() {
  const typed = Number(guestsInput.value);
  if (Number.isFinite(typed) && typed > 0) return Math.min(400, Math.max(10, Math.round(typed)));
  const stored = Number(storageGet("guests", 117));
  if (Number.isFinite(stored) && stored > 0) return Math.min(400, Math.max(10, Math.round(stored)));
  return 117;
}

function budgetAmount() {
  return Number(String(budgetInput.value).replace(/[$,\s]/g, "")) || 0;
}

function browsing() {
  return !lockedMetro && (!place || place.id === "national");
}

function withGuestQuery(href, guests, budget) {
  const hashAt = href.indexOf("#");
  const hash = hashAt >= 0 ? href.slice(hashAt) : "";
  const base = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const qAt = base.indexOf("?");
  const path = qAt >= 0 ? base.slice(0, qAt) : base;
  const params = new URLSearchParams(qAt >= 0 ? base.slice(qAt + 1) : "");
  params.set("g", String(guests));
  if (budget) params.set("b", String(budget));
  else params.delete("b");
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}${hash}`;
}

function render() {
  const guests = guestCount();
  const budget = budgetAmount();
  storageSet("guests", guests);
  const browse = browsing();
  const metroId = lockedMetro || (!browse && place && place.metroId) || "";
  const seeded = Boolean(metroId) && records.some((venue) => venue.metro === metroId);
  const showGap = Boolean(!browse && place && place.id !== "national" && !seeded && !lockedMetro && gap);
  if (gap) {
    gap.hidden = !showGap;
    if (showGap) fillGap(guests, budget);
  }
  if (directory) directory.hidden = showGap;
  if (grid) grid.hidden = showGap;
  writeParams({
    g: guests,
    b: budget || null,
    loc: lockedMetro ? null : (place && place.id !== "national" ? place.id : null),
    v: [...vibes].join(",") || null,
    t: [...types].join(",") || null,
    f: [...filters].join(",") || null,
    sort: sortMode && sortMode !== "best" ? sortMode : null,
    p: page > 1 ? page : null,
  });
  const readout = document.querySelector("#budget-readout");
  if (readout) readout.textContent = budget ? `Up to ${formatMoney(budget, { exact: true })}` : "Any budget";
  const more = document.querySelector("#more-filters-label");
  if (more) more.textContent = filters.size ? `More filters (${filters.size})` : "More filters";
  if (showGap && location.hash !== "#venue-gap") {
    history.replaceState(null, "", `${location.pathname}${location.search}#venue-gap`);
  } else if (!showGap && location.hash === "#venue-gap") {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
  paintHead(guests, budget, showGap);

  const ranked = records.map((venue) => {
    const fits = fitsCapacity(venue, guests);
    const listed = priceFor(venue, guests);
    return { venue, fits, listed };
  }).sort((a, b) => compareRank(a, b, budget, guests));
  const visibleRows = ranked.filter(({ venue, listed, fits }) => {
    const metroOk = !metroId || venue.metro === metroId;
    const amount = listed.ceiling;
    const budgetOk = !budget || amount == null || amount <= budget * 1.05;
    return !showGap && metroOk && venueMatches(venue) && budgetOk && (fits || showOver);
  });
  const sliced = pageSlice(visibleRows, page);
  page = sliced.page;
  writeParams({
    g: guests,
    b: budget || null,
    loc: lockedMetro ? null : (place && place.id !== "national" ? place.id : null),
    v: [...vibes].join(",") || null,
    t: [...types].join(",") || null,
    f: [...filters].join(",") || null,
    sort: sortMode && sortMode !== "best" ? sortMode : null,
    p: page > 1 ? page : null,
  });
  clear(grid);
  for (const row of sliced.items) grid.append(buildCard(row, guests, budget));
  paintPager(sliced.page, sliced.pages, visibleRows.length);
  paintHearts();
  const shown = visibleRows.length;
  const tight = ranked.filter(({ venue, fits }) => venue && !fits && (!metroId || venue.metro === metroId) && venueMatches(venue)).length;
  const note = document.querySelector("#capacity-note");
  if (note) {
    note.hidden = showGap || tight === 0;
    note.textContent = "";
    if (!note.hidden) {
      note.append(document.createTextNode(`${tight} ${tight === 1 ? "venue holds" : "venues hold"} fewer than ${guests} guests and ${showOver ? "are marked over capacity." : "are hidden."} `));
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "text-btn";
      toggle.textContent = showOver ? "Hide smaller venues" : "Show smaller venues";
      toggle.addEventListener("click", () => {
        showOver = !showOver;
        render();
      });
      note.append(toggle);
    }
  }
  const count = document.querySelector("#result-count");
  if (count && !showGap) {
    const where = place && place.id !== "national" ? cityLine(place) : (lockedMetro ? "this city" : "all cities");
    const vibeLabel = vibes.size === 1 ? labelVibe([...vibes][0]) : "";
    const vibeCount = vibeLabel ? ranked.filter(({ venue }) => venue.vibes.some((vibe) => vibes.has(vibe)) && (!metroId || venue.metro === metroId)).length : 0;
    const within = budget ? ranked.filter(({ listed, venue }) => {
      return listed.ceiling != null && listed.ceiling <= budget && (!metroId || venue.metro === metroId);
    }).length : 0;
    const bits = [`${shown} venues in ${where}`];
    if (vibeLabel) bits.push(`${vibeCount} match ${vibeLabel}`);
    if (budget) bits.push(`${within} within ${formatMoney(budget, { exact: true })}`);
    count.textContent = bits.join(" · ");
  } else if (count) count.textContent = "";
  document.querySelectorAll("#city-grid a").forEach((link) => {
    if (!link.dataset.base) link.dataset.base = link.getAttribute("href");
    link.setAttribute("href", withGuestQuery(link.dataset.base, guests, budget));
  });
  paintSaved(guests);
  if (none) {
    none.hidden = showGap || shown !== 0;
    if (noneCopy) {
      const where = place ? cityLine(place) : "this list";
      noneCopy.textContent = shown === 0
        ? `No venues in ${where} match these filters.`
        : "";
    }
  }
}

function paintHead(guests, budget, showGap) {
  if (!title || !chips) return;
  const where = place ? cityLine(place) : (lockedMetro ? "this city" : "");
  const budgetText = budget ? formatMoney(budget, { exact: true }) : "";
  if (showGap && where) {
    title.textContent = budgetText
      ? `Cost results for ${where} for ${guests} guests under ${budgetText}`
      : `Cost results for ${where} for ${guests} guests`;
  } else if (where && place && place.id !== "national") {
    title.textContent = budgetText
      ? `Venues in ${where} for ${guests} guests under ${budgetText}`
      : `Venues in ${where} for ${guests} guests`;
  } else if (lockedMetro && place) {
    title.textContent = budgetText
      ? `Venues in ${cityLine(place)} for ${guests} guests under ${budgetText}`
      : `Venues in ${cityLine(place)} for ${guests} guests`;
  } else {
    title.textContent = budgetText
      ? `Venues for ${guests} guests under ${budgetText}`
      : `Venues for ${guests} guests`;
  }
  clear(chips);
  if (place && place.id !== "national") chips.append(chip(`${cityLine(place)} ×`, () => focusField("#where")));
  chips.append(chip(`${guests} guests ×`, () => focusField("#guests")));
  chips.append(chip(budgetText ? `Under ${budgetText} ×` : "Any budget ×", () => focusField("#venue-budget")));
  for (const type of types) {
    chips.append(chip(`${venueTypeLabel(type) || type} ×`, () => {
      types.delete(type);
      document.querySelector(`[data-type="${type}"]`)?.setAttribute("aria-pressed", "false");
      page = 1;
      render();
    }));
  }
  for (const vibe of vibes) {
    chips.append(chip(`${labelVibe(vibe)} ×`, () => {
      vibes.delete(vibe);
      document.querySelector(`[data-vibe="${vibe}"]`)?.setAttribute("aria-pressed", "false");
      render();
    }));
  }
  for (const key of filters) {
    chips.append(chip(`${filterLabel(key)} ×`, () => {
      filters.delete(key);
      document.querySelector(`[data-filter="${key}"]`)?.setAttribute("aria-pressed", "false");
      render();
    }));
  }
  if (vibes.size || types.size || filters.size || budget) {
    chips.append(chip("Clear all", loosen));
  }
}

function chip(text, onClick) {
  const button = el("button", { type: "button", class: "chip chip-btn", text });
  button.addEventListener("click", onClick);
  return button;
}

function focusField(selector) {
  const field = document.querySelector(selector);
  if (!field) return;
  field.focus();
  field.scrollIntoView({ block: "center" });
}

function loosen() {
  vibes.clear();
  types.clear();
  filters.clear();
  page = 1;
  document.querySelectorAll("[data-vibe], [data-type], [data-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
  budgetInput.value = "";
  budgetRange.value = "0";
  render();
  head?.focus();
}

function focusResults(seeded) {
  const node = seeded === false && gap && !gap.hidden ? gap : head;
  if (!node) return;
  node.focus({ preventScroll: true });
  node.scrollIntoView({ block: "start" });
}

function priceFor(venue, guests) {
  return listedPrice(venue, {
    guests,
    day: "sat",
    season: "peak",
    costs: data && data.costs,
    place: data ? describe(`metro:${venue.metro}`, data.ctx) : null,
    taxTable: data && data.taxTable,
    fees: data && data.fees,
  });
}

function score(item, budget) {
  const amount = item.listed.ceiling;
  if (!budget || amount == null) return amount == null ? 1e12 : amount;
  return Math.abs(amount - budget);
}

function compareRank(a, b, budget, guests) {
  if (sortMode === "name") return a.venue.name.localeCompare(b.venue.name);
  if (sortMode === "capacity") return (b.venue.capacity || 0) - (a.venue.capacity || 0);
  if (sortMode === "price") {
    const left = a.listed.sort ?? 1e12;
    const right = b.listed.sort ?? 1e12;
    return left - right;
  }
  const fitOrder = Number(a.fits) === Number(b.fits) ? 0 : a.fits ? -1 : 1;
  if (fitOrder) return fitOrder;
  return score(a, budget) - score(b, budget) || (b.venue.capacity || 0) - (a.venue.capacity || 0);
}

function fitBadge(listed, guests, budget, fits) {
  const parts = [];
  parts.push(fits ? `Fits ${guests}` : "Over capacity");
  if (listed.basis === "all-in") parts.push("all-in");
  else if (listed.basis === "site") parts.push("site fee only");
  const amount = listed.ceiling;
  if (budget && amount != null) {
    const gap = Math.round(budget - amount);
    parts.push(gap >= 0 ? `${formatMoney(gap, { exact: true })} under` : `${formatMoney(-gap, { exact: true })} over`);
  }
  return parts.join(" · ");
}

function typicalVenueLine(guests) {
  if (!data || !place) return "";
  const benches = venueBenchmarks(place, guests, data.costs);
  const bench = benches.find((item) => item.study === "The Knot") || benches[0];
  if (!bench) return "";
  return `Typical ${place.shortLabel} venue for ${guests}: ~${formatMoney(bench.value)} (${bench.study}, scaled)`;
}

function foodEstimate(guests) {
  if (!data || !place) return "";
  const plan = planFor(place, guests, data.costs);
  const split = categorySplit(plan, data.costs);
  const food = split.lines.filter((line) => line.id === "catering" || line.id === "alcohol").reduce((sum, line) => sum + line.amount, 0);
  if (!food) return "";
  return `+ food & drinks ~${formatMoney(food)} at ${plan.guests} guests (local split, estimated)`;
}

function moneyFromPos(pos) {
  const scaled = (Number(pos) / 100) * (STOPS.length - 1);
  const index = Math.min(STOPS.length - 2, Math.max(0, Math.floor(scaled)));
  const frac = scaled - index;
  return Math.round((STOPS[index] + (STOPS[index + 1] - STOPS[index]) * frac) / 500) * 500;
}

function posFromMoney(money) {
  const value = Number(money) || 0;
  if (value <= 0) return 0;
  for (let index = 0; index < STOPS.length - 1; index += 1) {
    if (value <= STOPS[index + 1]) {
      const frac = (value - STOPS[index]) / (STOPS[index + 1] - STOPS[index]);
      return Math.round(((index + frac) / (STOPS.length - 1)) * 100);
    }
  }
  return 100;
}

function filterLabel(key) {
  return ({
    "cap-75": "Holds up to 75",
    "cap-200": "Holds 76–200",
    "cap-201": "Holds 201 or more",
    indoor: "Indoor option",
    outdoor: "Outdoor",
    ceremony: "Ceremony on site",
    rooms: "Guest rooms",
    rain: "Rain plan",
    access: "Accessible",
    offday: "Off-day price listed",
  })[key] || key;
}

function venueMatches(venue) {
  if (types.size && !types.has(venueTypeOf(venue))) return false;
  if (vibes.size && !venue.vibes.some((vibe) => vibes.has(vibe))) return false;
  const caps = [...filters].filter((key) => key.startsWith("cap-"));
  if (caps.length && !caps.some((key) => capacityBand(venue, key))) return false;
  if (filters.has("indoor") && venue.indoorOutdoor === "outdoor") return false;
  if (filters.has("outdoor") && venue.indoorOutdoor === "indoor") return false;
  if (filters.has("ceremony") && !venue.ceremonyOnsite) return false;
  if (filters.has("rooms") && !venue.accommodations) return false;
  if (filters.has("rain") && !venue.rainPlan) return false;
  if (filters.has("access") && !venue.accessible) return false;
  if (filters.has("offday") && venue.price.offday == null && venue.price.offLow == null && venue.price.offHigh == null) return false;
  return true;
}

function buildCard({ venue, listed, fits }, guests, budget) {
  const metro = (data && data.venueIndex && data.venueIndex.metros || []).find((item) => item.id === venue.metro);
  const typeLabel = venueTypeLabel(venueTypeOf(venue));
  const published = listed.basis !== "ask";
  const figure = published
    ? (fits || !venue.capacity ? listed.text : `${listed.text} · over ${venue.capacity} guests`)
    : (typicalVenueLine(guests) || "Ask for pricing");
  const kind = listed.basis === "all-in"
    ? `All-in estimate at ${guests} guests`
    : listed.basis === "site"
      ? `Site fee only at ${guests} guests`
      : "Pricing not published";
  const quote = quoteVenue(venue, guests, "sat");
  const copy = [
    el("span", { class: "kicker", text: `${venue.city || ""}${venue.nearby ? " · Nearby" : ""}` }),
    el("h2", { text: venue.name }),
    el("span", { class: "chip-row" }, [
      typeLabel ? el("span", { class: "chip", text: typeLabel }) : null,
      venue.vibes[0] ? el("span", { class: "chip", text: labelVibe(venue.vibes[0]) }) : null,
    ]),
    el("span", { class: published ? "venue-price" : "venue-price price-muted", "data-price": "1", text: figure }),
    el("span", { class: "hint", "data-price-note": "1", text: `${kind} · ${venue.capacity ? `Up to ${venue.capacity}` : "Capacity not published"}` }),
  ];
  if (!published) copy.push(el("span", { class: "hint price-muted", "data-unpriced": "1", text: "Pricing not published" }));
  if (listed.basis === "site" && quote.includesFood === false) {
    const food = foodEstimate(guests);
    if (food) copy.push(el("span", { class: "hint", "data-food-note": "1", text: food }));
  }
  copy.push(el("span", { class: `fit-badge ${fits ? "fits" : "over"}`, "data-fit": "1", text: fitBadge(listed, guests, budget, fits) }));
  const card = el("article", {
    class: `venue-card card${fits ? "" : " is-tight"}`,
    "data-venue-card": "1",
    "data-id": venue.id,
  }, [
    el("a", { class: "venue-card-link", href: siteHref(venue.path) }, [
      el("span", { class: `swatch swatch-${venue.vibes[0] || "garden"}`, "aria-hidden": "true" }),
      el("span", { class: "venue-card-copy" }, copy),
    ]),
    el("button", { type: "button", class: "heart", "data-heart": venue.id, "aria-pressed": "false", "aria-label": `Save ${venue.name}`, text: "♡" }),
  ]);
  if (metro) card.append(el("a", { class: "sr", href: siteHref(`/venues/${metro.stateSlug}/${metro.slug}`), text: `More in ${metro.name}` }));
  return card;
}

function paintPager(current, pages, total) {
  const box = document.querySelector("#venue-pager");
  if (!box) return;
  clear(box);
  if (pages <= 1) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const prev = el("button", { type: "button", class: "btn-ghost", text: "Previous page", disabled: current <= 1 });
  prev.addEventListener("click", () => {
    page = current - 1;
    render();
    head?.focus();
  });
  const next = el("button", { type: "button", class: "btn-ghost", text: "Next page", disabled: current >= pages });
  next.addEventListener("click", () => {
    page = current + 1;
    render();
    head?.focus();
  });
  box.append(prev);
  box.append(el("p", { text: `Page ${current} of ${pages} · ${total} venues` }));
  box.append(next);
}

function paintSaved(guests) {
  const box = document.querySelector("#saved-compare");
  if (!box) return;
  const saved = readShortlist().map((id) => records.find((venue) => venue.id === id)).filter(Boolean);
  if (saved.length < 2) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  clear(box);
  const prices = saved.map((venue) => priceFor(venue, guests).sort).filter((amount) => amount != null);
  const best = prices.length ? Math.min(...prices) : null;
  box.append(el("h2", { text: `Compare ${saved.length} saved` }));
  const table = el("table", { class: "split-table" });
  table.append(el("thead", {}, [el("tr", {}, ["Venue", "Price", "Off day", "Capacity", "Ceremony", "Rooms", "Rain plan", "Access"].map((label) => el("th", { text: label })))]));
  const body = el("tbody");
  saved.forEach((venue) => {
    const listed = priceFor(venue, guests);
    const offListed = listedPrice(venue, {
      guests,
      day: "off",
      season: "peak",
      costs: data && data.costs,
      place: data ? describe(`metro:${venue.metro}`, data.ctx) : null,
      taxTable: data && data.taxTable,
      fees: data && data.fees,
    });
    const winner = best != null && listed.sort === best;
    body.append(el("tr", { class: winner ? "winner" : "" }, [
      el("td", { text: venue.name }),
      el("td", { text: listed.text }),
      el("td", { text: offListed.text }),
      el("td", { text: venue.capacity ? String(venue.capacity) : "—" }),
      el("td", { text: venue.ceremonyOnsite ? "Yes" : "No" }),
      el("td", { text: venue.accommodations ? "Yes" : "No" }),
      el("td", { text: venue.rainPlan ? "Yes" : "No" }),
      el("td", { text: venue.accessible ? "Yes" : "No" }),
    ]));
  });
  table.append(body);
  box.append(table);
  box.append(el("p", {}, [el("a", { href: siteHref(`/shortlist?g=${guests}`), text: "Open the shortlist" })]));
}

function fillGap(guests, budget) {
  const where = cityLine(place);
  const titleEl = gap.querySelector("[data-gap-title]");
  const totalEl = gap.querySelector("[data-gap-total]");
  const copy = gap.querySelector("[data-gap-copy]");
  const range = gap.querySelector("[data-gap-range]");
  const near = gap.querySelector("[data-gap-near]");
  if (titleEl) titleEl.textContent = `Local totals for ${where}`;
  if (copy) copy.textContent = `We don't have a curated venue list for ${where} yet. These figures are the local wedding studies, not a quote from a venue.`;
  if (!data) return;
  const plan = planFor(place, guests, data.costs);
  if (totalEl) totalEl.textContent = formatPlan(plan);
  const fit = budget ? compareBudget(plan, budget) : null;
  const benches = venueBenchmarks(place, guests, data.costs);
  const bits = benches.map((bench) => `${bench.study} venue share ${formatMoney(bench.value)} (${bench.note})`);
  if (range) {
    const lead = bits.length
      ? `Venue cost range for ${where}: ${bits.join(" ")}`
      : `A venue cost range for ${where} will show once the cost tables load.`;
    range.textContent = fit ? `${lead} ${fit.text}` : lead;
  }
  if (near) {
    clear(near);
    const metros = nearestSeeded(place, data.venueIndex?.metros || [], data.geo);
    if (metros.length) {
      near.append(el("h3", { text: "Nearest cities with venue lists" }));
      const list = el("div", { class: "near-list" });
      for (const metro of metros) {
        list.append(el("a", {
          href: siteHref(venueAppPath({ metroId: metro.id, id: `metro:${metro.id}` }, guests, budget, data.venueIndex.metros)),
          text: `${metro.name}, ${metro.state}`,
        }));
      }
      near.append(list);
    }
  }
}

function labelVibe(vibe) {
  if (vibe === "all-inclusive") return "All-inclusive";
  return vibe.charAt(0).toUpperCase() + vibe.slice(1);
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
