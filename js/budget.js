import { categorySplit, compareBudget, planFor, venueBenchmarks, offPeakRange } from "./estimate.js";
import {
  bindGlobals, clear, el, emptyNote, fitNote, formatMoney, formatPlan, loadData,
  mountLocation, readParams, renderMethod, renderReferences, savePlan, setSticky,
  siteHref, storageGet, storageSet, track, writeParams,
} from "./common.js";

const params = readParams();
const state = {
  place: null,
  compare: null,
  guests: Number(params.get("g") || storageGet("guests", 117)),
  budget: params.get("b") || "",
  season: params.get("season") || "",
  priorities: (params.get("p") || "").split(",").filter(Boolean).slice(0, 3),
  offpeak: params.get("off") === "1",
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

loadData().then((data) => {
  for (const pri of data.costs.priorities) {
    const pressed = state.priorities.includes(pri.id);
    const button = el("button", { type: "button", text: pri.label, "aria-pressed": pressed ? "true" : "false" });
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

  mountLocation(document.querySelector("[data-location='main']"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  mountLocation(document.querySelector("[data-location='compare']"), {
    data,
    initialId: params.get("loc2") || "",
    onChange(place) {
      state.compare = place;
      render(data);
    },
  });
  document.querySelector("#budget-form").addEventListener("input", () => render(data));
  document.querySelector("#budget-form").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#result")?.focus();
  });
  render(data);
}).catch(() => {
  clear(out);
  out.append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function render(data) {
  state.guests = Number(guestsInput.value) || 117;
  state.budget = budgetInput.value.trim();
  state.season = seasonInput.value;
  state.offpeak = offpeakInput.checked;
  storageSet("guests", state.guests);
  writeParams({
    loc: state.place ? state.place.id : null,
    loc2: state.compare ? state.compare.id : null,
    g: state.guests,
    b: state.budget || null,
    season: state.season || null,
    p: state.priorities.join(",") || null,
    off: state.offpeak ? "1" : null,
  });
  clear(out);
  clear(compareOut);
  if (!state.place) {
    out.append(emptyNote("Add where the wedding is. The split shows up as soon as you do."));
    setSticky("");
    return;
  }
  const options = { season: state.season || null };
  const plan = planFor(state.place, state.guests, data.costs, options);
  const userTotal = state.budget ? Number(state.budget) : null;
  const split = categorySplit(plan, data.costs, { total: userTotal, priorities: state.priorities });
  const fit = userTotal ? compareBudget(plan, userTotal) : null;
  const venueNote = params.get("venueName");
  const venueTotal = Number(params.get("venueTotal"));
  const result = el("section", { class: "result", id: "result", tabindex: "-1" }, [
    venueNote ? el("div", { class: "tone tone-fits" }, [
      el("p", { text: venueTotal
        ? `${venueNote}: the venue page shows ${formatMoney(venueTotal, { exact: true })}. That is the venue, not the whole wedding. The split below is still the full wedding.`
        : `${venueNote} did not publish a price. The split below is the full wedding, not a venue quote.` }),
    ]) : null,
    el("p", { class: "kicker", text: userTotal ? "Your total, split" : "A typical split here" }),
    el("p", { class: "money", "data-total": "1", text: formatMoney(split.total, { exact: true }) }),
    el("p", { class: "subhead", text: `${plan.guests} guests · ${state.place.shortLabel}` }),
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
    el("p", { text: userTotal
      ? `Local planning figure: ${formatPlan(plan)}. The lines below add up to the total you typed.`
      : `This split adds up to the planning figure${plan.usingMidpoint ? ", using the middle of the estimated range" : ""}.` }),
    fitNote(fit),
    renderReferences(plan),
  ]);
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
  result.append(el("div", { class: "inline-actions no-print" }, [
    el("a", { class: "btn", href: siteHref(`/budget/per-guest?loc=${encodeURIComponent(state.place.id)}&g=${plan.guests}`), text: "Cost per guest" }),
    el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
    el("button", { class: "text-btn", type: "button", "data-print": "1", text: "Print" }),
  ]));
  result.append(renderMethod(plan));
  out.append(result);

  const list = el("div", { class: "stack", id: "categories" });
  list.append(el("section", { class: "card split-visual" }, [
    el("div", { html: donutSvg(split.lines, split.total) }),
    el("div", {}, [
      el("h2", { text: "Where it goes" }),
      el("p", { class: "hint", text: "Each slice is a share of the same total. The lines below are the dollars." }),
    ]),
  ]));
  for (const line of split.lines) {
    const share = split.total ? Math.round((line.amount / split.total) * 100) : 0;
    const card = el("article", { class: "cat" }, [
      el("div", { class: "cat-top" }, [
        el("h3", { text: line.label }),
        el("p", { class: "money-sm", text: formatMoney(line.amount, { exact: true }) }),
      ]),
      el("p", { class: "hint", text: line.plain }),
      el("div", { class: "meter" }, [el("span")]),
      el("p", { class: "hint", text: `${share}% of the total · ${line.basis === "fixed" ? "Stays put if the guest list changes" : "Grows with the guest list"}` }),
    ]);
    card.querySelector(".meter span").style.setProperty("--w", `${share}%`);
    if (line.note) {
      card.append(el("details", { class: "what" }, [
        el("summary", { text: "What's this?" }),
        el("p", { text: line.note }),
      ]));
    }
    list.append(card);
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
    compareOut.append(el("section", { class: "result" }, [
      el("p", { class: "kicker", text: "Same wedding, other place" }),
      el("h2", { text: state.compare.shortLabel }),
      el("p", { class: "money-sm", text: formatPlan(other) }),
      el("p", { class: "hint", text: other.tierLabel }),
      renderReferences(other),
    ]));
  }

  setSticky(formatMoney(split.total, { exact: true }), { label: "Categories", href: "#categories" });
  savePlan({
    loc: state.place.id,
    label: state.place.label,
    guests: plan.guests,
    total: split.total,
    kind: plan.kind,
    lines: split.lines.map((line) => ({ id: line.id, label: line.label, amount: line.amount })),
  });
  track("calc_complete", { tool: "budget", tier: state.place.tier });
}

function donutSvg(lines, total) {
  const colors = ["#1f4d3a", "#c4a574", "#c9847a", "#3d6b8c", "#6b8f71", "#8d6a4a", "#d08b74", "#4e463f", "#9aaf9a", "#b08968"];
  const r = 42;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const parts = lines.map((line, index) => {
    const frac = total ? line.amount / total : 0;
    const dash = Math.max(0, frac * c - 0.8);
    const rot = acc * 360 - 90;
    acc += frac;
    return `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${colors[index % colors.length]}" stroke-width="14" stroke-linecap="butt" stroke-dasharray="${dash} ${c - dash}" transform="rotate(${rot} 60 60)"><title>${line.label}</title></circle>`;
  }).join("");
  return `<svg class="donut" viewBox="0 0 120 120" role="img" aria-label="Budget split chart">${parts}<circle cx="60" cy="60" r="28" fill="#fffcf8"></circle></svg>`;
}
