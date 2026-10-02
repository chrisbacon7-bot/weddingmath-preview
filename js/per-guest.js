import { hiddenCostBreakdown, planFor } from "./estimate.js";
import {
  bindGlobals, clear, el, emptyNote, formatMoney, formatPlan, loadData,
  mountLocation, readParams, renderMethod, renderReferences, setSticky,
  storageGet, writeParams, track,
} from "./common.js";

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

loadData().then((data) => {
  mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  document.querySelector("#guest-form").addEventListener("input", () => render(data));
  for (const id of ["quote", "service", "tax", "tip"]) {
    document.getElementById(id).addEventListener("input", () => render(data));
  }
  document.querySelector("#guest-form").addEventListener("submit", (event) => event.preventDefault());
  document.querySelector("#minus").addEventListener("click", () => nudge(-10, data));
  document.querySelector("#plus").addEventListener("click", () => nudge(10, data));
  document.querySelector("#use-service").addEventListener("click", () => {
    serviceInput.value = "20";
    render(data);
  });
  render(data);
}).catch(() => {
  clear(document.querySelector("#out"));
  document.querySelector("#out").append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function nudge(delta, data) {
  guestsInput.value = String(Math.min(400, Math.max(10, (Number(guestsInput.value) || 117) + delta)));
  render(data);
}

function render(data) {
  state.guests = Number(guestsInput.value) || 117;
  const cutBy = Math.min(state.guests - 10, Math.max(1, Number(cutInput.value) || 10));
  writeParams({
    loc: state.place ? state.place.id : null,
    g: state.guests,
    cut: cutBy,
  });
  const out = document.querySelector("#out");
  clear(out);
  renderHidden(data);
  if (!state.place) {
    out.append(emptyNote("Add a place to see what a guest costs there."));
    setSticky("");
    return;
  }
  const plan = planFor(state.place, state.guests, data.costs);
  const smaller = planFor(state.place, state.guests - cutBy, data.costs);
  const per = plan.kind === "range"
    ? { text: `${formatMoney(plan.low / state.guests)}–${formatMoney(plan.high / state.guests)}` }
    : { text: formatPlan({ kind: "point", value: plan.value / state.guests, exact: false }) };
  const save = plan.kind === "range"
    ? `${formatMoney(plan.low - smaller.low)}–${formatMoney(plan.high - smaller.high)}`
    : formatPlan({ kind: "point", value: plan.value - smaller.value, exact: false });
  const result = el("section", { class: "result", id: "result" }, [
    el("p", { class: "kicker", text: "All-in, per guest" }),
    el("p", { class: "money", "data-total": "1", text: per.text }),
    el("p", { class: "subhead", text: `${formatPlan(plan)} for ${plan.guests} guests in ${state.place.shortLabel}.` }),
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
    el("p", { text: `Cutting ${cutBy} guests saves ${save}. Food, drinks, and a few other lines move. The venue, photographer, and similar costs stay.` }),
    el("p", { class: "hint", text: "The all-in figure divides the whole wedding by the guest count. The amount you save by cutting guests is smaller, because some bills don't shrink." }),
    renderReferences(plan),
    el("div", { class: "inline-actions no-print" }, [
      el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
      el("button", { class: "text-btn", type: "button", "data-print": "1", text: "Print" }),
    ]),
    renderMethod(plan),
  ]);
  out.append(result);
  setSticky(per.text, { label: "Per guest", href: "#result" });
  track("calc_complete", { tool: "per-guest", tier: state.place.tier });
}

function renderHidden() {
  const box = document.querySelector("#hidden-out");
  clear(box);
  const quote = Number(quoteInput.value);
  if (!quote) {
    box.append(el("p", { class: "hint", text: "Type a quote to see it with the extras filled in." }));
    return;
  }
  const breakdown = hiddenCostBreakdown({
    quote,
    servicePct: serviceInput.value === "" ? NaN : Number(serviceInput.value),
    taxPct: taxInput.value === "" ? NaN : Number(taxInput.value),
    gratuityPct: tipInput.value === "" ? NaN : Number(tipInput.value),
  });
  box.append(el("p", { class: "money-sm", "data-hidden-total": "1", text: formatMoney(breakdown.total, { exact: true }) }));
  box.append(el("p", { text: `${formatMoney(breakdown.base, { exact: true })} quote + ${formatMoney(breakdown.serviceAmount, { exact: true })} service + ${formatMoney(breakdown.taxAmount, { exact: true })} tax + ${formatMoney(breakdown.tipAmount, { exact: true })} gratuity.` }));
  box.append(el("p", { class: "hint", text: "Ask whether the gratuity is already inside the service charge before you add both." }));
}
