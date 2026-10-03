import { quoteCalc, budgetLockHref, vendorAppPath } from "./vendor-math.js";
import { formatMoney } from "./format.js";
import {
  bindGlobals, clear, el, emptyNote, loadData, mountLocation, registerSummary, setPrintSummary, setSticky, siteHref, storageGet, storageSet,
} from "./common.js";
import { bigResult, copySummaryButton, means, nextStep, sourceStrip, summaryText, verdictView } from "./ui.js";

bindGlobals();
const config = JSON.parse(document.querySelector("#calc-config").textContent);
const state = { place: null, tier: "typical" };
const form = document.querySelector("#cost-form");
const guestsInput = document.querySelector("#guests");
const out = document.querySelector("#out");
const params = new URLSearchParams(location.search);
if (params.get("g")) guestsInput.value = params.get("g");
else guestsInput.value = String(storageGet("guests", 117) || 117);

form.querySelectorAll("[data-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.choice;
    form.querySelectorAll(`[data-choice="${name}"]`).forEach((item) => item.setAttribute("aria-pressed", "false"));
    button.setAttribute("aria-pressed", "true");
    form.querySelector(`input[name="${name}"]`).value = button.dataset.value;
    render(loaded);
  });
});

const presets = document.querySelector("#cost-presets");
presets.append(el("p", { class: "label", text: "Preset" }));
const chips = el("div", { class: "choices" });
for (const tier of [["budget", "Budget"], ["typical", "Typical"], ["splurge", "Splurge"]]) {
  const button = el("button", { type: "button", text: tier[1], "aria-pressed": tier[0] === "typical" ? "true" : "false" });
  button.addEventListener("click", () => {
    state.tier = tier[0];
    chips.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", "false"));
    button.setAttribute("aria-pressed", "true");
    render(loaded);
  });
  chips.append(button);
}
presets.append(chips, el("p", { class: "hint", text: "Budget and Splurge scale the study lines by The Knot's winter and summer averages. They are not package prices." }));

let loaded = null;
loadData().then((data) => {
  loaded = data;
  mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  form.addEventListener("input", () => render(data));
}).catch(() => {
  clear(out);
  out.append(emptyNote("The cost tables didn't load. Refresh the page."));
});

function readInputs() {
  const inputs = {};
  for (const field of form.elements) {
    if (!field.name || field.type === "submit") continue;
    if (field.type === "checkbox") inputs[field.name] = field.checked ? "on" : "";
    else inputs[field.name] = field.value;
  }
  return inputs;
}

function render(data) {
  if (!data || !state.place) return;
  const guests = Math.min(400, Math.max(10, Math.round(Number(guestsInput.value) || 117)));
  storageSet("guests", guests);
  const quote = quoteCalc(config.slug, {
    place: state.place,
    guests,
    costs: data.costs,
    tier: state.tier,
    inputs: readInputs(),
  });
  const vendorHref = siteHref(vendorAppPath(state.place, quoteVendorCategory(config.slug), data.vendorMetros || []));
  const lockHref = siteHref(budgetLockHref(state.place, guests, quote.locks));
  clear(out);
  const result = el("section", { class: "result", id: "result" }, [
    bigResult([
      { role: "main", kicker: state.tier === "typical" ? "Study lines" : state.tier, money: formatMoney(quote.total, { exact: true }), note: `${guests} guests · ${state.place.shortLabel}` },
      { role: "plain", kicker: "Budget line", money: formatMoney(quote.target, { exact: true }), note: "The matching study lines, before a preset or a quote you typed." },
      { role: "gap", kicker: "Difference", money: formatMoney(quote.total - quote.target, { exact: true }), note: "Your total minus that budget line." },
    ]),
    verdictView(quote.verdict, quote.notes.filter(Boolean)[0] || ""),
    breakdown(quote),
    aside(quote),
    checklist(quote.ask),
    means("The big number is the study lines for this place, plus only the prices you typed. Empty fields are not guessed."),
    sourceStrip(),
    el("div", { class: "inline-actions no-print" }, [
      copySummaryButton(() => summaryText(document.querySelector("h1").textContent, [
        `${state.place.shortLabel} · ${guests} guests · ${state.tier}`,
        formatMoney(quote.total, { exact: true }),
        quote.verdict ? quote.verdict.text : "",
        ...quote.rows.filter((row) => row.amount != null).map((row) => `${row.label}: ${formatMoney(row.amount, { exact: true })}`),
      ])),
      el("a", { class: "btn", href: lockHref, text: "Send to my budget" }),
    ]),
    el("p", { class: "hint", "data-copy-status": "1", "aria-live": "polite" }),
    nextStep(vendorHref, "See local vendors"),
  ]);
  const main = result.querySelector(".big-card.main .money-sm");
  if (main) main.dataset.total = "1";
  out.append(result);
  setPrintSummary(`${state.place.shortLabel} · ${guests} guests · ${formatMoney(quote.total, { exact: true })}`);
  registerSummary(() => summaryText(config.slug, [formatMoney(quote.total, { exact: true })]));
  setSticky(formatMoney(quote.total, { exact: true }), { kicker: "Vendor estimate", label: "See the lines" });
}

function quoteVendorCategory(slug) {
  const map = { catering: "catering", music: "music", photo: "photo", flowers: "florist", cake: "bakery", beauty: "beauty" };
  return map[slug] || "";
}

function breakdown(quote) {
  const table = document.createElement("table");
  table.className = "split-table";
  for (const row of quote.rows) {
    const tr = document.createElement("tr");
    tr.append(cell(row.label), cell(row.amount == null ? "—" : formatMoney(row.amount, { exact: true })));
    const note = document.createElement("td");
    note.textContent = row.note || "";
    tr.append(note);
    table.append(tr);
  }
  const wrap = el("div", { class: "card" }, [el("h2", { text: "Line breakdown" })]);
  wrap.append(table);
  return wrap;
}

function aside(quote) {
  if (!quote.aside.length) return null;
  const box = el("div", { class: "card" }, [el("h2", { text: "Beside it, not in the total" })]);
  for (const row of quote.aside) {
    const range = row.low != null ? ` (${formatMoney(row.low, { exact: true })}–${formatMoney(row.high, { exact: true })})` : "";
    box.append(el("p", { text: `${row.label}: ${formatMoney(row.amount, { exact: true })}${range}. ${row.note}` }));
  }
  return box;
}

function checklist(items) {
  const list = document.createElement("ul");
  list.className = "check-list";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }
  return el("section", { class: "card" }, [el("h2", { text: "What to ask the vendor" }), list]);
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}
