import { categorySplit, compareBudget, guestMath, planFor } from "./estimate.js";
import {
  bindGlobals, clear, el, emptyNote, fitNote, formatMoney, formatPlan, loadData,
  mountLocation, readParams, renderMethod, renderReferences, savePlan, setSticky,
  siteHref, storageGet, storageSet, track, writeParams,
} from "./common.js";

const params = readParams();
const state = {
  place: null,
  guests: Number(params.get("g") || storageGet("guests", 117)),
  budget: params.get("b") || "",
};

bindGlobals();

const form = document.querySelector("#cost-form");
const guestsInput = document.querySelector("#guests");
const budgetInput = document.querySelector("#budget");
const out = document.querySelector("#out");
guestsInput.value = state.guests;
if (state.budget) budgetInput.value = state.budget;

loadData().then((data) => {
  mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  form.addEventListener("input", () => render(data));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    render(data);
  });
  render(data);
}).catch(() => {
  clear(out);
  out.append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function render(data) {
  state.guests = Number(guestsInput.value) || 117;
  state.budget = budgetInput.value.trim();
  storageSet("guests", state.guests);
  writeParams({
    loc: state.place ? state.place.id : null,
    g: state.guests,
    b: state.budget || null,
  });
  clear(out);
  if (!state.place) {
    out.append(emptyNote("Add a ZIP, a city, or choose Not sure yet. You'll get a number right here."));
    setSticky("");
    return;
  }
  const plan = planFor(state.place, state.guests, data.costs);
  const math = guestMath(state.place, state.guests, data.costs);
  const fit = state.budget ? compareBudget(plan, Number(state.budget)) : null;
  const per = plan.kind === "range"
    ? `${formatMoney(math.perGuest.low)}–${formatMoney(math.perGuest.high)} per guest, all in`
    : `${formatPlan({ kind: "point", value: math.perGuest.value, exact: false })} per guest, all in`;
  const cut = math.cutSave
    ? (math.cutSave.value != null
      ? `Cutting ${math.cutSave.guests} guests saves ${formatPlan({ kind: "point", value: math.cutSave.value, exact: false }).toLowerCase()}.`
      : `Cutting ${math.cutSave.guests} guests saves ${formatMoney(math.cutSave.low)}–${formatMoney(math.cutSave.high)}.`)
    : "";

  const result = el("section", { class: "result", id: "result" }, [
    el("p", { class: "kicker", text: plan.estimated ? "Estimated range" : "Planning estimate" }),
    el("p", { class: "money", "data-total": "1", text: formatPlan(plan) }),
    el("p", { class: "subhead", text: `For ${plan.guests} guests in ${state.place.shortLabel}.` }),
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
    fitNote(fit),
    el("p", { text: per }),
    cut ? el("p", { text: cut }) : null,
    renderReferences(plan),
    el("p", { class: "hint", text: "These studies measure different weddings. Both stay on the page. They are not averaged." }),
    el("div", { class: "inline-actions no-print" }, [
      el("a", { class: "btn", href: budgetHref(), text: "See the breakdown" }),
      el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
      el("button", { class: "text-btn", type: "button", "data-print": "1", text: "Print" }),
    ]),
    renderMethod(plan),
  ]);
  out.append(result);
  setSticky(formatPlan(plan));
  savePlan({
    loc: state.place.id,
    label: state.place.label,
    guests: plan.guests,
    total: Math.round(plan.planningTotal),
    kind: plan.kind,
    value: plan.value,
    low: plan.low,
    high: plan.high,
    lines: categorySplit(plan, data.costs).lines.map((line) => ({ id: line.id, label: line.label, amount: line.amount })),
  });
  track("calc_complete", { tool: "home", tier: state.place.tier });
}

function budgetHref() {
  const search = new URLSearchParams();
  if (state.place) search.set("loc", state.place.id);
  search.set("g", String(state.guests));
  if (state.budget) search.set("b", state.budget);
  return siteHref(`/budget?${search.toString()}`);
}
