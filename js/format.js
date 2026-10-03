/** Money formatting. Scaled estimates round to $10 so they don't look more precise than the studies. */

export function formatMoney(value, { exact = false } = {}) {
  if (!Number.isFinite(value)) return "—";
  const rounded = exact
    ? Math.round(value)
    : Math.abs(value) >= 1000
      ? Math.round(value / 10) * 10
      : Math.round(value);
  return rounded.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function lowerFirst(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

export function formatAbout(value, exact = false) {
  const money = formatMoney(value, { exact });
  return exact ? money : `About ${money}`;
}

export function formatRange(low, high) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return "—";
  return `About ${formatMoney(low)}–${formatMoney(high)}`;
}

export function formatPlan(plan) {
  if (!plan) return "—";
  if (plan.kind === "range") return formatRange(plan.low, plan.high);
  return formatAbout(plan.value, plan.exact);
}

export function formatPercent(ratio) {
  if (!Number.isFinite(ratio)) return "—";
  return `${Math.round(ratio * 100)}%`;
}
