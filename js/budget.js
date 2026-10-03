import { categorySplit, compareBudget, planFor, venueBenchmarks, offPeakRange } from "./estimate.js";
import { groupLines, priorityMoves, rebalanceLines, styleTiers, verdictFix } from "./present.js";
import {
  bindGlobals, clear, el, emptyNote, formatMoney, formatPlan, guestCountNote, loadData,
  mountLocation, parseMoney, readParams, registerSummary, renderMethod, renderReferences, savePlan, setPrintSummary, setSticky,
  siteHref, storageGet, storageSet, track, writeParams,
} from "./common.js";
import { bigResult, copySummaryButton, donutChart, means, nextStep, presetBar, sourceStrip, summaryText, verdictView } from "./ui.js";

const params = readParams();
const state = {
  place: null,
  compare: null,
  guests: Number(params.get("g") || storageGet("guests", 117)),
  budget: params.get("b") || "",
  venueNote: params.get("venueName") || "",
  venueTotal: params.get("venueTotal") || "",
  venueLoc: params.get("loc") || "",
  season: params.get("season") || "",
  priorities: (params.get("p") || "").split(",").filter(Boolean).slice(0, 3),
  offpeak: params.get("off") === "1",
  locks: parseLocks(params.get("lock")),
};

bindGlobals();
const guestsInput = document.querySelector("#guests");
const budgetInput = document.querySelector("#budget");
const seasonInput = document.querySelector("#season");
const offpeakInput = document.querySelector("#offpeak");
const priorityBox = document.querySelector("#priorities");
const out = document.querySelector("#out");
const compareOut = document.querySelector("#compare-out");
guestsInput.value = state.guests;
if (state.budget) budgetInput.value = state.budget;
seasonInput.value = state.season;
offpeakInput.checked = state.offpeak;

let mainLoc = null;

loadData().then(async (data) => {
  for (const pri of data.costs.priorities) {
    const button = el("button", { type: "button", text: pri.label, "aria-pressed": "false" });
    button.dataset.priority = pri.id;
    button.addEventListener("click", () => {
      const on = button.getAttribute("aria-pressed") === "true";
      if (on) {
        state.priorities = state.priorities.filter((id) => id !== pri.id);
        button.setAttribute("aria-pressed", "false");
      } else if (state.priorities.length >= 3) {
        document.querySelector("#priority-note").textContent = "Pick up to three. Unselect one to change.";
        return;
      } else {
        state.priorities.push(pri.id);
        button.setAttribute("aria-pressed", "true");
        document.querySelector("#priority-note").textContent = "We'll put more of the total toward what you picked. The total stays the same.";
      }
      render(data);
    });
    priorityBox.append(button);
  }
  syncPriorityButtons();

  mainLoc = mountLocation(document.querySelector("[data-location='main']"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      if (state.venueNote && place && place.id !== state.venueLoc) {
        state.venueNote = "";
        state.venueTotal = "";
      }
      state.place = place;
      render(data);
    },
  });
  const compareLoc = mountLocation(document.querySelector("[data-location='compare']"), {
    data,
    initialId: params.get("loc2") || "",
    onChange(place) {
      state.compare = place;
      render(data);
    },
  });
  const presets = await fetch(new URL("../data/presets.json", import.meta.url)).then((response) => response.json()).catch(() => ({ budget: [] }));
  document.querySelector("#budget-presets")?.append(presetBar(presets.budget || [], (preset) => {
    guestsInput.value = String(preset.guests);
    budgetInput.value = preset.budget ? String(preset.budget) : "";
    state.priorities = preset.priorities ? [...preset.priorities] : [];
    state.locks = {};
    syncPriorityButtons();
    mainLoc.choose(preset.loc, preset.loc === "national" ? "US average" : preset.label);
  }));
  document.querySelector("#budget-form").addEventListener("input", () => render(data));
  document.querySelector("#budget-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await mainLoc.commit({ go: false });
    await compareLoc.commit({ go: false });
    document.querySelector("#categories")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  render(data);
}).catch(() => {
  clear(out);
  out.append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function syncPriorityButtons() {
  priorityBox.querySelectorAll("[data-priority]").forEach((button) => {
    button.setAttribute("aria-pressed", state.priorities.includes(button.dataset.priority) ? "true" : "false");
  });
}

function render(data) {
  const rawGuests = guestsInput.value.trim();
  const typedGuests = rawGuests === "" ? NaN : Number(rawGuests);
  state.guests = Number.isFinite(typedGuests) ? typedGuests : 117;
  state.budget = budgetInput.value.trim();
  const budgetNumber = parseMoney(state.budget);
  state.season = seasonInput.value;
  state.offpeak = offpeakInput.checked;
  storageSet("guests", Math.min(400, Math.max(10, Number.isFinite(typedGuests) ? Math.round(typedGuests) : 117)));
  writeParams({
    loc: state.place ? state.place.id : null,
    loc2: state.compare ? state.compare.id : null,
    g: state.guests,
    b: budgetNumber && budgetNumber > 0 ? budgetNumber : null,
    season: state.season || null,
    p: state.priorities.join(",") || null,
    off: state.offpeak ? "1" : null,
    venueName: state.venueNote || null,
    venueTotal: state.venueTotal || null,
    lock: lockParam(state.locks),
  });
  const tune = document.querySelector("#tune-summary");
  if (tune) {
    const seasonLabel = state.season ? seasonInput.selectedOptions[0].textContent : "none";
    tune.textContent = `Season: ${seasonLabel} · Off-peak: ${state.offpeak ? "on" : "off"} · Compare: ${state.compare ? state.compare.shortLabel : "—"}`;
  }
  clear(out);
  clear(compareOut);
  if (!state.place) {
    out.append(emptyNote("Add where the wedding is. The split shows up as soon as you do."));
    setSticky("");
    return;
  }
  const options = { season: state.season || null };
  const plan = planFor(state.place, state.guests, data.costs, options);
  const userTotal = budgetNumber && budgetNumber > 0 ? budgetNumber : null;
  const countNote = guestsInput.dataset.clampedNote || guestCountNote(typedGuests, plan.guests);
  const plain = categorySplit(plan, data.costs, { total: userTotal, priorities: [] });
  const weighted = categorySplit(plan, data.costs, { total: userTotal, priorities: state.priorities });
  const moved = priorityMoves(plain, weighted);
  const prepared = moved.map((line) => ({ ...line, baseAmount: line.amount }));
  const lines = Object.keys(state.locks).length
    ? rebalanceLines(prepared, state.locks, weighted.total)
    : prepared;
  const splitTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const fit = userTotal ? compareBudget(plan, userTotal) : null;
  const localText = formatPlan(plan);
  const gapCard = fit
    ? { role: "gap", kicker: "Gap", money: formatMoney(-fit.gap, { exact: true }), note: fit.text }
    : { role: "gap", kicker: "Gap", money: "—", note: "Type a budget to see how it sits against the local figure." };
  const cards = bigResult([
    { role: "main", kicker: userTotal ? "Your total" : "Typical split here", money: formatMoney(splitTotal, { exact: true }) },
    { role: "plain", kicker: "Local figure", money: localText },
    gapCard,
  ]);
  const totalNode = cards.querySelector(".big-card.main .money-sm");
  if (totalNode) totalNode.dataset.total = "1";
  const movedToward = moved.filter((line) => line.delta > 0);
  const movedSum = movedToward.reduce((sum, line) => sum + line.delta, 0);
  const result = el("section", { class: "result", id: "result", tabindex: "-1" }, [
    state.venueNote ? el("div", { class: "tone tone-fits", "data-venue-note": "1" }, [
      el("p", { text: Number(state.venueTotal)
        ? `${state.venueNote}: the venue page shows ${formatMoney(Number(state.venueTotal), { exact: true })}. That is the venue, not the whole wedding. The split below is still the full wedding.`
        : `${state.venueNote} did not publish a price. The split below is the full wedding, not a venue quote.` }),
    ]) : null,
    el("p", { class: "subhead", text: `${plan.guests} guests · ${state.place.shortLabel}${countNote ? `. ${countNote}` : ""}` }),
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
    cards,
    verdictView(fit, fit ? verdictFix(state.place, plan, userTotal, data.costs, options) : ""),
    means(userTotal
      ? `The lines add up to the ${formatMoney(splitTotal, { exact: true })} you typed. The local planning figure is ${localText}. Priorities move money between lines and leave that total alone.`
      : `This split adds up to the planning figure${plan.usingMidpoint ? ", using the middle of the estimated range" : ""}. Type a total when you want the lines to follow your number.`),
    movedSum ? el("p", { text: `Moved ${formatMoney(movedSum, { exact: true })} toward ${movedToward.map((line) => line.label).slice(0, 3).join(" and ")}.` }) : null,
  ]);
  result.append(tierCards(plan, data, options, userTotal));
  if (state.offpeak) {
    const base = userTotal || plan.planningTotal;
    const range = offPeakRange(base);
    result.append(el("p", { text: `Off-peak dates: Zola says weekday or winter weddings can run 20–30% less at many vendors. That would put this total around ${formatMoney(range.low)}–${formatMoney(range.high)}. It's a discount range, not a promise.` }));
  }
  const venues = venueBenchmarks(state.place, state.guests, data.costs);
  if (venues.length) {
    const venueBlock = el("div", {}, [el("h2", { text: "Venue, as a benchmark" })]);
    for (const venue of venues) {
      venueBlock.append(el("p", { text: `${venue.study}: ${venue.exact ? formatMoney(venue.value, { exact: true }) : formatMoney(venue.value)}. ${venue.note}` }));
    }
    result.append(venueBlock);
  }
  result.append(renderReferences(plan));
  result.append(sourceStrip());
  result.append(el("div", { class: "inline-actions no-print" }, [
    copySummaryButton(() => summaryText("Budget split", [
      `${state.place.shortLabel} · ${plan.guests} guests`,
      formatMoney(splitTotal, { exact: true }),
      fit ? fit.text : localText,
    ])),
    el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
    el("button", { class: "text-btn", type: "button", "data-print": "1", text: "Print / Save PDF" }),
  ]));
  result.append(el("p", { class: "hint", "data-copy-status": "1", "aria-live": "polite" }));
  const trackerHref = siteHref(`/budget/tracker?fill=plan&loc=${encodeURIComponent(state.place.id)}&g=${plan.guests}`);
  result.append(nextStep(trackerHref, "Track quotes against this split"));
  result.append(renderMethod(plan));
  out.append(result);

  const grouped = groupLines(lines, splitTotal, 6);
  const list = el("div", { class: "stack", id: "categories" });
  const chartCard = el("section", { class: "card split-visual" }, [
    donutChart(grouped.chart, splitTotal),
  ]);
  if (Object.keys(state.locks).length) {
    const reset = el("button", { type: "button", class: "text-btn", text: "Reset locked lines" });
    reset.addEventListener("click", () => {
      state.locks = {};
      render(data);
    });
    chartCard.append(reset);
  }
  list.append(chartCard);
  const bigLines = lines.filter((line) => splitTotal && line.amount / splitTotal >= 0.03);
  const smallLines = lines.filter((line) => !bigLines.includes(line));
  list.append(lineTable(bigLines, splitTotal, data));
  if (smallLines.length) {
    const smallTotal = smallLines.reduce((sum, line) => sum + line.amount, 0);
    const details = el("details", { id: "smaller-lines", class: "what" }, [
      el("summary", { text: `Smaller lines (${smallLines.length}) — ${formatMoney(smallTotal, { exact: true })}` }),
    ]);
    details.append(lineTable(smallLines, splitTotal, data));
    list.append(details);
  }
  out.append(list);

  if (state.place.metroId === "16980" && plan.guests === 150) {
    const chicago = el("section", { class: "card" }, [
      el("h2", { text: "Zola's own Chicago split, at 150 guests" }),
      el("p", { text: "This is Zola's published category list for a 150-guest Chicago wedding. It is not mixed into the split above." }),
    ]);
    for (const row of data.costs.chicagoCategories150) {
      chicago.append(el("p", { class: "spread", text: `${row.label} · ${formatMoney(row.amount, { exact: true })}` }));
    }
    out.append(chicago);
  }

  if (state.compare && state.compare.id !== state.place.id) {
    const other = planFor(state.compare, state.guests, data.costs, options);
    const otherSplit = categorySplit(other, data.costs, { priorities: state.priorities });
    const hereTotal = plan.planningTotal;
    const thereTotal = other.planningTotal;
    const cheaperHere = hereTotal <= thereTotal;
    const delta = Math.abs(hereTotal - thereTotal);
    const grid = el("div", { class: "compare-grid" });
    grid.append(compareCard(state.place, plan, categorySplit(plan, data.costs, { priorities: state.priorities }), cheaperHere));
    grid.append(compareCard(state.compare, other, otherSplit, !cheaperHere));
    compareOut.append(el("section", { class: "result" }, [
      el("h2", { text: "Same wedding, two places" }),
      el("p", { class: "hint", text: state.compare.tierLabel || "" }),
      grid,
      el("p", { text: `${cheaperHere ? state.place.shortLabel : state.compare.shortLabel} is ${formatMoney(delta)} cheaper for ${plan.guests} guests.` }),
    ]));
  }

  setPrintSummary(`${state.place.shortLabel} · ${plan.guests} guests · ${userTotal ? `budget ${formatMoney(userTotal, { exact: true })}` : "planning figure"} · priorities ${state.priorities.join(", ") || "none"}`);
  registerSummary(() => summaryText("Budget split", [formatMoney(splitTotal, { exact: true }), `${plan.guests} guests in ${state.place.shortLabel}`]));
  setSticky(formatMoney(splitTotal, { exact: true }), {
    label: "Categories",
    href: "#categories",
    kicker: userTotal ? "Your total, split" : "Typical split here",
  });
  savePlan({
    loc: state.place.id,
    label: state.place.label,
    guests: plan.guests,
    total: splitTotal,
    kind: plan.kind,
    lines: lines.map((line) => ({ id: line.id, label: line.label, amount: line.amount })),
  });
  track("calc_complete", { tool: "budget", tier: state.place.tier });
}

function tierCards(plan, data, options, userTotal) {
  const tiers = styleTiers(state.place, plan.guests, data.costs);
  const row = el("div", { class: "big-result" });
  for (const tier of tiers) {
    const fake = { ...plan, kind: "point", value: tier.total, planningTotal: tier.total };
    const verdict = userTotal ? compareBudget(fake, userTotal) : null;
    const button = el("button", { type: "button", class: "big-card plain" }, [
      el("p", { class: "kicker", text: tier.label }),
      el("p", { class: "money-sm", text: formatMoney(tier.total) }),
      el("p", { class: "hint", text: verdict ? verdict.text : tier.note }),
    ]);
    button.addEventListener("click", () => {
      budgetInput.value = String(Math.round(tier.total));
      state.locks = {};
      render(data);
    });
    row.append(button);
  }
  return el("div", {}, [
    el("h2", { text: "Style, from the studies" }),
    el("p", { class: "hint", text: "Simple and Elevated follow The Knot's winter and summer averages against the overall average, or the ends of an estimated range. They are not a 0.75× or 1.35× guess." }),
    row,
  ]);
}

function lineTable(lines, total, data) {
  const table = el("table", { class: "split-table" });
  table.append(el("thead", {}, [el("tr", {}, ["Category", "$", "%", "Moves?", ""].map((label) => el("th", { text: label })))]));
  const body = el("tbody");
  for (const line of lines) {
    const share = total ? Math.round((line.amount / total) * 100) : 0;
    const delta = line.delta ? el("p", { class: "hint", text: `${line.delta > 0 ? "+" : "−"}${formatMoney(Math.abs(line.delta), { exact: true })} from your priorities` }) : null;
    const amount = el("button", { type: "button", class: "text-btn", text: `${line.locked ? "Locked " : ""}${formatMoney(line.amount, { exact: true })}` });
    amount.addEventListener("click", () => startEdit(amount, line, data));
    const row = el("tr", { id: `line-${line.id}` }, [
      el("td", {}, [el("strong", { text: line.label }), line.note ? el("details", { class: "what" }, [el("summary", { text: "What's this?" }), el("p", { text: line.note })]) : null, delta]),
      el("td", {}, [amount]),
      el("td", { text: `${share}%` }),
      el("td", { text: line.basis === "fixed" ? "Stays put" : "Grows with guests" }),
      el("td", {}, [el("span", { class: "meter" }, [el("span")])]),
    ]);
    row.querySelector(".meter span").style.setProperty("--w", `${share}%`);
    body.append(row);
  }
  table.append(body);
  return table;
}

function startEdit(button, line, data) {
  const input = el("input", { type: "text", inputmode: "numeric", value: String(line.amount), "aria-label": `${line.label} amount` });
  button.replaceWith(input);
  input.focus();
  input.addEventListener("change", () => {
    const amount = parseMoney(input.value);
    if (amount == null || amount < 0) return;
    state.locks[line.id] = Math.round(amount);
    render(data);
  });
}

function compareCard(place, plan, split, winner) {
  const top = split.lines.slice(0, 3).map((line) => `${line.label} ${formatMoney(line.amount, { exact: true })}`).join(" · ");
  return el("article", { class: winner ? "card winner" : "card" }, [
    el("h3", { text: place.shortLabel }),
    el("p", { class: "money-sm", text: formatPlan(plan) }),
    el("p", { text: `${formatMoney(plan.planningTotal / plan.guests)} per guest` }),
    el("p", { class: "hint", text: top }),
  ]);
}

function parseLocks(raw) {
  const locks = {};
  if (!raw) return locks;
  for (const part of raw.split(",")) {
    const [id, amount] = part.split(":");
    const value = Number(amount);
    if (id && Number.isFinite(value)) locks[id] = value;
  }
  return locks;
}

function lockParam(locks) {
  const parts = Object.entries(locks).map(([id, amount]) => `${id}:${amount}`);
  return parts.length ? parts.join(",") : null;
}
