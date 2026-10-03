import { localCategoryRange, vendorAppPath, vendorListPath } from "./vendor-math.js";
import { formatMoney } from "./format.js";
import {
  bindGlobals, loadData, mountLocation, parseMoney, readShortlist, siteHref, storageGet, storageSet, toggleShortlist,
} from "./common.js";

bindGlobals();
const form = document.querySelector("#vendor-finder");
const lockedMetro = form?.dataset.metro || "";
const lockedCategory = form?.dataset.category || "";
const params = new URLSearchParams(location.search);
const guestsInput = document.querySelector("#guests");
const budgetInput = document.querySelector("#vendor-budget");
if (params.get("g")) guestsInput.value = params.get("g");
else guestsInput.value = String(storageGet("guests", 117) || 117);
const state = { place: null, styles: new Set(), category: params.get("cat") || lockedCategory || "" };

document.querySelectorAll("[data-style]").forEach((button) => {
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) state.styles.add(button.dataset.style);
    else state.styles.delete(button.dataset.style);
    paint();
  });
});
document.querySelectorAll("[data-cat]").forEach((button) => {
  if (state.category && button.dataset.cat === state.category) button.setAttribute("aria-pressed", "true");
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") === "true";
    document.querySelectorAll("[data-cat]").forEach((item) => item.setAttribute("aria-pressed", "false"));
    state.category = on ? "" : button.dataset.cat;
    if (!on) button.setAttribute("aria-pressed", "true");
    paint();
  });
});

let loaded = null;
loadData().then((data) => {
  loaded = data;
  const metros = data.vendorMetros || [];
  const initial = lockedMetro ? `metro:${lockedMetro}` : (params.get("loc") || storageGet("loc", ""));
  mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: initial,
    onChange(place) {
      state.place = place;
      const metro = metros.find((item) => item.id === place.metroId);
      if (!lockedMetro && metro && state.category) {
        location.assign(siteHref(`${vendorListPath(state.category, metro)}?g=${guestCount()}`));
        return;
      }
      if (lockedMetro && place.metroId && place.metroId !== lockedMetro) {
        const next = metros.find((item) => item.id === place.metroId);
        if (next && lockedCategory) {
          location.assign(siteHref(`${vendorListPath(lockedCategory, next)}?g=${guestCount()}`));
          return;
        }
      }
      paint();
    },
  });
  form?.addEventListener("input", paint);
  syncHearts();
  paint();
});

function guestCount() {
  return Math.min(400, Math.max(10, Math.round(Number(guestsInput.value) || 117)));
}

function paint() {
  if (!loaded || !state.place) return;
  storageSet("guests", guestCount());
  const budget = parseMoney(budgetInput.value);
  const cards = [...document.querySelectorAll("[data-vendor-card]")];
  let shown = 0;
  for (const card of cards) {
    const browse = !lockedMetro && (!state.place || state.place.id === "national");
    const metroOk = browse || card.dataset.metro === (lockedMetro || state.place.metroId);
    const catOk = !state.category || card.dataset.cat === state.category;
    const styles = (card.dataset.styles || "").split(" ").filter(Boolean);
    const styleOk = [...state.styles].every((style) => styles.includes(style));
    const guestOk = fitsGuests(card, guestCount());
    const budgetOk = fitsBudget(card, budget, guestCount());
    const hide = !(metroOk && catOk && styleOk && guestOk && budgetOk);
    card.classList.toggle("is-hidden", hide);
    if (!hide) shown += 1;
  }
  const gap = document.querySelector("#vendor-gap");
  const seeded = (loaded.vendorMetros || []).some((metro) => metro.id === state.place.metroId);
  const browse = !lockedMetro && (!state.place || state.place.id === "national");
  if (gap) {
    const showGap = !browse && state.place.id !== "national" && !seeded && !lockedMetro;
    gap.hidden = !showGap;
    if (showGap) {
      const cat = state.category || "catering";
      const range = localCategoryRange(state.place, guestCount(), loaded.costs, cat);
      gap.querySelector("[data-gap-title]").textContent = state.place.shortLabel;
      gap.querySelector("[data-gap-total]").textContent = formatMoney(range.amount, { exact: true });
      gap.querySelector("[data-gap-note]").textContent = range.note;
      const link = gap.querySelector("a");
      if (link) link.href = siteHref(`/suggest-a-vendor?cat=${cat}`);
    }
  }
  const grid = document.querySelector("#city-grid");
  if (grid) grid.hidden = !browse;
}

function fitsGuests(card, guests) {
  const min = Number(card.dataset.guestMin);
  const max = Number(card.dataset.guestMax);
  if (Number.isFinite(min) && min > 0 && guests < min) return false;
  if (Number.isFinite(max) && max > 0 && guests > max) return false;
  return true;
}

function fitsBudget(card, budget, guests) {
  if (budget == null || budget <= 0) return true;
  if (card.dataset.published !== "1") return true;
  let amount = Number(card.dataset.amount);
  if (!Number.isFinite(amount)) amount = Number(card.dataset.low);
  if (!Number.isFinite(amount)) return true;
  const unit = card.dataset.unit || "";
  if (/guest/i.test(unit)) amount *= guests;
  return amount <= budget;
}

function syncHearts() {
  const saved = new Set(readShortlist());
  document.querySelectorAll("[data-heart]").forEach((button) => {
    const on = saved.has(button.dataset.heart);
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.textContent = button.classList.contains("heart") && button.classList.contains("btn-ghost") ? (on ? "Saved" : "Save") : (on ? "♥" : "♡");
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      toggleShortlist(button.dataset.heart);
      syncHearts();
    });
  });
}

