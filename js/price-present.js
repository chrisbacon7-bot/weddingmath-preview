import { escapeHtml } from "./html.js";
import { formatMoney } from "./format.js";

export function allInHeadline(result) {
  if (!result || !result.allInReady) return "";
  const exact = { exact: true };
  if (result.low === result.high) return formatMoney(result.low, exact);
  return `${formatMoney(result.low, exact)}–${formatMoney(result.high, exact)}`;
}

export function allInHtml(result) {
  if (!result) return "";
  const rows = result.lines.map((row) => {
    const amount = row.low == null
      ? "Not published"
      : row.low === row.high
        ? formatMoney(row.low, { exact: true })
        : `${formatMoney(row.low, { exact: true })}–${formatMoney(row.high, { exact: true })}`;
    const chip = row.chipText ? `<span class="chip chip-${escapeHtml(row.chip)}">${escapeHtml(row.chipText)}</span>` : "";
    const source = row.sourceUrl
      ? `<a href="${escapeHtml(row.sourceUrl)}">Source</a>${row.verifiedOn ? ` · ${escapeHtml(row.verifiedOn)}` : ""}`
      : "";
    const stale = row.stale ? `<span class="chip">Stale, older than 12 months</span>` : "";
    const extra = row.inTotal === false ? " Not in the total." : "";
    return `<tr>
      <th scope="row">${escapeHtml(row.label)}${extra ? `<span class="hint">${extra}</span>` : ""}</th>
      <td>${amount}</td>
      <td>${chip} ${stale}</td>
      <td><p>${escapeHtml(row.note)}</p>${row.quote ? `<p class="hint">“${escapeHtml(row.quote)}”</p>` : ""}${source ? `<p class="hint">${source}</p>` : ""}</td>
    </tr>`;
  }).join("");
  const missing = result.missing.length
    ? `<p class="hint">Still missing: ${escapeHtml(result.missing.join(", "))}. Those lines are not treated as $0.</p>`
    : "";
  const review = result.review && result.review.filter(Boolean).length
    ? `<p class="hint">Needs a human look: ${escapeHtml(result.review.filter(Boolean).join(" "))}</p>`
    : "";
  const total = result.allInReady
    ? `<p class="hint">All-in ${allInHeadline(result)} for ${result.guests} guests on ${result.day === "off" ? "an off day" : "Saturday"}, ${result.season === "off" ? "off-peak" : "peak"} season. ${escapeHtml(result.chipText || "")}. Refundable deposits are not in the total. Prices change. Confirm with the venue before booking.</p>`
    : `<p class="hint">This is not an all-in total yet. A total is shown only when the site fee, food, service charge, and tax are each published or explicitly estimated.</p>`;
  return `<div class="fee-breakdown" data-allin>
    <h2>All-in breakdown</h2>
    ${total}
    ${missing}
    ${review}
    <div class="table-wrap">
      <table class="fee-table">
        <thead><tr><th scope="col">Line</th><th scope="col">Amount</th><th scope="col">Label</th><th scope="col">Where it came from</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="hint"><a href="/how-we-price">How these labels work</a>. Venue-verified and couple-reported labels exist for later and are not shown.</p>
  </div>`;
}
