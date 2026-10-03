import { describe } from "./describe.js";
import { formatMoney } from "./format.js";
import { listedPrice } from "./price-present.js";
import { bindGlobals, clear, el, readShortlist, siteHref, storageGet, storageSet, writeShortlist } from "./common.js";

bindGlobals();
const params = new URLSearchParams(location.search);
const fromUrl = (params.get("v") || "").split(",").filter(Boolean);
let ids = readShortlist();
if (fromUrl.length) {
  const prefix = fromUrl.length <= ids.length && fromUrl.every((id, index) => ids[index] === id);
  if (!prefix) {
    ids = fromUrl.slice(0, 12);
    writeShortlist(ids);
  }
}
const storedGuests = Number(storageGet("guests", 100));
const urlGuests = params.get("g");
let guests = urlGuests == null || urlGuests === "" ? storedGuests : Number(urlGuests);
if (!Number.isFinite(guests) || guests <= 0) guests = Number.isFinite(storedGuests) && storedGuests > 0 ? storedGuests : 100;
guests = Math.min(400, Math.max(10, Math.round(guests)));
storageSet("guests", guests);
const out = document.querySelector("#out");

const file = (name) => fetch(new URL(`../data/${name}`, import.meta.url)).then((response) => response.json());
Promise.all([
  file("venues.json"),
  file("vendors.json").catch(() => ({ vendors: [], metros: [] })),
  file("costs.json"),
  file("geo.json"),
  file("tax.json"),
  file("venue-fees.json"),
])
  .then(([catalog, vendorCatalog, costs, geo, taxTable, fees]) => paint(catalog, vendorCatalog, { costs, geo, taxTable, fees }))
  .catch(() => {
    clear(out);
    out.append(el("p", { class: "error", text: "The saved list didn't load. Refresh the page." }));
  });

function paint(catalog, vendorCatalog = paint.vendors, pricing = paint.pricing) {
  paint.vendors = vendorCatalog || { vendors: [], metros: [] };
  paint.pricing = pricing || paint.pricing || null;
  vendorCatalog = paint.vendors;
  pricing = paint.pricing;
  ids = readShortlist();
  const venueIds = ids.filter((id) => !id.startsWith("vendor:"));
  const vendorIds = ids.filter((id) => id.startsWith("vendor:")).map((id) => id.slice("vendor:".length));
  const chosen = venueIds.map((id) => catalog.venues.find((venue) => venue.id === id)).filter(Boolean);
  const chosenVendors = vendorIds.map((id) => (vendorCatalog.vendors || []).find((vendor) => vendor.id === id)).filter(Boolean);
  clear(out);
  syncUrl();
  if (!chosen.length && !chosenVendors.length) {
    out.append(el("div", { class: "card" }, [
      el("h2", { text: "Nothing saved yet" }),
      el("p", { text: "Tap the heart on a venue or a vendor. They stay in this browser together." }),
      el("a", { class: "btn", href: siteHref("/venues"), "data-find-venues": "1", text: "Find venues" }),
      el("a", { class: "btn", href: siteHref("/vendors"), text: "Find vendors" }),
    ]));
    return;
  }
  if (chosenVendors.length) paintVendors(chosenVendors, vendorCatalog, catalog);
  if (!chosen.length) return;
  const compare = chosen.slice(0, 4);
  const table = document.createElement("table");
  table.className = "compare-table";
  const head = document.createElement("tr");
  head.append(cell("th", ""));
  for (const venue of compare) {
    const th = cell("th", "");
    th.append(el("a", { href: siteHref(pathFor(venue, catalog)), text: venue.name }));
    head.append(th);
  }
  table.append(head);
  row(table, "Saturday, at your guest count", compare.map((venue) => listedFor(venue, "sat", pricing).text));
  row(table, "Off day", compare.map((venue) => listedFor(venue, "off", pricing).text));
  row(table, "Capacity", compare.map((venue) => venue.capacity ? String(venue.capacity) : "Not published"));
  row(table, "Vibe", compare.map((venue) => venue.vibes.join(", ")));
  row(table, "Included", compare.map((venue) => venue.included[0] || ""));
  row(table, "Ask first", compare.map((venue) => venue.questions[0] || ""));
  const wrap = el("div", { class: "table-wrap card compare-table-wrap" });
  wrap.append(table);
  const cards = el("div", { class: "compare-cards" });
  for (const venue of compare) {
    const saturday = listedFor(venue, "sat", pricing);
    const off = listedFor(venue, "off", pricing);
    cards.append(el("article", { class: "card" }, [
      el("h2", {}, [el("a", { href: siteHref(pathFor(venue, catalog)), text: venue.name })]),
      el("p", { class: "money-sm", text: saturday.text }),
      el("p", { class: "hint", text: `${saturday.label} on Saturday at ${guests} guests · Off day ${off.text}` }),
      el("p", { text: `${venue.capacity ? `Up to ${venue.capacity}` : "Capacity not published"} · ${venue.vibes.join(", ")}` }),
      el("p", { text: venue.included[0] || "" }),
      removeButton(venue.id, catalog),
    ]));
  }
  out.append(el("p", { class: "hint", text: `Comparing ${compare.length} of ${chosen.length} saved venues at ${guests} guests.` }));
  out.append(cards);
  out.append(wrap);
  const waiting = chosen.slice(4);
  if (waiting.length) {
    const extra = el("div", { class: "card" }, [
      el("h2", { text: "Saved, not in the table" }),
      el("p", { class: "hint", text: "The table holds four. Move one up, or remove a venue that's already in it." }),
    ]);
    for (const venue of waiting) {
      extra.append(el("p", { class: "inline-actions" }, [
        el("span", { text: venue.name }),
        actionButton("Compare this one", () => moveFirst(venue.id, catalog)),
        removeButton(venue.id, catalog),
      ]));
    }
    out.append(extra);
  }
  const actions = el("div", { class: "stack" });
  for (const venue of compare) {
    const listed = listedFor(venue, "sat", pricing);
    const search = new URLSearchParams({ loc: `metro:${venue.metro}`, g: String(guests), venueName: venue.name });
    if (listed.low != null) search.set("venueTotal", String(listed.low));
    if (listed.high != null && listed.high !== listed.low) search.set("venueHigh", String(listed.high));
    if (listed.basis !== "ask") search.set("venueBasis", listed.basis);
    actions.append(el("a", { href: siteHref(`/budget?${search.toString()}`), text: `Send ${venue.name} to my budget` }));
  }
  out.append(el("div", { class: "card" }, [el("h2", { text: "Use one number" }), actions]));
}

function paintVendors(list, vendorCatalog, catalog) {
  const box = el("div", { class: "card" }, [el("h2", { text: "Saved vendors" })]);
  for (const vendor of list) {
    const metro = (vendorCatalog.metros || []).find((item) => item.id === vendor.metro);
    const href = metro ? `/vendors/${vendor.category}/${metro.stateSlug}/${metro.slug}/${vendor.id}` : "/vendors";
    const price = vendor.price && vendor.price.confidence === "published" && vendor.price.amount != null
      ? formatMoney(vendor.price.amount, { exact: true })
      : "Ask for pricing";
    box.append(el("p", { class: "inline-actions" }, [
      el("a", { href: siteHref(href), text: vendor.name }),
      el("span", { text: price }),
      actionButton("Remove", () => {
        writeShortlist(readShortlist().filter((item) => item !== `vendor:${vendor.id}`));
        paint(catalog, vendorCatalog);
      }),
    ]));
  }
  out.append(box);
}

function moveFirst(id, catalog) {
  const rest = readShortlist().filter((item) => item !== id);
  writeShortlist([id, ...rest]);
  paint(catalog);
}

function removeButton(id, catalog) {
  return actionButton("Remove", () => {
    writeShortlist(readShortlist().filter((item) => item !== id));
    paint(catalog);
  });
}

function actionButton(text, onClick) {
  const button = el("button", { type: "button", class: "text-btn", text });
  button.addEventListener("click", onClick);
  return button;
}

function syncUrl() {
  const share = new URL(location.href);
  const next = new URLSearchParams();
  if (ids.length) next.set("v", ids.join(","));
  next.set("g", String(guests));
  const search = next.toString();
  if (share.search !== `?${search}`) history.replaceState(null, "", `${share.pathname}?${search}`);
}

function pathFor(venue, catalog) {
  const metro = catalog.metros.find((item) => item.id === venue.metro);
  return `/venues/${metro.stateSlug}/${metro.slug}/${venue.id}`;
}

function listedFor(venue, day, pricing) {
  return listedPrice(venue, {
    guests,
    day,
    season: "peak",
    costs: pricing && pricing.costs,
    place: pricing ? describe(`metro:${venue.metro}`, { geo: pricing.geo, costs: pricing.costs }) : null,
    taxTable: pricing && pricing.taxTable,
    fees: pricing && pricing.fees,
  });
}

function textQuote(quote) {
  if (quote.status === "priced") return formatMoney(quote.total, { exact: true });
  if (quote.status === "range") return `${formatMoney(quote.low, { exact: true })}–${formatMoney(quote.high, { exact: true })}`;
  return "Ask the venue";
}

function row(table, label, values) {
  const tr = document.createElement("tr");
  tr.append(cell("th", label));
  for (const value of values) tr.append(cell("td", value));
  table.append(tr);
}

function cell(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
