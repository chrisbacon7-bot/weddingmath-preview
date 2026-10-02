import {
  bindGlobals, clear, el, formatMoney, storageGet, storageSet,
} from "./common.js";

const KEY = "tracker";
bindGlobals();

const defaults = [
  "Venue", "Food", "Drinks", "Photographer", "Flowers", "Music",
  "Wedding clothes", "Videographer", "Planner", "Everything else",
];

let rows = storageGet(KEY, null);
if (!Array.isArray(rows) || !rows.length) rows = defaults.map(blank);

const list = document.querySelector("#lines");
const summary = document.querySelector("#summary");

document.querySelector("#add-line").addEventListener("click", () => {
  rows.push(blank("New line"));
  paint();
});
document.querySelector("#use-plan").addEventListener("click", () => {
  const plan = storageGet("plan", null);
  if (!plan || !plan.lines) {
    document.querySelector("#tracker-note").textContent = "Open the budget breakdown first. Then come back and this can fill the budget column.";
    return;
  }
  rows = plan.lines.map((line) => ({
    ...blank(line.label),
    budget: line.amount,
  }));
  document.querySelector("#tracker-note").textContent = `Budgets filled from your ${plan.label || "last"} split. Quotes and payments stay yours to type.`;
  paint();
});
document.querySelector("#export-csv").addEventListener("click", () => {
  const header = ["Category", "Budget", "Quoted", "Paid", "Due date", "Vendor"];
  const body = rows.map((row) => [row.name, row.budget, row.quoted, row.paid, row.due, row.vendor]);
  const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = el("a", { href: url, download: "wedding-budget.csv" });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});
document.querySelector("#share-tracker").addEventListener("click", async () => {
  const encoded = encode(rows);
  const url = `${location.origin}${location.pathname}#t=${encoded}`;
  if (url.length > 1800) {
    document.querySelector("#tracker-note").textContent = "This tracker is too long for a link. Export the CSV and send that.";
    return;
  }
  history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url);
    document.querySelector("#tracker-note").textContent = "Link copied. Anyone with it can open this tracker. It also stays in this browser.";
  } catch {
    document.querySelector("#tracker-note").textContent = url;
  }
});

const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
if (hash.get("t")) {
  const decoded = decode(hash.get("t"));
  if (Array.isArray(decoded) && decoded.length) {
    rows = decoded.map((row) => ({ ...blank(""), ...row }));
  }
}

paint();

function blank(name) {
  return { name, budget: "", quoted: "", paid: "", due: "", vendor: "" };
}

function paint() {
  storageSet(KEY, rows);
  clear(list);
  rows.forEach((row, index) => {
    const card = el("article", { class: "line-card" });
    const name = field("Category", row.name, "text", (value) => { row.name = value; paintSummary(); });
    const remove = el("button", { class: "text-btn", type: "button", text: "Remove" });
    remove.addEventListener("click", () => {
      rows.splice(index, 1);
      paint();
    });
    card.append(el("header", {}, [name, remove]));
    const grid = el("div", { class: "grid-2" });
    const sync = (key) => (value) => {
      row[key] = value;
      paintSummary();
      updateFlag(card, row);
    };
    grid.append(field("Budget", row.budget, "number", sync("budget")));
    grid.append(field("Quoted", row.quoted, "number", sync("quoted")));
    grid.append(field("Paid", row.paid, "number", sync("paid")));
    grid.append(field("Due date", row.due, "date", sync("due")));
    card.append(grid);
    card.append(field("Vendor", row.vendor, "text", (value) => { row.vendor = value; storageSet(KEY, rows); }));
    const flag = dueFlag(row);
    if (flag) card.append(el("p", { class: flag.className, text: flag.text }));
    list.append(card);
  });
  paintSummary();
}

function field(label, value, type, onInput) {
  const id = `f-${label}-${Math.random().toString(36).slice(2, 7)}`;
  const input = el("input", { id, type, value: value ?? "", inputmode: type === "number" ? "decimal" : null });
  if (type === "number") input.min = "0";
  input.addEventListener("input", () => onInput(input.value));
  return el("div", {}, [el("label", { for: id, text: label }), input]);
}

function paintSummary() {
  storageSet(KEY, rows);
  const budget = sum("budget");
  const quoted = sum("quoted");
  const paid = sum("paid");
  const left = Math.max(0, (quoted || budget) - paid);
  clear(summary);
  const items = [
    ["Budget", budget],
    ["Quoted", quoted],
    ["Paid", paid],
    ["Still to pay", left],
  ];
  for (const [label, amount] of items) {
    summary.append(el("article", { class: "card" }, [
      el("p", { class: "kicker", text: label }),
      el("p", { class: "money-sm", text: formatMoney(amount, { exact: true }) }),
    ]));
  }
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
  const owed = Number(row.quoted) || Number(row.budget) || 0;
  const paid = Number(row.paid) || 0;
  if (owed && paid >= owed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { className: "due-over", text: `Due date passed${owed ? `, ${formatMoney(owed - paid, { exact: true })} still open` : ""}.` };
  if (days <= 30) return { className: "due-soon", text: days === 0 ? "Due today." : `Due in ${days} days.` };
  return null;
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
