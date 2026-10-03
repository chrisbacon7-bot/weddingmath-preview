/** Result copy and charts. Dollar figures come from the studies or from planFor. */

import { formatMoney, lowerFirst } from "./format.js";
import { categorySplit, guestsForBudget, offPeakRange, planFor } from "./estimate.js";

export function outsideStudy(costs) {
  const lines = [
    ["Rehearsal dinner", costs.extras.rehearsalDinnerKnot.value, "The Knot"],
    ["Engagement ring", costs.extras.engagementRingKnot.value, "The Knot"],
    ["Wedding rings", costs.extras.weddingRingsKnot.value, "The Knot"],
    ["Honeymoon", costs.honeymoon.knot.value, "The Knot"],
  ];
  return { total: lines.reduce((sum, line) => sum + line[1], 0), lines };
}

export function serviceOnFoodAndPlace(split, costs) {
  const base = split.lines
    .filter((line) => line.id === "venue" || line.id === "catering")
    .reduce((sum, line) => sum + line.amount, 0);
  const lowPct = costs.hidden.serviceChargeLowPct.value;
  const highPct = costs.hidden.serviceChargeHighPct.value;
  return { base, lowPct, highPct, low: base * (lowPct / 100), high: base * (highPct / 100) };
}

export function verdictFix(place, plan, budget, costs, options = {}) {
  const money = Number(budget);
  if (!place || !plan || !Number.isFinite(money) || money <= 0 || money >= (plan.kind === "range" ? plan.high : plan.value)) {
    return "An off-peak date can run 20–30% less at many vendors. That range is Zola's, not a promise.";
  }
  const solved = guestsForBudget(place, money, costs, options);
  const fitCount = solved.stretchGuests;
  if (fitCount && plan.guests > fitCount) {
    return `Trim about ${plan.guests - fitCount} guests, or look at an off-peak date (Zola's 20–30% range).`;
  }
  const peak = offPeakRange(plan.kind === "range" ? plan.low : plan.value);
  return `Even the low end is above this budget. Zola's 30% off-peak end would be about ${formatMoney(peak.low)}.`;
}

export function styleTiers(place, guests, costs) {
  const plan = planFor(place, guests, costs);
  if (plan.kind === "range") {
    return [
      { id: "simple", label: "Simple", total: plan.low, note: "Low end of the estimated range." },
      { id: "typical", label: "Typical", total: plan.planningTotal, note: "Middle of the estimated range." },
      { id: "elevated", label: "Elevated", total: plan.high, note: "High end of the estimated range." },
    ];
  }
  const knot = costs.national.knotAverage.value;
  const winter = costs.seasons.find((season) => season.id === "winter").value / knot;
  const summer = costs.seasons.find((season) => season.id === "summer").value / knot;
  return [
    { id: "simple", label: "Simple", total: plan.planningTotal * winter, note: "Planning figure times The Knot's winter average divided by the overall average." },
    { id: "typical", label: "Typical", total: plan.planningTotal, note: "The planning figure for this place." },
    { id: "elevated", label: "Elevated", total: plan.planningTotal * summer, note: "Planning figure times The Knot's summer average divided by the overall average." },
  ];
}

export function priorityMoves(before, after) {
  return after.lines.map((line) => {
    const prior = before.lines.find((item) => item.id === line.id);
    const delta = prior ? line.amount - prior.amount : 0;
    return { ...line, delta };
  });
}

export function rebalanceLines(lines, locks, total) {
  const lockedIds = Object.keys(locks);
  const lockedSum = lockedIds.reduce((sum, id) => sum + (Number(locks[id]) || 0), 0);
  const open = lines.filter((line) => !Object.prototype.hasOwnProperty.call(locks, line.id));
  const room = Math.round(total) - Math.round(lockedSum);
  const weights = open.map((line) => Math.max(line.baseAmount ?? line.amount, 1));
  const sum = weights.reduce((totalWeight, weight) => totalWeight + weight, 0);
  const raw = weights.map((weight) => (room * weight) / (sum || 1));
  const amounts = raw.map((value) => Math.max(0, Math.round(value)));
  let drift = room - amounts.reduce((totalAmount, value) => totalAmount + value, 0);
  let guard = 0;
  while (drift !== 0 && open.length && guard < 10000) {
    const index = guard % open.length;
    const step = drift > 0 ? 1 : -1;
    if (amounts[index] + step >= 0) {
      amounts[index] += step;
      drift -= step;
    }
    guard += 1;
  }
  let cursor = 0;
  return lines.map((line) => {
    if (Object.prototype.hasOwnProperty.call(locks, line.id)) {
      return { ...line, amount: Math.round(Number(locks[line.id]) || 0), locked: true };
    }
    const amount = amounts[cursor];
    cursor += 1;
    return { ...line, amount, locked: false };
  });
}

export function savingsSeries({ saved = 0, monthly = 0, months = 12, family = 0, target = 0 }) {
  const span = Math.max(1, Math.min(60, months));
  const rows = [];
  let fundedMonth = null;
  for (let month = 0; month <= span; month += 1) {
    const total = saved + family + monthly * month;
    rows.push({ month, total });
    if (fundedMonth == null && target > 0 && total >= target) fundedMonth = month;
  }
  return { rows, fundedMonth };
}

export function costCurve(place, costs, options = {}) {
  const points = [];
  for (let guests = 10; guests <= 400; guests += 20) {
    const plan = planFor(place, guests, costs, options);
    const value = plan.kind === "range" ? plan.planningTotal : plan.value;
    points.push({ guests, value });
  }
  return points;
}

export function groupLines(lines, total, keep = 6) {
  const top = lines.slice(0, keep);
  const rest = lines.slice(keep);
  const restAmount = rest.reduce((sum, line) => sum + line.amount, 0);
  const chart = rest.length
    ? [...top, { id: "rest", label: "Everything else", amount: restAmount, basis: "mixed" }]
    : top;
  return { chart, top, rest, restAmount, total };
}

export function fixedVariable(split) {
  const fixed = split.lines.filter((line) => line.basis === "fixed").reduce((sum, line) => sum + line.amount, 0);
  const variable = split.total - fixed;
  return { fixed, variable, total: split.total };
}

export function marginalPerGuest(place, guests, cut, costs, options = {}) {
  const plan = planFor(place, guests, costs, options);
  const smaller = planFor(place, Math.max(10, plan.guests - cut), costs, options);
  const used = Math.max(1, plan.guests - smaller.guests);
  if (plan.kind === "range") {
    return { low: (plan.low - smaller.low) / used, high: (plan.high - smaller.high) / used, guests: used };
  }
  return { value: (plan.value - smaller.value) / used, guests: used };
}

export function sentenceMoney(value, exact = false) {
  return lowerFirst(exact ? formatMoney(value, { exact: true }) : formatMoney(value));
}

export function plainSplit(plan, costs) {
  return categorySplit(plan, costs);
}
