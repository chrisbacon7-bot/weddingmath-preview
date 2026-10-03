import { SITE } from "./site-config.js";
import { describe, describeZip, normalizeQuery, prepareAliases, searchPlaces } from "./describe.js";
import { guestCountNote } from "./estimate.js";
import { venueAppPath } from "./place-nav.js";
import { formatAbout, formatMoney, formatPlan, formatRange } from "./format.js";

const prefix = SITE.storagePrefix;

export async function loadData() {
  const [costs, geo, aliases, extra, venueIndex] = await Promise.all([
    fetch(dataUrl("costs.json")).then(readJson),
    fetch(dataUrl("geo.json")).then(readJson),
    fetch(dataUrl("aliases.json")).then(readJson),
    fetch(dataUrl("extra-aliases.json")).then(readJson).catch(() => []),
    fetch(dataUrl("venue-index.json")).then(readJson).catch(() => ({ metros: [] })),
  ]);
  return {
    costs,
    geo,
    aliases: prepareAliases(mergeAliases(aliases, extra), geo),
    venueIndex,
    ctx: { costs, geo },
  };
}

function mergeAliases(base, extra) {
  const extras = Array.isArray(extra) ? extra : [];
  const seen = new Set();
  const out = [];
  for (const alias of [...extras, ...(Array.isArray(base) ? base : [])]) {
    if (!alias || !alias.q || !alias.id) continue;
    const key = `${alias.q}\0${alias.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

function dataUrl(name) {
  return new URL(`../data/${name}`, import.meta.url);
}

async function readJson(response) {
  if (!response.ok) throw new Error(`Could not load ${response.url}`);
  return response.json();
}

const zipShards = new Map();
export function loadZipShard(prefix) {
  const key = String(prefix || "").slice(0, 3);
  if (key.length < 3) return Promise.resolve({});
  if (!zipShards.has(key)) {
    zipShards.set(key, fetch(dataUrl(`zips/${key}.json`)).then(readJson).catch(() => ({})));
  }
  return zipShards.get(key);
}

export function warmZips(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length >= 3) loadZipShard(digits.slice(0, 3));
}

export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`${prefix}.${key}`);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(`${prefix}.${key}`, JSON.stringify(value));
  } catch {
    /* private mode or a full disk should not block the estimate */
  }
}

/** Root-absolute on the public site. Relative index.html paths in a preview build. */
export function siteHref(appPath) {
  const meta = typeof document !== "undefined" ? document.querySelector('meta[name="wm-root"]') : null;
  if (!meta) return appPath;
  const root = meta.getAttribute("content") || "./";
  const queryAt = appPath.indexOf("?");
  const hashAt = appPath.indexOf("#");
  let cut = appPath.length;
  if (queryAt >= 0) cut = Math.min(cut, queryAt);
  if (hashAt >= 0) cut = Math.min(cut, hashAt);
  const pathname = appPath.slice(0, cut);
  const suffix = appPath.slice(cut);
  if (pathname === "/" || pathname === "") return `${root}index.html${suffix}`;
  return `${root}${pathname.replace(/^\//, "").replace(/\/$/, "")}/index.html${suffix}`;
}

export function readParams() {
  return new URLSearchParams(location.search);
}

export function writeParams(updates) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function setSticky(money, { label = "See my total", href = "#result", kicker = "" } = {}) {
  const bar = document.querySelector("[data-sticky]");
  if (!bar) return;
  const show = Boolean(money);
  bar.hidden = !show;
  document.body.classList.toggle("has-bar", show);
  const amount = bar.querySelector("[data-sticky-money]");
  if (amount) amount.textContent = money || "—";
  const kick = bar.querySelector("[data-sticky-kicker]");
  if (kick && kicker) kick.textContent = kicker;
  const link = bar.querySelector("a");
  if (link) {
    link.href = href;
    link.textContent = label;
  }
}

export function parseMoney(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function track(name, params = {}) {
  if (!SITE.ga4Id || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export function vacationUrl(pathname, params = {}) {
  const url = new URL(pathname, SITE.vacationMath.endsWith("/") ? SITE.vacationMath : `${SITE.vacationMath}/`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("utm_source", SITE.utmSource);
  url.searchParams.set("utm_medium", SITE.utmMedium);
  url.searchParams.set("utm_campaign", SITE.utmCampaign);
  return url.toString();
}

export function readShortlist() {
  const ids = storageGet("shortlist", []);
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
}

export function writeShortlist(ids) {
  storageSet("shortlist", ids.slice(0, 12));
}

export function toggleShortlist(id) {
  const ids = readShortlist();
  const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
  writeShortlist(next);
  return next;
}

export function bindSteppers(scope = document) {
  scope.querySelectorAll("[data-stepper]").forEach((box) => {
    if (box.dataset.bound === "1") return;
    box.dataset.bound = "1";
    const input = box.querySelector('input[type="number"]');
    const range = box.querySelector('input[type="range"]');
    if (!input) return;
    const syncRange = () => {
      if (range) range.value = input.value;
    };
    input.addEventListener("input", syncRange);
    input.addEventListener("blur", () => {
      const min = Number(input.min || 10);
      const max = Number(input.max || 400);
      const typed = Number(input.value);
      const note = input.closest("[data-stepper]")?.parentElement?.querySelector("[data-guest-note], #guest-note");
      if (!input.value.trim()) {
        delete input.dataset.clampedNote;
        return;
      }
      if (!Number.isFinite(typed) || typed < min || typed > max) {
        const used = Math.min(max, Math.max(min, Number.isFinite(typed) ? Math.round(typed) : min));
        input.dataset.clampedNote = `We model ${min}–${max} guests. Showing ${used}.`;
        input.value = String(used);
        input.setAttribute("aria-invalid", "true");
        if (note) note.textContent = input.dataset.clampedNote;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        input.removeAttribute("aria-invalid");
        delete input.dataset.clampedNote;
      }
    });
    if (range) {
      range.addEventListener("input", () => {
        input.value = range.value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    box.querySelectorAll("[data-step]").forEach((button) => {
      button.addEventListener("click", () => {
        const min = Number(input.min || 0);
        const max = Number(input.max || 9999);
        const next = (Number(input.value) || 0) + Number(button.dataset.step);
        input.value = String(Math.min(max, Math.max(min, next)));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
    syncRange();
  });
}

let summaryGetter = () => "";
export function registerSummary(getter) {
  summaryGetter = getter;
}

export function setPrintSummary(text) {
  let node = document.querySelector("[data-print-summary]");
  if (!node) {
    node = document.createElement("p");
    node.className = "print-summary";
    node.dataset.printSummary = "1";
    document.body.prepend(node);
  }
  node.textContent = text;
}

export function bindMoneyFields(root = document) {
  root.querySelectorAll("[data-money]").forEach((input) => {
    if (input.dataset.moneyBound === "1") return;
    input.dataset.moneyBound = "1";
    const paint = () => {
      const parsed = parseMoney(input.value);
      if (parsed == null) return;
      input.value = Math.round(parsed).toLocaleString("en-US");
    };
    input.addEventListener("blur", () => {
      const parsed = parseMoney(input.value);
      if (input.value.trim() && (parsed == null || parsed <= 0)) {
        input.setAttribute("aria-invalid", "true");
        const note = input.parentElement.querySelector("[data-money-note]") || input.nextElementSibling;
        if (note && note.classList.contains("hint")) note.textContent = "Enter an amount above $0.";
        return;
      }
      input.removeAttribute("aria-invalid");
      paint();
    });
    if (input.value) paint();
  });
}

export function bindGlobals() {
  bindSteppers();
  bindMoneyFields();
  document.addEventListener("click", async (event) => {
    const stickyCopy = event.target.closest("[data-sticky-copy]");
    if (stickyCopy) {
      event.preventDefault();
      const text = summaryGetter();
      try { await navigator.clipboard.writeText(text); } catch { /* the page button still copies */ }
      return;
    }
    const share = event.target.closest("[data-share]");
    if (share) {
      event.preventDefault();
      const href = location.href;
      try {
        await navigator.clipboard.writeText(href);
        const previous = share.textContent;
        share.textContent = "Link copied";
        setTimeout(() => { share.textContent = previous; }, 1600);
      } catch {
        share.textContent = "Copy the address bar";
      }
    }
    if (event.target.closest("[data-print]")) {
      event.preventDefault();
      window.print();
    }
    const handoff = event.target.closest("[data-handoff]");
    if (handoff) {
      track("honeymoon_handoff", { destination: handoff.dataset.handoff || handoff.href });
    }
  });
}

export function mountLocation(container, { data, onChange, onCommit, initialId = "", commitOnZip = false, commitOnEnter = false } = {}) {
  const input = container.querySelector("input");
  const list = container.querySelector("[role=listbox]");
  const status = container.querySelector("[data-status]");
  const nationalBtn = container.querySelector("[data-national]");
  let active = -1;
  let request = 0;
  let current = null;
  let matchesCache = [];

  function setStatus(text) {
    if (status) status.textContent = text || "";
  }

  function closeList() {
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function choose(id, label, { commit = false } = {}) {
    input.value = label;
    closeList();
    const place = id === "national" ? describe("national", data.ctx) : describe(id, data.ctx);
    if (!place) {
      setStatus("We couldn't match that place.");
      current = null;
      onChange(null);
      return null;
    }
    current = place;
    setStatus(statusLine(place));
    storageSet("loc", place.id);
    onChange(place);
    if (commit) onCommit?.(place);
    return place;
  }

  async function chooseZip(zip, { commit = false } = {}) {
    const token = ++request;
    setStatus("Checking that ZIP…");
    const zips = await loadZipShard(zip);
    if (token !== request) return null;
    const found = describeZip(zip, zips, data.ctx);
    if (found.error) {
      setStatus("That ZIP isn't in the Census table we use. Try the city, or pick a state.");
      current = null;
      onChange(null);
      return null;
    }
    const place = { ...found.place, zip };
    current = place;
    input.value = `${zip} · ${found.place.shortLabel}`;
    setStatus(statusLine(found.place, zip));
    storageSet("loc", found.place.id);
    storageSet("zip", zip);
    onChange(place);
    if (commit) onCommit?.(place);
    return place;
  }

  function showSuggestions(query) {
    const matches = searchPlaces(query, data.aliases, data.geo);
    matchesCache = matches;
    list.replaceChildren();
    if (!matches.length) {
      closeList();
      setStatus("No match. Try a city name or a 5-digit ZIP.");
      if (current && !remember(current)) {
        current = null;
        onChange(null);
      }
      return;
    }
    setStatus("");
    matches.forEach((match, index) => {
      const button = el("button", { type: "button", role: "option", id: `${input.id}-opt-${index}`, text: match.label });
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => choose(match.id, match.label, { commit: false }));
      list.append(el("li", {}, button));
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    active = -1;
  }

  function remember(place) {
    if (!place) return false;
    const raw = normalizeQuery(input.value);
    if (!raw) return true;
    if (place.zip && input.value.trim().startsWith(place.zip)) return true;
    return raw === normalizeQuery(place.label) || raw === normalizeQuery(place.shortLabel);
  }

  async function commit({ go = false } = {}) {
    const raw = input.value.trim();
    if (/^\d{5}$/.test(raw)) return chooseZip(raw, { commit: go });
    const options = list.hidden ? [] : [...list.querySelectorAll("[role=option]")];
    if (options.length && matchesCache.length) {
      const index = active >= 0 ? active : 0;
      const match = matchesCache[index] || matchesCache[0];
      return choose(match.id, match.label, { commit: go });
    }
    const matches = searchPlaces(raw, data.aliases, data.geo);
    if (matches[0]) return choose(matches[0].id, matches[0].label, { commit: go });
    if (!raw || remember(current)) {
      if (go) onCommit?.(current);
      return current;
    }
    setStatus("No match. Try a city name or a 5-digit ZIP.");
    current = null;
    onChange(null);
    return null;
  }

  input.addEventListener("focus", () => warmZips(input.value));
  input.addEventListener("keydown", () => warmZips(input.value));
  input.addEventListener("input", () => {
    const raw = input.value.trim();
    if (/^\d{5}$/.test(raw)) {
      closeList();
      chooseZip(raw, { commit: commitOnZip });
      return;
    }
    if (/^\d+$/.test(raw)) {
      closeList();
      setStatus(raw.length < 5 ? "Keep typing the 5-digit ZIP." : "");
      return;
    }
    if (normalizeQuery(raw).length < 2) {
      closeList();
      setStatus("");
      return;
    }
    showSuggestions(raw);
  });

  input.addEventListener("keydown", (event) => {
    const options = [...list.querySelectorAll("[role=option]")];
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      active = Math.min(options.length - 1, active + 1);
      mark(options);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      active = Math.max(0, active - 1);
      mark(options);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commit({ go: commitOnEnter });
    } else if (event.key === "Escape") {
      closeList();
    }
  });

  function mark(options) {
    options.forEach((option, index) => option.setAttribute("aria-selected", index === active ? "true" : "false"));
    if (options[active]) {
      input.setAttribute("aria-activedescendant", options[active].id);
      options[active].scrollIntoView({ block: "nearest" });
    }
  }

  if (nationalBtn) {
    nationalBtn.addEventListener("click", () => choose("national", "Not sure yet"));
  }

  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) closeList();
  });

  if (initialId) {
    const zip = storageGet("zip", "");
    const place = describe(initialId, data.ctx);
    if (place) {
      current = place;
      input.value = place.id === "national" ? "Not sure yet" : place.label;
      setStatus(statusLine(place, place.id.startsWith("metro:") ? zip : ""));
      onChange(place);
    }
  } else {
    const place = describe("national", data.ctx);
    current = place;
    setStatus("Showing the US average. Add a ZIP or city for your local number.");
    onChange(place);
  }

  return { choose, commit, input, venuePath(place, guests, budget) {
    return siteHref(venueAppPath(place, guests, budget, data.venueIndex && data.venueIndex.metros));
  } };
}

function statusLine(place, zip) {
  const where = zip ? `${zip}. ` : "";
  return `${where}${place.label}. ${place.tierLabel}.`;
}

export function renderReferences(plan) {
  const wrap = el("div", { class: "pair" });
  const shown = [];
  for (const ref of plan.references) {
    const key = `${ref.study}-${ref.label}-${ref.value || ""}-${ref.low || ""}`;
    if (shown.includes(key)) continue;
    shown.push(key);
    const figure = ref.low != null ? formatRange(ref.low, ref.high).replace("About ", "") : formatMoney(ref.value, { exact: true });
    wrap.append(el("article", {}, [
      el("p", { class: "study", text: ref.study }),
      el("p", { class: "figure", text: figure }),
      el("p", { class: "hint", text: ref.note || ref.label }),
    ]));
  }
  return wrap;
}

export function renderMethod(plan) {
  const details = el("details", { class: "method" }, [
    el("summary", { text: "How we got this" }),
  ]);
  for (const line of plan.lines) details.append(el("p", { text: line }));
  details.append(el("p", {}, [
    el("a", { href: siteHref("/sources"), text: "Sources and dates" }),
  ]));
  return details;
}

export function emptyNote(text) {
  return el("div", { class: "result", id: "result" }, [
    el("p", { text }),
  ]);
}

export function fitNote(tone) {
  if (!tone) return null;
  return el("p", { class: `tone tone-${tone.tone}`, text: tone.text });
}

export function savePlan(planRecord) {
  storageSet("plan", { ...planRecord, savedAt: new Date().toISOString() });
}

export { formatAbout, formatMoney, formatPlan, formatRange, guestCountNote, SITE };
