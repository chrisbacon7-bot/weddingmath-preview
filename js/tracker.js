import { stillToPay } from "./tracker-math.js";
import { planFor, categorySplit } from "./estimate.js";
import { describe } from "./describe.js";
import {
  bindGlobals, clear, el, formatMoney, loadData, parseMoney, readParams, registerSummary, setSticky, storageGet, storageSet,
} from "./common.js";
import { summaryText, writeClipboard } from "./ui.js";

const KEY = "tracker";
bindGlobals();

const defaults = [
  "Venue", "Food", "Drinks", "Photographer", "Flowers", "Music",
  "Wedding clothes", "Videographer", "Planner", "Everything else",
];

let storedRows = storageGet(KEY, null);
let rows = Array.isArray(storedRows) ? storedRows : defaults.map(blank);
let undo = null;
let guestCount = Number(storageGet("guests", 150)) || 150;
let bufferPct = 10;

const list = document.querySelector("#lines");
const summary = document.querySelector("#summary");
const params = readParams();

document.querySelector("#add-line").addEventListener("click", () => {
  rows.push(blank("New line"));
  paint();
});
document.querySelector("#use-plan").addEventListener("click", () => usePlan(false));
document.querySelector("#export-csv").addEventListener("click", exportCsv);
document.querySelector("#export-ics").addEventListener("click", exportIcs);
document.querySelector("#share-tracker").addEventListener("click", shareTracker);
document.querySelector("#import-csv").addEventListener("change", importCsv);
document.querySelector("#buffer").addEventListener("input", () => {
  bufferPct = Math.max(0, Number(document.querySelector("#buffer").value) || 0);
  paintSummary();
});
document.querySelector("#tracker-guests").addEventListener("input", () => {
  const typed = Number(document.querySelector("#tracker-guests").value);
  guestCount = Number.isFinite(typed) && typed > 0 ? typed : guestCount;
  paintSummary();
});
document.querySelector("#sample-austin").addEventListener("click", () => loadSample());
document.querySelector("#copy-summary").addEventListener("click", async () => {
  const text = summaryText("Budget tracker", [
    `Budget ${formatMoney(sum("budget"), { exact: true })}`,
    `Quoted ${formatMoney(sum("quoted"), { exact: true })}`,
    `Paid ${formatMoney(sum("paid"), { exact: true })}`,
    `Still to pay ${formatMoney(stillToPay(rows), { exact: true })}`,
  ]);
  const ok = await writeClipboard(text);
  document.querySelector("#tracker-note").textContent = ok ? "Summary copied." : text;
});
document.querySelector("#sample-blank").addEventListener("click", () => {
  if (!untouched() && !window.confirm("Clear every line in this tracker?")) return;
  rows = [];
  paint();
});

const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
if (hash.get("t")) {
  const decoded = decode(hash.get("t"));
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  if (Array.isArray(decoded) && decoded.length) {
    const incoming = decoded.map((row) => ({ ...blank(""), ...row }));
    const same = JSON.stringify(rows) === JSON.stringify(incoming);
    const replace = same || window.confirm("This link has a shared tracker. Replace the list saved in this browser?");
    if (replace) rows = incoming;
  }
}

if (params.get("fill") === "plan") {
  const plan = storageGet("plan", null);
  if (plan && plan.lines) {
    if (untouched() || window.confirm("Replace this tracker with your budget split? Quotes, payments, due dates, and vendors on the current lines will be cleared.")) {
      applyPlan(plan);
    }
  }
  const url = new URL(location.href);
  url.searchParams.delete("fill");
  history.replaceState(null, "", `${url.pathname}${url.search}`);
}

const guestField = document.querySelector("#tracker-guests");
if (guestField && !guestField.value) guestField.value = String(guestCount);
offerPlan();
paint();

function blank(name) {
  return { name, budget: "", quoted: "", paid: "", due: "", vendor: "" };
}

function untouched() {
  return rows.every((row) => !row.quoted && !row.paid && !row.due && !row.vendor);
}

function offerPlan() {
  const plan = storageGet("plan", null);
  const note = document.querySelector("#tracker-note");
  if (!plan || !plan.lines || !untouched() || !note) return;
  note.textContent = "";
  note.append(document.createTextNode(`You have a ${plan.label || "saved"} split for ${plan.guests || "your"} guests — use it? `));
  const button = el("button", { type: "button", class: "text-btn", text: "Use it" });
  button.addEventListener("click", () => usePlan(true));
  note.append(button);
}

function usePlan(force) {
  const plan = storageGet("plan", null);
  if (!plan || !plan.lines) {
    document.querySelector("#tracker-note").textContent = "Open the budget breakdown first. Then come back and this can fill the budget column.";
    return;
  }
  const dirty = rows.some((row) => row.quoted || row.paid || row.due || row.vendor);
  if (!force && dirty && !window.confirm("Replace this tracker with your budget split? Quotes, payments, due dates, and vendors on the current lines will be cleared.")) {
    return;
  }
  applyPlan(plan);
  document.querySelector("#tracker-note").textContent = `Budgets filled from your ${plan.label || "last"} split. Quotes and payments were cleared. Type the new ones.`;
}

function applyPlan(plan) {
  rows = plan.lines.map((line) => ({
    ...blank(line.label),
    budget: line.amount,
  }));
  if (plan.guests) {
    guestCount = plan.guests;
    const field = document.querySelector("#tracker-guests");
    if (field) field.value = String(plan.guests);
  }
  paint();
}

async function loadSample() {
  if (!untouched() && !window.confirm("Replace this tracker with the Austin sample?")) return;
  const data = await loadData();
  const place = describe("metro:12420", data.ctx);
  const plan = planFor(place, 150, data.costs);
  const split = categorySplit(plan, data.costs);
  rows = split.lines.map((line, index) => ({
    ...blank(line.label),
    budget: line.amount,
    quoted: index % 2 === 0 ? line.amount : "",
    paid: index % 2 === 0 ? Math.round(line.amount / 2) : "",
    due: index % 2 === 0 ? offsetDate(30 + index) : "",
  }));
  guestCount = 150;
  document.querySelector("#tracker-guests").value = "150";
  document.querySelector("#tracker-note").textContent = "Sample uses the Austin planning split at 150 guests. Even lines are quoted and half paid so you can see the schedule. Replace them with your contracts.";
  paint();
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function paint() {
  storageSet(KEY, rows);
  clear(list);
  const head = el("div", { class: "tracker-head", role: "row" }, ["Category", "Budget", "Quoted", "Paid", "Due", "Vendor", ""].map((label) => el("span", { text: label })));
  list.append(head);
  rows.forEach((row, index) => {
    const owed = committed(row);
    const paid = Number(row.paid) || 0;
    const budget = Number(row.budget) || 0;
    const quoted = Number(row.quoted) || 0;
    const variance = quoted && budget ? quoted - budget : 0;
    const card = el("article", { class: "line-card tracker-row" });
    const mobile = el("p", { class: "mobile-line" });
    mobile.textContent = `${row.name || "Line"}${quoted ? ` · ${formatMoney(quoted, { exact: true })} quoted` : ""}${owed ? ` · ${formatMoney(Math.max(0, owed - paid), { exact: true })} owed` : ""}${row.due ? ` · due ${row.due}` : ""}`;
    const open = el("button", { type: "button", class: "edit-line", text: "Edit" });
    open.addEventListener("click", () => card.classList.toggle("is-open"));
    mobile.append(open);
    card.append(mobile);
    const fields = el("div", { class: "tracker-fields" });
    const name = field("Category", row.name, "text", (value) => { row.name = value; paintSummary(); mobile.firstChild.textContent = value; });
    const remove = el("button", { class: "text-btn", type: "button", text: "Remove" });
    remove.addEventListener("click", () => removeRow(index));
    const sync = (key) => (value) => {
      row[key] = key === "due" || key === "vendor" ? value : (parseMoney(value) ?? "");
      paintSummary();
      updateFlag(card, row);
    };
    fields.append(name);
    fields.append(field("Budget", row.budget, "money", sync("budget")));
    fields.append(field("Quoted", row.quoted, "money", sync("quoted")));
    fields.append(field("Paid", row.paid, "money", sync("paid")));
    fields.append(field("Due date", row.due, "date", sync("due")));
    fields.append(field("Vendor", row.vendor, "text", (value) => { row.vendor = value; storageSet(KEY, rows); }));
    fields.append(remove);
    card.append(fields);
    if (variance) {
      card.append(el("p", { class: variance > 0 ? "due-over" : "hint", text: `Quoted vs budget ${variance > 0 ? "+" : "−"}${formatMoney(Math.abs(variance), { exact: true })} (${budget ? Math.round((Math.abs(variance) / budget) * 100) : 0}%).` }));
    }
    const flag = dueFlag(row);
    if (flag) card.append(el("p", { class: flag.className, text: flag.text }));
    if (variance > 0) card.classList.add("is-over");
    list.append(card);
  });
  paintSchedule();
  paintBars();
  paintSummary();
}

function removeRow(index) {
  const removed = rows[index];
  rows.splice(index, 1);
  undo = { row: removed, index };
  paint();
  showToast(removed);
}

function showToast(row) {
  document.querySelector(".toast")?.remove();
  const toast = el("div", { class: "toast", role: "status" }, [
    el("span", { text: `Removed ${row.name || "line"}` }),
  ]);
  const button = el("button", { type: "button", class: "btn-ghost", text: "Undo" });
  button.addEventListener("click", () => {
    if (!undo) return;
    rows.splice(undo.index, 0, undo.row);
    undo = null;
    toast.remove();
    paint();
  });
  toast.append(button);
  document.body.append(toast);
  setTimeout(() => {
    if (toast.isConnected) toast.remove();
    undo = null;
  }, 6000);
}

function field(label, value, type, onInput) {
  const id = `f-${label}-${Math.random().toString(36).slice(2, 7)}`;
  const shown = type === "money" && value !== "" && value != null ? Math.round(Number(value) || 0).toLocaleString("en-US") : (value ?? "");
  const input = el("input", {
    id,
    type: type === "date" ? "date" : "text",
    value: shown,
    inputmode: type === "money" ? "numeric" : null,
    "aria-label": label,
  });
  input.addEventListener("input", () => onInput(input.value));
  return el("div", {}, [el("label", { for: id, text: label }), input]);
}

function paintSummary() {
  storageSet(KEY, rows);
  const budget = sum("budget");
  const quoted = sum("quoted");
  const paid = sum("paid");
  const left = stillToPay(rows);
  const ceiling = Math.round(budget * (1 + bufferPct / 100));
  const committedTotal = rows.reduce((total, row) => total + committed(row), 0);
  clear(summary);
  const items = [
    ["Budget", budget, ""],
    ["Quoted", quoted, budget ? delta(quoted, budget) : ""],
    ["Paid", paid, committedTotal ? `${Math.round((paid / committedTotal) * 100)}% of committed` : ""],
    ["Still to pay", left, ""],
  ];
  for (const [label, amount, extra] of items) {
    summary.append(el("article", { class: "card" }, [
      el("p", { class: "kicker", text: label }),
      el("p", { class: "money-sm", text: formatMoney(amount, { exact: true }) }),
      extra ? el("p", { class: "hint", text: extra }) : null,
    ]));
  }
  summary.append(verdictBanner(budget, quoted, ceiling));
  if (guestCount > 0 && committedTotal) {
    summary.append(el("article", { class: "card" }, [
      el("p", { class: "kicker", text: "Committed per guest" }),
      el("p", { class: "money-sm", text: formatMoney(committedTotal / guestCount, { exact: true }) }),
    ]));
  }
  const progress = el("div", { class: "bar-row" }, [
    el("span", { text: "Paid" }),
    el("div", { class: "bar-track" }, [el("span", { style: `width:${committedTotal ? Math.min(100, (paid / committedTotal) * 100) : 0}%;background:#1f4d3a` })]),
  ]);
  summary.append(el("p", { text: `Paid ${formatMoney(paid, { exact: true })} of ${formatMoney(committedTotal, { exact: true })} committed${committedTotal ? ` (${Math.round((paid / committedTotal) * 100)}%)` : ""}.` }));
  summary.append(progress);
  setSticky(formatMoney(left, { exact: true }), { kicker: "Still to pay", label: "Lines", href: "#lines" });
  registerSummary(() => summaryText("Budget tracker", [
    `Budget ${formatMoney(budget, { exact: true })}`,
    `Quoted ${formatMoney(quoted, { exact: true })}`,
    `Paid ${formatMoney(paid, { exact: true })}`,
    `Still to pay ${formatMoney(left, { exact: true })}`,
  ]));
}

function verdictBanner(budget, quoted, ceiling) {
  let word = "Start here";
  let text = "Add quotes as they come in. The budget column is the plan.";
  if (quoted > 0 && budget > 0 && quoted <= budget) {
    word = "Under budget";
    text = `Quotes are ${formatMoney(budget - quoted, { exact: true })} under the ${formatMoney(budget, { exact: true })} plan.`;
  } else if (quoted > budget && quoted <= ceiling) {
    word = "Inside the buffer";
    text = `Quotes are ${formatMoney(quoted - budget, { exact: true })} over the plan and inside the ${formatMoney(ceiling, { exact: true })} ceiling.`;
  } else if (quoted > ceiling && budget > 0) {
    word = "Over the ceiling";
    text = `Quotes are ${formatMoney(quoted - ceiling, { exact: true })} past the ${formatMoney(ceiling, { exact: true })} ceiling.`;
  } else if (budget > 0 && quoted === 0) {
    word = "Plan set";
    text = `The plan is ${formatMoney(budget, { exact: true })}. The ceiling with a ${bufferPct}% buffer is ${formatMoney(ceiling, { exact: true })}.`;
  }
  return el("article", { class: `card verdict verdict-${word === "Over the ceiling" ? "over" : word === "Inside the buffer" ? "tight" : "fits"}` }, [
    el("h3", { text: word }),
    el("p", { text }),
  ]);
}

function delta(quoted, budget) {
  const gap = quoted - budget;
  if (!gap) return "Matches the plan";
  return `${gap > 0 ? "+" : "−"}${formatMoney(Math.abs(gap), { exact: true })} vs budget`;
}

function paintSchedule() {
  const box = document.querySelector("#schedule");
  if (!box) return;
  clear(box);
  const upcoming = rows
    .filter((row) => row.due && (committed(row) > (Number(row.paid) || 0)))
    .map((row) => ({ ...row, days: daysUntil(row.due), open: Math.max(0, committed(row) - (Number(row.paid) || 0)) }))
    .filter((row) => row.days != null)
    .sort((a, b) => a.days - b.days);
  const windows = [30, 60, 90].map((span) => {
    const total = upcoming.filter((row) => row.days >= 0 && row.days <= span).reduce((sum, row) => sum + row.open, 0);
    return el("p", { text: `${formatMoney(total, { exact: true })} due in the next ${span} days.` });
  });
  box.append(el("h2", { text: "Upcoming payments" }), ...windows);
  if (upcoming.length) {
    const listEl = el("ul");
    for (const row of upcoming.slice(0, 8)) {
      listEl.append(el("li", { text: `${row.name || "Line"} · ${formatMoney(row.open, { exact: true })} · ${row.due}` }));
    }
    box.append(listEl);
  }
}

function paintBars() {
  const box = document.querySelector("#bars");
  if (!box) return;
  clear(box);
  box.append(el("h2", { text: "Budget, quote, and paid" }));
  const max = Math.max(1, ...rows.map((row) => Math.max(Number(row.budget) || 0, Number(row.quoted) || 0, Number(row.paid) || 0)));
  for (const row of rows) {
    if (!row.name && !row.budget && !row.quoted) continue;
    const wrap = el("div", {});
    wrap.append(el("p", { text: row.name || "Line" }));
    for (const [key, color] of [["budget", "#d9cbbd"], ["quoted", "#1f4d3a"], ["paid", "#c4a574"]]) {
      const amount = Number(row[key]) || 0;
      wrap.append(el("div", { class: "bar-row" }, [
        el("span", { text: key }),
        el("div", { class: "bar-track" }, [el("span", { style: `width:${(amount / max) * 100}%;background:${color}` })]),
      ]));
    }
    box.append(wrap);
  }
}

function committed(row) {
  const quoted = Number(row.quoted);
  if (Number.isFinite(quoted) && row.quoted !== "" && quoted > 0) return quoted;
  return Number(row.budget) || 0;
}

function sum(key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function updateFlag(card, row) {
  card.querySelector(".due-soon, .due-over")?.remove();
  const flag = dueFlag(row);
  if (flag) card.append(el("p", { class: flag.className, text: flag.text }));
}

function dueFlag(row) {
  if (!row.due) return null;
  const due = new Date(`${row.due}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const owed = committed(row);
  const paid = Number(row.paid) || 0;
  if (owed && paid >= owed) return null;
  const days = daysUntil(row.due);
  if (days == null) return null;
  if (days < 0) return { className: "due-over", text: `Due date passed${owed ? `, ${formatMoney(owed - paid, { exact: true })} still open` : ""}.` };
  if (days <= 30) return { className: "due-soon", text: days === 0 ? "Due today." : `Due in ${days} days.` };
  return null;
}

function daysUntil(value) {
  const due = new Date(`${value}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function exportCsv() {
  const header = ["Category", "Budget", "Quoted", "Paid", "Due date", "Vendor"];
  const body = rows.map((row) => [row.name, row.budget, row.quoted, row.paid, row.due, row.vendor]);
  const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");
  download(`wedding-budget.csv`, new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
}

function exportIcs() {
  const events = rows.filter((row) => row.due).map((row) => {
    const stamp = row.due.replace(/-/g, "");
    const open = Math.max(0, committed(row) - (Number(row.paid) || 0));
    return [
      "BEGIN:VEVENT",
      `UID:${stamp}-${(row.name || "line").replace(/\s+/g, "")}@weddingmath.co`,
      `DTSTART;VALUE=DATE:${stamp}`,
      `SUMMARY:Pay ${row.name || "wedding line"}${open ? ` (${formatMoney(open, { exact: true })})` : ""}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WeddingMath//Tracker//EN", ...events, "END:VCALENDAR"].join("\r\n");
  download("wedding-payments.ics", new Blob([ics], { type: "text/calendar" }));
}

function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const link = el("a", { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function importCsv(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = parseCsv(String(reader.result || ""));
    if (!parsed.length) {
      document.querySelector("#tracker-note").textContent = "That file didn't have any tracker rows.";
      return;
    }
    if (!untouched() && !window.confirm("Replace this tracker with the CSV?")) return;
    rows = parsed;
    paint();
  };
  reader.readAsText(file);
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const cells = splitCsv(line);
    return {
      name: cells[0] || "",
      budget: cells[1] || "",
      quoted: cells[2] || "",
      paid: cells[3] || "",
      due: cells[4] || "",
      vendor: cells[5] || "",
    };
  });
}

function splitCsv(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells;
}

async function shareTracker() {
  const encoded = encode(rows);
  const url = `${location.origin}${location.pathname}#t=${encoded}`;
  if (url.length > 1800) {
    document.querySelector("#tracker-note").textContent = "This tracker is too long for a link. Export the CSV and send that.";
    return;
  }
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  try {
    await navigator.clipboard.writeText(url);
    document.querySelector("#tracker-note").textContent = "Link copied. Opening it asks before it replaces the tracker saved in that browser.";
  } catch {
    document.querySelector("#tracker-note").textContent = url;
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function encode(value) {
  const json = JSON.stringify(value);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode(value) {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch {
    return null;
  }
}
