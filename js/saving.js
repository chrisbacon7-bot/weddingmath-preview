/**
 * Savings math for the money guides.
 * Every dollar comes from planFor, categorySplit, or a published figure in costs.json.
 * No DIY percent and no extra discount beyond Zola's 20–30% off-peak range.
 */

import { categorySplit, planFor } from "./estimate.js";
import { formatMoney, formatPlan, formatRange } from "./format.js";

export function lineSum(lines, ids) {
  const want = new Set(ids || []);
  return (lines || []).filter((line) => want.has(line.id)).reduce((sum, line) => sum + line.amount, 0);
}

export function planTotal(plan) {
  if (!plan) return null;
  return plan.kind === "range" ? plan.planningTotal : plan.value;
}

export function offPeakBand(total, costs) {
  const lowPct = costs.hidden.offPeakSavingsLowPct.value;
  const highPct = costs.hidden.offPeakSavingsHighPct.value;
  const saveLow = total * (lowPct / 100);
  const saveHigh = total * (highPct / 100);
  return {
    lowPct,
    highPct,
    saveLow,
    saveHigh,
    remainHigh: total - saveLow,
    remainLow: total - saveHigh,
  };
}

export function quoteGap(planned, quote) {
  if (quote == null || quote === "") return null;
  const q = Number(String(quote).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(q) || q < 0) return null;
  return { planned, quote: q, gap: q - planned };
}

/** Same 10% band as compareBudget, pointed at a vendor quote instead of a budget. */
export function quoteVerdict(planned, quote) {
  const gap = quoteGap(planned, quote);
  if (!gap || !Number.isFinite(gap.planned) || gap.planned <= 0) return null;
  const plannedText = formatMoney(gap.planned);
  if (gap.gap <= 0) {
    return {
      tone: "fits",
      word: "Fits",
      text: `Fits — ${formatMoney(Math.abs(gap.gap))} under the ${plannedText} study line.`,
    };
  }
  if (gap.quote <= gap.planned * 1.1) {
    return {
      tone: "tight",
      word: "Tight",
      text: `Tight — ${formatMoney(gap.gap)} over the ${plannedText} study line (within 10%).`,
    };
  }
  const pct = Math.round((gap.gap / gap.planned) * 100);
  return {
    tone: "over",
    word: "Over",
    text: `Over — ${formatMoney(gap.gap)} over the ${plannedText} study line (${pct}%).`,
  };
}

export function diyGap(hired, supplies) {
  if (supplies == null || supplies === "") return null;
  const n = Number(String(supplies).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return { hired, supplies: n, saved: hired - n };
}

export function publishedBandGap(costs) {
  const dj = costs.categories.find((cat) => cat.id === "dj").amount;
  const band = costs.extras.liveBandKnot.value;
  return { dj, band, gap: band - dj };
}

export function trimSavings(place, guests, keep, costs) {
  const from = planFor(place, guests, costs);
  const to = planFor(place, keep, costs);
  const fromTotal = planTotal(from);
  const toTotal = planTotal(to);
  return {
    from,
    to,
    fromTotal,
    toTotal,
    saved: fromTotal - toTotal,
    cut: from.guests - to.guests,
  };
}

export function guideSnapshot(guide, place, guests, costs, input = {}) {
  const plan = planFor(place, guests, costs);
  const total = planTotal(plan);
  const where = `${plan.guests} guests · ${place.shortLabel}`;
  if (guide.kind === "offpeak") return offpeakSnapshot(plan, total, where, costs, guide);
  if (guide.kind === "trim") return trimSnapshot(place, plan, costs, input, where, guide);
  if (guide.kind === "diy") return diySnapshot(plan, costs, input, where, guide);
  if (guide.kind === "band") return bandSnapshot(plan, costs, where, guide);
  return linesSnapshot(plan, costs, input, where, guide);
}

function linesSnapshot(plan, costs, input, where, guide) {
  const split = categorySplit(plan, costs);
  const picked = split.lines.filter((line) => guide.lineIds.includes(line.id));
  const sum = picked.reduce((acc, line) => acc + line.amount, 0);
  const names = picked.map((line) => line.label).join(", ");
  const quote = quoteGap(sum, input.quote);
  const cards = [
    {
      role: "main",
      kicker: guide.cardKicker,
      money: formatMoney(sum),
      note: `${names}. These lines are scaled so the whole split matches the planning total.`,
    },
    { role: "plain", kicker: "Planning total", money: formatPlan(plan), note: where },
    {
      role: "gap",
      kicker: "Your quote",
      money: quote ? formatMoney(quote.quote) : "—",
      note: quote
        ? `${formatMoney(Math.abs(quote.gap))} ${quote.gap > 0 ? "over" : "under"} the study line.`
        : "Type a quote to see the gap. No quote is invented.",
    },
  ];
  return pack(guide, cards, quoteVerdict(sum, input.quote), where);
}

function offpeakSnapshot(plan, total, where, costs, guide) {
  const band = offPeakBand(total, costs);
  const remain = formatRange(band.remainLow, band.remainHigh);
  const save = formatRange(band.saveLow, band.saveHigh);
  const cards = [
    { role: "main", kicker: "Planning total", money: formatPlan(plan), note: `${where}. This figure is not discounted.` },
    {
      role: "plain",
      kicker: `If vendors take ${band.lowPct}–${band.highPct}% off`,
      money: remain,
      note: "What would be left. Zola's published range, not a new average.",
    },
    {
      role: "gap",
      kicker: "The discount itself",
      money: save,
      note: `Zola: weekday or winter dates often run ${band.lowPct}–${band.highPct}% less at many vendors.`,
    },
  ];
  const verdict = {
    tone: "tight",
    word: "Range",
    text: `The planning figure stays ${formatPlan(plan)}. Zola's ${band.lowPct}–${band.highPct}% off-peak range would leave ${remain}. That discount is not applied until a vendor puts it in the contract.`,
  };
  return pack(guide, cards, verdict, where);
}

function trimSnapshot(place, plan, costs, input, where, guide) {
  const asked = Number(input.keep);
  const keep = Number.isFinite(asked) ? asked : Math.max(10, plan.guests - 10);
  const trimmed = trimSavings(place, plan.guests, keep, costs);
  const cards = [
    {
      role: "main",
      kicker: trimmed.cut > 0 ? "Saved by the shorter list" : "Change in the planning figure",
      money: formatMoney(trimmed.saved),
      note: trimmed.cut > 0
        ? `${trimmed.cut} fewer guests. Food and the other per-guest lines shrink. The venue and the photographer stay.`
        : "The shorter list is not shorter than the one you started with.",
    },
    { role: "plain", kicker: "Still invited", money: String(trimmed.to.guests), note: "Guest count after the cut." },
    { role: "gap", kicker: "Shorter list", money: formatPlan(trimmed.to), note: where },
  ];
  const verdict = trimmed.cut <= 0
    ? { tone: "tight", word: "Same", text: "The shorter list is the same size as the one you started with." }
    : {
      tone: "fits",
      word: "Lower",
      text: `A list of ${trimmed.to.guests} is ${formatMoney(trimmed.saved)} under the ${trimmed.from.guests}-guest figure. The model drops food and the other per-guest lines. The venue and the photographer stay.`,
    };
  return pack(guide, cards, verdict, where);
}

function diySnapshot(plan, costs, input, where, guide) {
  const split = categorySplit(plan, costs);
  const sum = lineSum(split.lines, guide.lineIds);
  const gap = diyGap(sum, input.supplies);
  const names = split.lines.filter((line) => guide.lineIds.includes(line.id)).map((line) => line.label).join(", ");
  const cards = [
    {
      role: "main",
      kicker: "Hired lines",
      money: formatMoney(sum),
      note: `${names}. There is no published price for doing this yourself.`,
    },
    {
      role: "plain",
      kicker: "Supplies you typed",
      money: gap ? formatMoney(gap.supplies) : "—",
      note: gap ? "Your number. Not a study figure." : "Type a supply cost. Until then, this stays blank.",
    },
    {
      role: "gap",
      kicker: "Hired lines minus supplies",
      money: gap ? formatMoney(gap.saved) : "—",
      note: gap ? "The gap uses only those two numbers." : "No savings figure until you type a supply cost.",
    },
  ];
  let verdict = null;
  if (gap && gap.saved >= 0) {
    verdict = {
      tone: "fits",
      word: "Fits",
      text: `Fits — supplies at ${formatMoney(gap.supplies)} are ${formatMoney(gap.saved)} under those hired lines. There is no published DIY percent. This is your number against the study lines.`,
    };
  } else if (gap) {
    verdict = {
      tone: "over",
      word: "Over",
      text: `Over — supplies at ${formatMoney(gap.supplies)} are ${formatMoney(Math.abs(gap.saved))} over those hired lines.`,
    };
  }
  return pack(guide, cards, verdict, where);
}

function bandSnapshot(plan, costs, where, guide) {
  const published = publishedBandGap(costs);
  const split = categorySplit(plan, costs);
  const djLine = lineSum(split.lines, ["dj"]);
  const cards = [
    {
      role: "main",
      kicker: "Published band minus DJ",
      money: formatMoney(published.gap, { exact: true }),
      note: "Both figures are national Knot averages. They are not blended into one price.",
    },
    { role: "plain", kicker: "DJ average", money: formatMoney(published.dj, { exact: true }), note: "The Knot, among couples who hired a DJ." },
    { role: "gap", kicker: "Live band average", money: formatMoney(published.band, { exact: true }), note: "The Knot. This average is not inside the budget split." },
  ];
  const verdict = {
    tone: "fits",
    word: "Published",
    text: `The Knot's live-band average is ${formatMoney(published.band, { exact: true })} and the DJ average is ${formatMoney(published.dj, { exact: true })}. The gap is ${formatMoney(published.gap, { exact: true })}. Your split's music line is ${formatMoney(djLine)} at this guest count. The band average is not mixed into that line.`,
  };
  return pack(guide, cards, verdict, where);
}

function pack(guide, cards, verdict, where) {
  return {
    cards,
    verdict,
    means: guide.means,
    sticky: cards[0].money,
    summaryLines: [where, `${cards[0].kicker}: ${cards[0].money}`, verdict ? verdict.text : "No comparison yet."],
  };
}
