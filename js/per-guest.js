import { MIN_GUESTS, categorySplit, hiddenCostBreakdown, planFor } from "./estimate.js";
import { venueAppPath } from "./place-nav.js";
import { fixedVariable, marginalPerGuest } from "./present.js";
import {
  bindGlobals, clear, el, emptyNote, formatMoney, formatPlan, guestCountNote, loadData,
  mountLocation, parseMoney, readParams, registerSummary, renderMethod, renderReferences, setPrintSummary, setSticky,
  siteHref, storageGet, storageSet, writeParams, track,
} from "./common.js";
import { bigResult, copySummaryButton, means, nextStep, sourceStrip, stackedBar, summaryText } from "./ui.js";
import { lowerFirst } from "./format.js";

const params = readParams();
const state = { place: null, guests: Number(params.get("g") || storageGet("guests", 117)) };
bindGlobals();
const guestsInput = document.querySelector("#guests");
const cutInput = document.querySelector("#cut");
const quoteInput = document.querySelector("#quote");
const serviceInput = document.querySelector("#service");
const taxInput = document.querySelector("#tax");
const tipInput = document.querySelector("#tip");
guestsInput.value = state.guests;
cutInput.value = params.get("cut") || "10";
let stickyMode = "guest";

loadData().then((data) => {
  const locationApi = mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  document.querySelector("#guest-form").addEventListener("input", () => {
    stickyMode = "guest";
    render(data);
  });
  for (const id of ["quote", "service", "tax", "tip", "tax-service", "per-head", "tip-inside"]) {
    const node = document.getElementById(id);
    node.addEventListener("input", () => {
      stickyMode = "quote";
      render(data);
    });
    node.addEventListener("change", () => {
      stickyMode = "quote";
      render(data);
    });
  }
  document.querySelector("#guest-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await locationApi.commit({ go: false });
  });
  document.querySelector("#use-service").addEventListener("click", () => {
    serviceInput.value = "20";
    stickyMode = "quote";
    render(data);
  });
  render(data);
}).catch(() => {
  clear(document.querySelector("#out"));
  document.querySelector("#out").append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function render(data) {
  const rawGuests = guestsInput.value.trim();
  const typedGuests = rawGuests === "" ? NaN : Number(rawGuests);
  state.guests = Number.isFinite(typedGuests) ? typedGuests : 117;
  const out = document.querySelector("#out");
  clear(out);
  const hidden = renderHidden(state.place ? planFor(state.place, state.guests, data.costs).guests : null);
  if (!state.place) {
    const note = document.querySelector("#guest-note");
    if (note) note.textContent = guestsInput.dataset.clampedNote || "";
    out.append(emptyNote("Add a place to see what a guest costs there."));
    setSticky(hidden ? `Quote all-in ${formatMoney(hidden.total, { exact: true })}` : "");
    return;
  }
  const plan = planFor(state.place, state.guests, data.costs);
  const guests = plan.guests;
  const maxCut = Math.max(0, guests - MIN_GUESTS);
  const askedCut = Number(cutInput.value);
  const cutBy = maxCut === 0 ? 0 : Math.min(maxCut, Math.max(1, Number.isFinite(askedCut) ? askedCut : 10));
  writeParams({
    loc: state.place.id,
    g: state.guests,
    cut: cutBy || null,
  });
  storageSet("guests", guests);
  const perValue = plan.kind === "range" ? plan.planningTotal / guests : plan.value / guests;
  const perText = plan.kind === "range"
    ? `${formatMoney(plan.low / guests)}–${formatMoney(plan.high / guests)}`
    : formatPlan({ kind: "point", value: plan.value / guests, exact: false });
  const countNote = guestsInput.dataset.clampedNote || guestCountNote(typedGuests, guests);
  const note = document.querySelector("#guest-note");
  if (note) note.textContent = countNote;
  const marginal = cutBy ? marginalPerGuest(state.place, guests, cutBy, data.costs) : null;
  const marginalText = !marginal
    ? "—"
    : marginal.value != null
      ? formatPlan({ kind: "point", value: marginal.value, exact: false })
      : `${formatMoney(marginal.low)}–${formatMoney(marginal.high)}`;
  const saveText = !marginal
    ? "At 10 guests there's no one left to cut. The smallest list this calculator prices is 10."
    : marginal.value != null
      ? `Cutting ${marginal.guests} guests saves ${lowerFirst(formatPlan({ kind: "point", value: marginal.value * marginal.guests, exact: false }))}. Food, drinks, and a few other lines move. The venue, photographer, and similar costs stay.`
      : `Cutting ${marginal.guests} guests saves ${lowerFirst(formatPlan({ kind: "range", low: marginal.low * marginal.guests, high: marginal.high * marginal.guests }))}. Food, drinks, and a few other lines move. The venue, photographer, and similar costs stay.`;
  const cards = bigResult([
    { role: "main", kicker: "All-in per guest", money: perText },
    { role: "plain", kicker: "What one more guest really adds", money: marginal ? `~${marginalText.replace(/^About /, "")}` : "—", note: "The change in the planning figure, divided by the guests you cut." },
    { role: "gap", kicker: cutBy ? `Cut ${cutBy}` : "Cut", money: marginal && marginal.value != null ? lowerFirst(formatPlan({ kind: "point", value: marginal.value * marginal.guests, exact: false })) : "—", note: "Saved if the list shrinks by that many." },
  ]);
  const totalNode = cards.querySelector(".big-card.main .money-sm");
  if (totalNode) totalNode.dataset.total = "1";
  const split = categorySplit(plan, data.costs);
  const parts = fixedVariable(split);
  const result = el("section", { class: "result", id: "result" }, [
    cards,
    el("p", { class: "subhead", text: `${formatPlan(plan)} for ${guests} guests in ${state.place.shortLabel}.${countNote ? ` ${countNote}` : ""}` }),
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
    el("p", { text: saveText }),
    el("h2", { text: "What stays, what shrinks" }),
    stackedBar([
      { label: "Stays if the list shrinks", amount: parts.fixed, color: "#1f4d3a" },
      { label: "Grows with the guest list", amount: parts.variable, color: "#c4a574" },
    ]),
    means(`All-in per guest divides the whole wedding by ${guests}. The smaller number is what actually changes when the list shrinks, because venue, photo, clothes, and similar lines stay put.`),
    renderReferences(plan),
    sourceStrip(),
    el("div", { class: "inline-actions no-print" }, [
      copySummaryButton(() => summaryText("Cost per guest", [perText, saveText])),
      el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
      el("button", { class: "text-btn", type: "button", "data-print": "1", text: "Print / Save PDF" }),
    ]),
    el("p", { class: "hint", "data-copy-status": "1", "aria-live": "polite" }),
    nextStep(siteHref(venueAppPath(state.place, guests, "", data.venueIndex?.metros || [])), `Find venues for ${guests} guests`),
    renderMethod(plan),
  ]);
  out.append(result);
  setPrintSummary(`${state.place.shortLabel} · ${guests} guests · cut ${cutBy}`);
  registerSummary(() => summaryText("Cost per guest", [perText, `${guests} guests in ${state.place.shortLabel}`]));
  if (stickyMode === "quote" && hidden) {
    setSticky(formatMoney(hidden.total, { exact: true }), { label: "Quote", href: "#hidden-out", kicker: "Quote all-in" });
  } else {
    setSticky(perText, { label: "Per guest", href: "#result", kicker: "Per guest" });
  }
  track("calc_complete", { tool: "per-guest", tier: state.place.tier });
}

function renderHidden(guestCount) {
  const box = document.querySelector("#hidden-out");
  clear(box);
  const parsed = parseMoney(quoteInput.value);
  const perHead = document.querySelector("#per-head").checked;
  const tipInside = document.querySelector("#tip-inside").checked;
  if (!quoteInput.value.trim()) {
    box.append(el("p", { class: "hint", text: "Type a quote to see it with the extras filled in. Type the sales-tax percent from the contract. We don't look up a state rate." }));
    return null;
  }
  if (parsed == null || parsed < 0) {
    box.append(el("p", { class: "error", text: "Enter a quote of zero or more. A negative number isn't a price." }));
    return null;
  }
  const guests = guestCount || Math.min(400, Math.max(10, Number(guestsInput.value) || 117));
  const quote = perHead ? parsed * guests : parsed;
  const taxOnService = document.querySelector("#tax-service").checked;
  const breakdown = hiddenCostBreakdown({
    quote,
    servicePct: serviceInput.value === "" ? NaN : Number(serviceInput.value),
    taxPct: taxInput.value === "" ? NaN : Number(taxInput.value),
    gratuityPct: tipInside || tipInput.value === "" ? NaN : Number(tipInput.value),
    taxOnService,
  });
  if (!breakdown) {
    box.append(el("p", { class: "error", text: "Enter a quote of zero or more. A negative number isn't a price." }));
    return null;
  }
  const lift = breakdown.base ? Math.round(((breakdown.total - breakdown.base) / breakdown.base) * 100) : 0;
  const taxNote = taxOnService
    ? " Tax here is applied to the quote plus the service charge, which is the usual rule when that charge is mandatory."
    : " Tax here is applied to the quote only.";
  box.append(el("p", { class: "money-sm", "data-hidden-total": "1", text: formatMoney(breakdown.total, { exact: true }) }));
  box.append(el("p", { text: `Your ${formatMoney(breakdown.base, { exact: true })} quote is really ${formatMoney(breakdown.total, { exact: true })} (+${lift}%).` }));
  if (perHead) box.append(el("p", { class: "hint", text: `Per guest × ${guests} guests, then plus-plus.` }));
  box.append(stackedBar([
    { label: "Quote", amount: breakdown.base, color: "#1f4d3a" },
    { label: "Service", amount: breakdown.serviceAmount, color: "#c4a574" },
    { label: "Tax", amount: breakdown.taxAmount, color: "#3d6b8c" },
    { label: "Gratuity", amount: breakdown.tipAmount, color: "#c9847a" },
  ].filter((part) => part.amount > 0)));
  box.append(el("p", { text: `${formatMoney(breakdown.base, { exact: true })} quote + ${formatMoney(breakdown.serviceAmount, { exact: true })} service + ${formatMoney(breakdown.taxAmount, { exact: true })} tax + ${formatMoney(breakdown.tipAmount, { exact: true })} gratuity.${taxNote}` }));
  box.append(el("p", { class: "hint", text: tipInside
    ? "Gratuity is left at $0 because you said it is already inside the service charge."
    : "Ask whether the gratuity is already inside the service charge before you add both. Type the tax percent from the contract. We don't guess a state rate." }));
  return breakdown;
}
