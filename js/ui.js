import { el, formatMoney, siteHref } from "./common.js";
import { lowerFirst } from "./format.js";

const COLORS = ["#1f4d3a", "#c4a574", "#c9847a", "#3d6b8c", "#6b8f71", "#8d6a4a", "#d08b74", "#4e463f"];

export function bigResult(cards) {
  return el("div", { class: "big-result" }, cards.map((card) => el("article", {
    class: `big-card ${card.role || "plain"}`,
  }, [
    el("p", { class: "kicker", text: card.kicker }),
    el("p", { class: "money-sm", text: card.money }),
    card.note ? el("p", { class: "hint", text: card.note }) : null,
  ])));
}

export function verdictView(verdict, fix) {
  if (!verdict) return null;
  const box = el("div", { class: `verdict verdict-${verdict.tone}` }, [
    el("h3", { text: verdict.word }),
    el("p", { text: verdict.text }),
    fix ? el("p", { text: fix }) : null,
  ]);
  const legend = el("ul", { class: "verdict-legend" });
  for (const band of [
    ["fits", "Fits", "Budget covers the figure"],
    ["tight", "Tight", "Within 10%, or inside a range"],
    ["over", "Over", "More than 10% short"],
  ]) {
    legend.append(el("li", { class: verdict.tone === band[0] ? "is-on" : "" }, [
      el("strong", { text: band[1] }),
      el("span", { text: band[2] }),
    ]));
  }
  box.append(legend);
  return box;
}

export function means(text) {
  return el("div", { class: "means" }, [
    el("h3", { text: "What this number means" }),
    el("p", { text }),
  ]);
}

export function sourceStrip() {
  return el("p", { class: "source-strip" }, [
    el("span", { class: "freshness", text: "2026 studies · reviewed Oct 2026" }),
    document.createTextNode(" Sourced: The Knot Real Weddings Study (updated July 28, 2026) · Zola (March 6, 2026) · "),
    el("a", { href: siteHref("/sources"), text: "Sources" }),
  ]);
}

export function nextStep(href, label) {
  return el("p", { class: "next-step" }, [
    el("span", { text: "Next" }),
    el("a", { class: "btn", href, text: label }),
  ]);
}

export function presetBar(presets, onPick) {
  const row = el("div", { class: "presets" }, [
    el("p", { class: "label", text: "Start from an example" }),
  ]);
  const chips = el("div", { class: "choices" });
  for (const preset of presets) {
    const button = el("button", { type: "button", text: preset.label });
    button.addEventListener("click", () => onPick(preset));
    chips.append(button);
  }
  row.append(chips);
  return row;
}

export function copySummaryButton(getText) {
  const button = el("button", { class: "btn-ghost", type: "button", "data-copy-summary": "1", text: shareLabel() });
  button.addEventListener("click", async () => {
    const text = getText();
    const ok = await writeClipboard(text);
    const status = document.querySelector("[data-copy-status]");
    if (status) status.textContent = ok ? "Summary copied." : text;
    if (ok && navigator.share && shareLabel() === "Share") {
      try { await navigator.share({ text }); } catch { /* the copy already landed */ }
    }
  });
  return button;
}

export function shareLabel() {
  return typeof navigator !== "undefined" && navigator.share ? "Share" : "Copy summary";
}

export async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function summaryText(tool, lines) {
  return [`WeddingMath — ${tool}`, location.href, "", ...lines, "", "Estimate, not a quote."].join("\n");
}

export function donutChart(lines, total) {
  const r = 54;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const parts = lines.map((line, index) => {
    const frac = total ? line.amount / total : 0;
    const dash = Math.max(0, frac * c - 1);
    const rot = acc * 360 - 90;
    acc += frac;
    return `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${COLORS[index % COLORS.length]}" stroke-width="16" stroke-dasharray="${dash} ${c - dash}" transform="rotate(${rot} 80 80)"><title>${line.label}</title></circle>`;
  }).join("");
  const hole = formatMoney(total, { exact: true });
  const svg = `<svg class="donut" viewBox="0 0 160 160" role="img" aria-label="Budget split">${parts}<circle cx="80" cy="80" r="38" fill="#fffcf8"></circle><text x="80" y="84" text-anchor="middle" font-size="11" font-family="Inter, sans-serif" fill="#1c1917">${hole}</text></svg>`;
  const wrap = el("div", { class: "donut-wrap" });
  const figure = document.createElement("div");
  figure.innerHTML = svg;
  wrap.append(figure.firstChild);
  const legend = el("ul", { class: "donut-legend" });
  lines.forEach((line, index) => {
    const share = total ? Math.round((line.amount / total) * 100) : 0;
    const item = el("li", {}, [
      el("i", { style: `background:${COLORS[index % COLORS.length]}` }),
      el("button", { type: "button", text: `${line.label}` }),
      el("span", { text: `${formatMoney(line.amount, { exact: true })} · ${share}%` }),
    ]);
    item.querySelector("button").addEventListener("click", () => {
      document.getElementById(line.id === "rest" ? "smaller-lines" : `line-${line.id}`)?.scrollIntoView({ block: "center" });
    });
    legend.append(item);
  });
  wrap.append(legend);
  return wrap;
}

export function stackedBar(parts) {
  const total = parts.reduce((sum, part) => sum + part.amount, 0) || 1;
  const bar = el("div", { class: "stack-bar", role: "img", "aria-label": parts.map((part) => part.label).join(", ") });
  for (const part of parts) {
    bar.append(el("span", {
      style: `width:${(part.amount / total) * 100}%;background:${part.color}`,
      title: part.label,
    }));
  }
  const legend = el("ul", { class: "donut-legend" });
  for (const part of parts) {
    legend.append(el("li", {}, [
      el("i", { style: `background:${part.color}` }),
      el("span", { text: `${part.label} ${formatMoney(part.amount, { exact: true })}` }),
    ]));
  }
  return el("div", {}, [bar, legend]);
}

export function timelineChart(series, target) {
  const max = Math.max(target || 0, ...series.rows.map((row) => row.total), 1);
  const width = 320;
  const height = 120;
  const bars = series.rows.map((row, index) => {
    const barHeight = Math.max(2, (row.total / max) * 96);
    const x = 8 + index * ((width - 16) / series.rows.length);
    const y = 108 - barHeight;
    const funded = series.fundedMonth === row.month;
    return `<rect x="${x}" y="${y}" width="${Math.max(3, (width - 16) / series.rows.length - 3)}" height="${barHeight}" rx="2" fill="${funded ? "#c4a574" : "#1f4d3a"}"></rect>`;
  }).join("");
  const targetY = 108 - ((target || 0) / max) * 96;
  const line = target ? `<line x1="8" y1="${targetY}" x2="${width - 8}" y2="${targetY}" stroke="#7a2e28" stroke-dasharray="4 3"></line>` : "";
  const svg = el("div", { html: `<svg class="timeline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Savings by month">${bars}${line}</svg>` });
  return svg;
}

export function curveChart(points, budget, marks = []) {
  const max = Math.max(...points.map((point) => point.value), budget || 0, 1);
  const width = 320;
  const height = 120;
  const coords = points.map((point, index) => {
    const x = 8 + (index / (points.length - 1)) * (width - 16);
    const y = 108 - (point.value / max) * 96;
    return `${x},${y}`;
  }).join(" ");
  const budgetY = budget ? 108 - (budget / max) * 96 : null;
  const line = budgetY == null ? "" : `<line x1="8" y1="${budgetY}" x2="${width - 8}" y2="${budgetY}" stroke="#7a2e28" stroke-dasharray="4 3"></line>`;
  const dots = marks.filter((mark) => mark.guests).map((mark) => {
    const index = Math.max(0, Math.min(points.length - 1, Math.round((mark.guests - 10) / 20)));
    const point = points[index];
    const x = 8 + (index / (points.length - 1)) * (width - 16);
    const y = 108 - (point.value / max) * 96;
    return `<circle cx="${x}" cy="${y}" r="4" fill="${mark.color || "#c4a574"}"><title>${mark.label}</title></circle>`;
  }).join("");
  return el("div", { html: `<svg class="timeline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Cost by guest count"><polyline points="${coords}" fill="none" stroke="#1f4d3a" stroke-width="2"></polyline>${line}${dots}</svg>` });
}

export function embedSnippet(path) {
  const origin = "https://weddingmath.co";
  const code = `<iframe src="${origin}${path}" title="WeddingMath calculator" style="width:100%;min-height:640px;border:0"></iframe>`;
  const details = el("details", { class: "what embed-snip" }, [
    el("summary", { text: "Add this calculator to your site" }),
    el("p", { class: "hint", text: "The embed uses the public site. Figures stay the same as they are here." }),
    el("pre", { text: code }),
  ]);
  const button = el("button", { type: "button", class: "text-btn", text: "Copy embed" });
  button.addEventListener("click", () => writeClipboard(code));
  details.append(button);
  return details;
}

export { formatMoney, lowerFirst };
