import { compareBudget, guestsForBudget, planFor } from "./estimate.js";
import {
  bindGlobals, clear, el, emptyNote, fitNote, formatMoney, formatPlan, loadData,
  mountLocation, readParams, renderMethod, setSticky, storageGet, writeParams, track,
} from "./common.js";

const params = readParams();
const state = { place: null };
bindGlobals();

const fields = {
  saved: document.querySelector("#saved"),
  monthly: document.querySelector("#monthly"),
  months: document.querySelector("#months"),
  family: document.querySelector("#family"),
  hope: document.querySelector("#hope"),
};
fields.months.value = params.get("months") || "12";
for (const key of ["saved", "monthly", "family", "hope"]) {
  if (params.get(key)) fields[key].value = params.get(key);
}

loadData().then((data) => {
  mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  document.querySelector("#reverse-form").addEventListener("input", () => render(data));
  document.querySelector("#reverse-form").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#result")?.focus();
  });
  render(data);
}).catch(() => {
  clear(document.querySelector("#out"));
  document.querySelector("#out").append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function moneyOf(input) {
  const n = Number(String(input.value).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function render(data) {
  const saved = moneyOf(fields.saved);
  const monthly = moneyOf(fields.monthly);
  const months = Math.max(0, Number(fields.months.value) || 0);
  const family = moneyOf(fields.family);
  const hope = Number(fields.hope.value);
  const total = saved + monthly * months + family;
  writeParams({
    loc: state.place ? state.place.id : null,
    saved: saved || null,
    monthly: monthly || null,
    months: months || null,
    family: family || null,
    hope: hope || null,
  });
  const out = document.querySelector("#out");
  clear(out);
  if (!state.place) {
    out.append(emptyNote("Add a place first. Then the guest count follows from what you can spend."));
    setSticky("");
    return;
  }
  if (total <= 0) {
    out.append(emptyNote("Add savings, a monthly amount, or help from family. The guest count shows up here."));
    setSticky("");
    return;
  }
  const solved = guestsForBudget(state.place, total, data.costs);
  const parts = [];
  if (saved) parts.push(`${formatMoney(saved, { exact: true })} saved`);
  if (monthly && months) parts.push(`${formatMoney(monthly, { exact: true })} × ${months} months`);
  if (family) parts.push(`${formatMoney(family, { exact: true })} from family`);
  const result = el("section", { class: "result", id: "result", tabindex: "-1" }, [
    el("p", { class: "kicker", text: "You could spend" }),
    el("p", { class: "money", "data-total": "1", text: formatMoney(total, { exact: true }) }),
    el("p", { class: "subhead", text: parts.join(" + ") }),
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
  ]);

  if (state.place.tier === "C" || solved.comfortableGuests !== solved.stretchGuests) {
    const lowCount = solved.comfortableGuests;
    const highCount = solved.stretchGuests;
    if (lowCount && highCount && lowCount !== highCount) {
      result.append(el("p", { text: `About ${lowCount} guests is the comfortable count, where your money covers the high end of the local estimate. About ${highCount} guests reaches the low end.` }));
    } else if (highCount) {
      result.append(el("p", { text: `That covers about ${highCount} guests at the local estimate.` }));
    } else {
      result.append(el("p", { text: "Even a very small wedding here is above this total, on the figures we have." }));
    }
  } else if (solved.stretchGuests) {
    result.append(el("p", { text: `That covers about ${solved.stretchGuests} guests in ${state.place.shortLabel}.` }));
  } else {
    result.append(el("p", { text: "Even a very small wedding here is above this total, on the figures we have." }));
  }

  if (hope >= 10) {
    const hoped = planFor(state.place, hope, data.costs);
    result.append(el("p", { text: `${hope} guests here would be ${formatPlan(hoped)}.` }));
    result.append(fitNote(compareBudget(hoped, total)));
  }
  result.append(el("div", { class: "inline-actions no-print" }, [
    el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
    el("button", { class: "text-btn", type: "button", "data-print": "1", text: "Print" }),
  ]));
  const sample = planFor(state.place, solved.stretchGuests || 117, data.costs);
  result.append(renderMethod(sample));
  out.append(result);
  setSticky(formatMoney(total, { exact: true }), { label: "Guests", href: "#result" });
  track("calc_complete", { tool: "reverse", tier: state.place.tier });
}
