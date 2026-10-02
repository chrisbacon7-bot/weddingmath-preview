import { SITE } from "./site-config.js";
import { describe, describeZip, normalizeQuery, searchPlaces } from "./describe.js";
import { formatAbout, formatMoney, formatPlan, formatRange } from "./format.js";

const prefix = SITE.storagePrefix;

export async function loadData() {
  const [costs, geo, aliases] = await Promise.all([
    fetch(dataUrl("costs.json")).then(readJson),
    fetch(dataUrl("geo.json")).then(readJson),
    fetch(dataUrl("aliases.json")).then(readJson),
  ]);
  return { costs, geo, aliases, ctx: { costs, geo } };
}

function dataUrl(name) {
  return new URL(`../data/${name}`, import.meta.url);
}

async function readJson(response) {
  if (!response.ok) throw new Error(`Could not load ${response.url}`);
  return response.json();
}

let zipPromise = null;
export function loadZips() {
  if (!zipPromise) {
    zipPromise = fetch(dataUrl("zips.json")).then(readJson);
  }
  return zipPromise;
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

export function setSticky(money, { label = "See my total", href = "#result" } = {}) {
  const bar = document.querySelector("[data-sticky]");
  if (!bar) return;
  const show = Boolean(money);
  bar.hidden = !show;
  document.body.classList.toggle("has-bar", show);
  const amount = bar.querySelector("[data-sticky-money]");
  if (amount) amount.textContent = money || "—";
  const link = bar.querySelector("a");
  if (link) {
    link.href = href;
    link.textContent = label;
  }
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

export function bindGlobals() {
  bindSteppers();
  document.addEventListener("click", async (event) => {
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

export function mountLocation(container, { data, onChange, initialId = "" }) {
  const input = container.querySelector("input");
  const list = container.querySelector("[role=listbox]");
  const status = container.querySelector("[data-status]");
  const nationalBtn = container.querySelector("[data-national]");
  let active = -1;
  let request = 0;

  function setStatus(text) {
    if (status) status.textContent = text || "";
  }

  function closeList() {
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    active = -1;
  }

  function choose(id, label) {
    input.value = label;
    closeList();
    const place = id === "national" ? describe("national", data.ctx) : describe(id, data.ctx);
    if (!place) {
      setStatus("We couldn't match that place.");
      onChange(null);
      return;
    }
    setStatus(statusLine(place));
    storageSet("loc", place.id);
    onChange(place);
  }

  async function chooseZip(zip) {
    const token = ++request;
    setStatus("Checking that ZIP…");
    const zips = await loadZips();
    if (token !== request) return;
    const found = describeZip(zip, zips, data.ctx);
    if (found.error) {
      setStatus("That ZIP isn't in the Census table we use. Try the city, or pick a state.");
      onChange(null);
      return;
    }
    input.value = `${zip} · ${found.place.shortLabel}`;
    setStatus(statusLine(found.place, zip));
    storageSet("loc", found.place.id);
    storageSet("zip", zip);
    onChange({ ...found.place, zip });
  }

  function showSuggestions(query) {
    const matches = searchPlaces(query, data.aliases);
    list.replaceChildren();
    if (!matches.length) {
      closeList();
      return;
    }
    matches.forEach((match, index) => {
      const button = el("button", { type: "button", role: "option", id: `${input.id}-opt-${index}`, text: match.label });
      button.addEventListener("click", () => choose(match.id, match.label));
      list.append(el("li", {}, button));
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    active = -1;
  }

  input.addEventListener("input", () => {
    const raw = input.value.trim();
    if (/^\d{5}$/.test(raw)) {
      closeList();
      chooseZip(raw);
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
    } else if (event.key === "Enter" && active >= 0 && options[active]) {
      event.preventDefault();
      options[active].click();
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
      input.value = place.id === "national" ? "Not sure yet" : place.label;
      setStatus(statusLine(place, place.id.startsWith("metro:") ? zip : ""));
      onChange(place);
    }
  }

  return { choose, input };
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

export { formatAbout, formatMoney, formatPlan, formatRange, SITE };
