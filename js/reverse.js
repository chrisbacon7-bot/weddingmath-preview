import { compareBudget, guestsForBudget, planFor } from "./estimate.js";
import { costCurve, savingsSeries, verdictFix } from "./present.js";
import {
  bindGlobals, clear, el, emptyNote, formatMoney, formatPlan, guestCountNote, loadData,
  mountLocation, parseMoney, readParams, registerSummary, renderMethod, setPrintSummary, setSticky, siteHref, storageGet, writeParams, track,
} from "./common.js";
import { bigResult, copySummaryButton, curveChart, means, nextStep, presetBar, sourceStrip, summaryText, timelineChart, verdictView } from "./ui.js";
import { lowerFirst } from "./format.js";

const params = readParams();
const state = { place: null };
bindGlobals();

const fields = {
  saved: document.querySelector("#saved"),
  monthly: document.querySelector("#monthly"),
  months: document.querySelector("#months"),
  family: document.querySelector("#family"),
  hope: document.querySelector("#hope"),
  takehome: document.querySelector("#takehome"),
};
fields.months.value = params.get("months") ?? "12";
for (const key of ["saved", "monthly", "family", "hope", "takehome"]) {
  if (params.get(key)) fields[key].value = params.get(key);
}

loadData().then(async (data) => {
  const locationApi = mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  const presets = await fetch(new URL("../data/presets.json", import.meta.url)).then((response) => response.json()).catch(() => ({ reverse: [] }));
  document.querySelector("#reverse-presets")?.append(presetBar(presets.reverse || [], (preset) => {
    fields.saved.value = String(preset.saved ?? "");
    fields.monthly.value = String(preset.monthly ?? "");
    fields.months.value = String(preset.months ?? 12);
    fields.family.value = preset.family ? String(preset.family) : "";
    render(data);
  }));
  document.querySelector("#reverse-form").addEventListener("input", () => render(data));
  document.querySelector("#reverse-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await locationApi.commit({ go: false });
    document.querySelector("#result")?.focus();
  });
  render(data);
}).catch(() => {
  clear(document.querySelector("#out"));
  document.querySelector("#out").append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function moneyOf(input) {
  if (!input) return 0;
  const n = parseMoney(input.value);
  return n != null && n > 0 ? n : 0;
}

function render(data) {
  const saved = moneyOf(fields.saved);
  const monthly = moneyOf(fields.monthly);
  const months = Math.max(0, Number(fields.months.value) || 0);
  const family = moneyOf(fields.family);
  const takehome = moneyOf(fields.takehome);
  const hopeRaw = fields.hope.value.trim();
  const hope = hopeRaw === "" ? NaN : Number(hopeRaw);
  const total = saved + monthly * months + family;
  writeParams({
    loc: state.place ? state.place.id : null,
    saved: saved || null,
    monthly: monthly || null,
    months: fields.months.value === "" ? null : months,
    family: family || null,
    hope: Number.isFinite(hope) ? hope : null,
    takehome: takehome || null,
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
  const guestCount = solved.stretchGuests;
  const comfortable = solved.comfortableGuests;
  const parts = [];
  if (saved) parts.push(`${formatMoney(saved, { exact: true })} saved`);
  if (monthly && months) parts.push(`${formatMoney(monthly, { exact: true })} × ${months} months`);
  if (family) parts.push(`${formatMoney(family, { exact: true })} from family`);
  const sampleGuests = guestCount || 10;
  const sample = planFor(state.place, sampleGuests, data.costs);
  const hopePlan = Number.isFinite(hope) && hope > 0 ? planFor(state.place, hope, data.costs) : null;
  const hopeTarget = hopePlan ? (hopePlan.kind === "range" ? hopePlan.low : hopePlan.value) : 0;
  const hopeGap = hopePlan ? Math.max(0, Math.round(hopeTarget - total)) : 0;
  const cards = bigResult([
    { role: "plain", kicker: "You can spend", money: formatMoney(total, { exact: true }), note: parts.join(" + ") },
    { role: "main", kicker: guestCount ? `Covers ~${guestCount} guests` : "Guest count", money: guestCount ? `~${guestCount}` : "Under 10", note: `in ${state.place.shortLabel}${sample.estimated ? ". Estimated range." : ""}` },
    hopePlan
      ? { role: "gap", kicker: `To reach ${hopePlan.guests} guests`, money: hopeGap ? `+${formatMoney(hopeGap, { exact: true })}` : "Fits", note: hopeGap ? "Short of the low end of that guest count." : "This total covers that guest count." }
      : { role: "gap", kicker: "Comfortable count", money: comfortable ? `~${comfortable}` : "—", note: "Guests where the money covers the high end, when the place has a range." },
  ]);
  const guestNode = cards.querySelector(".big-card.main .money-sm");
  if (guestNode) guestNode.dataset.total = "1";
  const result = el("section", { class: "result", id: "result", tabindex: "-1" }, [
    cards,
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
  ]);
  if (!guestCount) {
    const tiny = planFor(state.place, 10, data.costs);
    const tinyTotal = tiny.kind === "range" ? tiny.low : tiny.value;
    const short = Math.max(0, Math.round(tinyTotal - total));
    const perMonth = months ? Math.round(short / months) : short;
    result.append(el("p", { text: `A 10-guest wedding here starts around ${formatMoney(tinyTotal)} — ${formatMoney(short, { exact: true })} more than you have. That's ${formatMoney(perMonth, { exact: true })} a month for ${months || 1} months.` }));
    result.append(el("p", { text: `Save ${formatMoney(perMonth, { exact: true })} more a month · or wait until the savings catch the ${formatMoney(tinyTotal)} figure · or the guest count stays under 10, which this calculator does not price.` }));
  } else if (sample.estimated || comfortable !== guestCount) {
    if (comfortable && guestCount && comfortable !== guestCount) {
      result.append(el("p", { text: `About ${comfortable} guests is the comfortable count, where your money covers the high end of the local estimate. About ${guestCount} guests reaches the low end.` }));
    } else {
      result.append(el("p", { text: `That covers about ${guestCount} guests at the local estimate.` }));
    }
    if (sample.estimated) result.append(el("p", { class: "hint", text: "Estimated. This place uses state figures and a price level, not a metro wedding survey." }));
  } else {
    result.append(el("p", { text: `That covers about ${guestCount} guests in ${state.place.shortLabel}.` }));
  }
  if (hopePlan) {
    const note = guestCountNote(hope, hopePlan.guests);
    const verdict = compareBudget(hopePlan, total);
    result.append(el("p", { text: `${hopePlan.guests} guests here would be ${lowerFirst(formatPlan(hopePlan))}.${note ? ` ${note}` : ""}` }));
    result.append(verdictView(verdict, verdictFix(state.place, hopePlan, total, data.costs)));
    if (hopeGap > 0 && hopePlan.guests > (guestCount || 0)) {
      const extraMonths = monthly ? Math.ceil(hopeGap / monthly) : null;
      const fewer = hopePlan.guests - (guestCount || 10);
      const extraMonthly = months ? Math.ceil(hopeGap / months) : hopeGap;
      result.append(el("p", { text: `Save ${formatMoney(extraMonthly, { exact: true })} more a month · ${extraMonths ? `or wait ${extraMonths} more months · ` : ""}or invite ${fewer} fewer guests.` }));
    }
  }
  if (takehome && monthly > takehome * 0.2) {
    result.append(el("p", { class: "hint", text: `Stretch zone: ${formatMoney(monthly, { exact: true })} a month is over 20% of the ${formatMoney(takehome, { exact: true })} take-home you typed. That 20% is a guideline on this page, not a study.` }));
  }
  const series = savingsSeries({ saved, monthly, months, family, target: hopeTarget || (sample.kind === "range" ? sample.low : sample.value) });
  result.append(el("h2", { text: "Savings over time" }));
  result.append(timelineChart(series, hopeTarget || sample.planningTotal));
  if (series.fundedMonth != null) result.append(el("p", { text: `The running total passes the target in month ${series.fundedMonth}.` }));
  const table = el("details", { class: "what" }, [el("summary", { text: "Month by month" })]);
  const sheet = el("table", { class: "split-table" });
  sheet.append(el("tbody", {}, series.rows.filter((_, index) => index % Math.ceil(series.rows.length / 12) === 0 || index === series.rows.length - 1).map((row) => el("tr", {}, [
    el("td", { text: `Month ${row.month}` }),
    el("td", { text: formatMoney(row.total, { exact: true }) }),
  ]))));
  table.append(sheet);
  result.append(table);
  const points = costCurve(state.place, data.costs);
  result.append(el("h2", { text: "Guests and cost" }));
  result.append(curveChart(points, total, [
    { guests: comfortable || guestCount, label: "Comfortable", color: "#1f4d3a" },
    { guests: guestCount, label: "Stretch", color: "#c4a574" },
  ]));
  result.append(means(`~${guestCount || "—"} guests is how far ${formatMoney(total, { exact: true })} goes in ${state.place.shortLabel}, using the same planning figure as the other calculators. The curve is that figure at every guest count from 10 to 400.`));
  result.append(sourceStrip());
  result.append(el("div", { class: "inline-actions no-print" }, [
    copySummaryButton(() => summaryText("What we can afford", [
      formatMoney(total, { exact: true }),
      guestCount ? `About ${guestCount} guests in ${state.place.shortLabel}` : "Under 10 guests",
    ])),
    el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
    el("button", { class: "text-btn", type: "button", "data-print": "1", text: "Print / Save PDF" }),
  ]));
  result.append(el("p", { class: "hint", "data-copy-status": "1", "aria-live": "polite" }));
  const nextGuests = guestCount || hopePlan?.guests || 117;
  result.append(nextStep(siteHref(`/budget?b=${Math.round(total)}&g=${nextGuests}&loc=${encodeURIComponent(state.place.id)}`), `See where ${formatMoney(total, { exact: true })} goes`));
  result.append(renderMethod(sample));
  out.append(result);
  setPrintSummary(`${state.place.shortLabel} · ${formatMoney(total, { exact: true })} · ${guestCount || "under 10"} guests`);
  registerSummary(() => summaryText("What we can afford", [`${formatMoney(total, { exact: true })} · about ${guestCount || "under 10"} guests`]));
  setSticky(guestCount ? `~${guestCount} guests` : formatMoney(total, { exact: true }), { label: "Guests", href: "#result", kicker: "Guests you can host" });
  track("calc_complete", { tool: "reverse", tier: state.place.tier });
}
