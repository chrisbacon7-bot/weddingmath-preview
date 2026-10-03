import { categorySplit, compareBudget, guestCountNote, planFor, venueBenchmarks } from "./estimate.js";
import { marginalPerGuest, outsideStudy, serviceOnFoodAndPlace, verdictFix } from "./present.js";
import {
  bindGlobals, clear, el, emptyNote, formatMoney, formatPlan, loadData,
  mountLocation, parseMoney, readParams, registerSummary, renderMethod, renderReferences, savePlan, setPrintSummary, setSticky,
  siteHref, storageGet, storageSet, track, writeParams,
} from "./common.js";
import { bigResult, copySummaryButton, embedSnippet, means, nextStep, presetBar, sourceStrip, summaryText, verdictView } from "./ui.js";
import { lowerFirst } from "./format.js";
import { venueAppPath } from "./place-nav.js";

const params = readParams();
const state = {
  place: null,
  guests: Number(params.get("g") || storageGet("guests", 117)),
  budget: params.get("b") || storageGet("budget", "") || "",
};

bindGlobals();

const form = document.querySelector("#cost-form");
const guestsInput = document.querySelector("#guests");
const budgetInput = document.querySelector("#budget");
const cutInput = document.querySelector("#cut");
const out = document.querySelector("#out");
guestsInput.value = state.guests;
if (state.budget) budgetInput.value = state.budget;

let locationApi = null;
let loaded = null;
let dataReady = null;

document.querySelectorAll("[data-find-venues]").forEach((node) => {
  node.addEventListener("click", async (event) => {
    event.preventDefault();
    if (!loaded && dataReady) await dataReady;
    const picked = locationApi ? await locationApi.commit({ go: false }) : null;
    const typed = Number(guestsInput.value);
    const guests = Number.isFinite(typed) && typed > 0
      ? Math.min(400, Math.max(10, Math.round(typed)))
      : Math.min(400, Math.max(10, Math.round(Number(state.guests)) || 117));
    const budget = parseMoney(budgetInput.value);
    storageSet("guests", guests);
    storageSet("budget", budget == null || budget <= 0 ? "" : String(budget));
    const place = picked || state.place;
    const metros = loaded && loaded.venueIndex && loaded.venueIndex.metros;
    location.assign(siteHref(venueAppPath(place, guests, budget && budget > 0 ? budget : "", metros || [])));
  });
});

dataReady = loadData().then(async (data) => {
  loaded = data;
  locationApi = mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  const presets = await fetch(new URL("../data/presets.json", import.meta.url)).then((response) => response.json()).catch(() => ({ home: [] }));
  document.querySelector("#home-presets")?.append(presetBar(presets.home || [], (preset) => {
    guestsInput.value = String(preset.guests);
    if (preset.budget) budgetInput.value = String(preset.budget);
    locationApi.choose(preset.loc, preset.loc === "national" ? "US average" : preset.label);
  }));
  form.addEventListener("input", () => render(data));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await locationApi.commit({ go: false });
    render(data);
    document.querySelector("#result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  render(data);
}).catch(() => {
  clear(out);
  out.append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function render(data) {
  const rawGuests = guestsInput.value.trim();
  const typedGuests = rawGuests === "" ? NaN : Number(rawGuests);
  state.guests = Number.isFinite(typedGuests) ? typedGuests : 117;
  const budgetNumber = parseMoney(budgetInput.value);
  state.budget = budgetInput.value.trim();
  const storedGuests = Math.min(400, Math.max(10, Number.isFinite(typedGuests) ? Math.round(typedGuests) : 117));
  storageSet("guests", storedGuests);
  storageSet("budget", budgetNumber == null || budgetNumber <= 0 ? "" : String(budgetNumber));
  writeParams({
    loc: state.place ? state.place.id : null,
    g: state.guests,
    b: budgetNumber != null && budgetNumber > 0 ? budgetNumber : null,
  });
  const guestNote = document.querySelector("#guest-note");
  clear(out);
  if (!state.place) {
    if (guestNote) guestNote.textContent = guestsInput.dataset.clampedNote || guestCountNote(typedGuests, storedGuests);
    out.append(emptyNote("Add a ZIP, a city, or choose Not sure yet. You'll get a number right here."));
    setSticky("");
    const band = document.querySelector("#math-band");
    if (band) band.hidden = true;
    return;
  }
  const plan = planFor(state.place, state.guests, data.costs);
  const countNote = guestsInput.dataset.clampedNote || guestCountNote(typedGuests, plan.guests);
  if (guestNote) guestNote.textContent = countNote;
  const moneyBudget = budgetNumber != null && budgetNumber > 0 ? budgetNumber : null;
  const fit = moneyBudget ? compareBudget(plan, moneyBudget) : null;
  const headline = plan.kind === "range" ? plan.planningTotal : plan.value;
  const perGuest = headline / plan.guests;
  const askedCut = Number(cutInput?.value);
  const maxCut = Math.max(0, plan.guests - 10);
  const cutBy = maxCut === 0 ? 0 : Math.min(maxCut, Math.max(1, Number.isFinite(askedCut) ? askedCut : 10));
  const marginal = cutBy ? marginalPerGuest(state.place, plan.guests, cutBy, data.costs) : null;
  const cutSave = marginal
    ? (marginal.value != null ? marginal.value * marginal.guests : null)
    : null;
  const cutText = !marginal
    ? "At 10 guests there's no one left to cut."
    : marginal.value != null
      ? `Cutting ${marginal.guests} guests saves ${lowerFirst(formatPlan({ kind: "point", value: cutSave, exact: false }))}.`
      : `Cutting ${marginal.guests} guests saves ${lowerFirst(formatPlan({ kind: "range", low: marginal.low * marginal.guests, high: marginal.high * marginal.guests }))}.`;
  const outside = outsideStudy(data.costs);
  const split = categorySplit(plan, data.costs);
  const plus = serviceOnFoodAndPlace(split, data.costs);
  const onTop = headline ? Math.round((outside.total / headline) * 100) : 0;
  const totalText = formatPlan(plan);
  const cards = bigResult([
    { role: "main", kicker: plan.estimated ? "Estimated range" : "All-in estimate", money: totalText, note: `${plan.guests} guests · ${state.place.shortLabel}` },
    { role: "plain", kicker: "Per guest", money: formatMoney(perGuest), note: "The whole wedding, divided by the guest count." },
    { role: "gap", kicker: "Not in that number", money: `+${formatMoney(outside.total, { exact: true })}`, note: `+${onTop}% on top. Knot averages for rings, the rehearsal dinner, and the honeymoon. Plus-plus on food and the place is often another ${formatMoney(plus.low)}–${formatMoney(plus.high)} (Zola's ${plus.lowPct}–${plus.highPct}%).` },
  ]);
  const mainMoney = cards.querySelector(".big-card.main .money-sm");
  if (mainMoney) mainMoney.dataset.total = "1";
  const result = el("section", { class: "result", id: "result" }, [
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
    cards,
    countNote ? el("p", { class: "hint", text: countNote }) : null,
    verdictView(fit, fit ? verdictFix(state.place, plan, moneyBudget, data.costs) : ""),
    el("p", { text: cutText }),
    means(`${totalText} is the planning figure for ${plan.guests} guests in ${state.place.shortLabel}. Per guest is that figure divided by the guest count. The third card is spending The Knot publishes outside the wedding total.`),
    renderReferences(plan),
    el("p", { class: "hint", text: "These studies measure different weddings. Both stay on the page. They are not averaged." }),
    sourceStrip(),
    el("div", { class: "inline-actions no-print" }, [
      copySummaryButton(() => summaryText("Wedding cost", [
        `${state.place.shortLabel} · ${plan.guests} guests`,
        totalText,
        fit ? fit.text : "No budget typed.",
        cutText,
      ])),
      el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
      el("button", { class: "text-btn", type: "button", "data-print": "1", text: "Print / Save PDF" }),
    ]),
    el("p", { class: "hint", "data-copy-status": "1", "aria-live": "polite" }),
    nextStep(budgetHref(plan), `Split this ${formatMoney(Math.round(headline), { exact: true })}`),
    renderMethod(plan),
    embedSnippet("/"),
  ]);
  out.append(result);
  paintMath(plan, outside, plus, data);
  paintTeasers(plan, data);
  setPrintSummary(`${state.place.shortLabel} · ${plan.guests} guests · ${state.budget ? `budget ${state.budget}` : "no budget typed"}`);
  registerSummary(() => summaryText("Wedding cost", [totalText, `${plan.guests} guests in ${state.place.shortLabel}`]));
  setSticky(totalText, { kicker: plan.estimated ? "Estimated range" : "All-in estimate", label: "See my total" });
  savePlan({
    loc: state.place.id,
    label: state.place.label,
    guests: plan.guests,
    total: Math.round(plan.planningTotal),
    kind: plan.kind,
    value: plan.value,
    low: plan.low,
    high: plan.high,
    lines: split.lines.map((line) => ({ id: line.id, label: line.label, amount: line.amount })),
  });
  track("calc_complete", { tool: "home", tier: state.place.tier });
}

function paintMath(plan, outside, plus, data) {
  const band = document.querySelector("#math-band");
  if (!band) return;
  band.hidden = false;
  const benches = venueBenchmarks(state.place, plan.guests, data.costs);
  const venue = benches[0];
  const headline = plan.kind === "range" ? plan.planningTotal : plan.value;
  clear(band);
  band.append(
    el("h2", { text: "See the math" }),
    el("p", { text: `${venue ? `Venue share you'll see in the studies ${formatMoney(venue.value)}` : "Venue share"} → All-in ${formatPlan(plan)} → What couples often add later +${formatMoney(outside.total, { exact: true })}.` }),
    el("p", { class: "hint", text: `Plus-plus on the food and place lines in this split runs about ${formatMoney(plus.low)}–${formatMoney(plus.high)}. That is Zola's ${plus.lowPct}–${plus.highPct}% service-charge range, not a tax.` }),
    el("p", {}, [el("a", { class: "btn", href: budgetHref(plan), text: `Split ${formatMoney(Math.round(headline), { exact: true })}` })]),
  );
}

function paintTeasers(plan, data) {
  const per = (plan.kind === "range" ? plan.planningTotal : plan.value) / plan.guests;
  const where = state.place.shortLabel;
  const set = (key, text) => {
    const node = document.querySelector(`[data-teaser="${key}"]`);
    if (node) node.textContent = text;
  };
  set("per-guest", `Cost per guest — ${formatMoney(per)} in ${where}.`);
  set("budget", `Split ${formatMoney(Math.round(plan.planningTotal), { exact: true })} for ${plan.guests} guests.`);
  const budget = parseMoney(budgetInput.value);
  if (budget && budget > 0) {
    set("reverse", `What we can afford — a ${formatMoney(budget, { exact: true })} total is ready to turn into a guest count.`);
  }
  set("venues", `Find venues for ${plan.guests} guests in ${where}.`);
  const budgetNow = parseMoney(budgetInput.value);
  const venueHref = siteHref(venueAppPath(state.place, plan.guests, budgetNow && budgetNow > 0 ? budgetNow : "", data.venueIndex?.metros || []));
  document.querySelectorAll("[data-find-venues]").forEach((node) => {
    node.href = venueHref;
  });
  set("tracker", "Track quotes against this split.");
}

function budgetHref(plan) {
  const search = new URLSearchParams();
  if (state.place) search.set("loc", state.place.id);
  search.set("g", String(plan ? plan.guests : state.guests));
  const budget = parseMoney(budgetInput.value);
  if (budget && budget > 0) search.set("b", String(budget));
  else if (plan) search.set("b", String(Math.round(plan.planningTotal)));
  return siteHref(`/budget?${search.toString()}`);
}
