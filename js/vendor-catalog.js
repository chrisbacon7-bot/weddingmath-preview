import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VENDOR_CATEGORIES } from "./vendor-math.js";

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/vendors.json");
const catalog = JSON.parse(readFileSync(file, "utf8"));

const BLOCKED = /theknot\.com|weddingwire\.com|zola\.com|thumbtack\.com|yelp\.com|thebash\.com|gigsalad\.com/i;

export const vendorMetros = catalog.metros;
export const vendorCategories = VENDOR_CATEGORIES;

export function acceptVendor(raw) {
  if (!raw || typeof raw.name !== "string" || !raw.name.trim()) return null;
  if (!raw.website || !raw.price || !raw.price.sourceUrl) return null;
  if (BLOCKED.test(raw.website) || BLOCKED.test(raw.price.sourceUrl)) return null;
  if (!VENDOR_CATEGORIES.some((cat) => cat.id === raw.category)) return null;
  if (!raw.id || !raw.metro || !raw.city || !raw.state) return null;
  const published = raw.price.confidence === "published";
  if (published && raw.price.amount == null && raw.price.low == null) return null;
  if (!published && (raw.price.amount != null || raw.price.low != null)) return null;
  return {
    id: String(raw.id),
    name: raw.name.trim(),
    category: raw.category,
    metro: String(raw.metro),
    city: raw.city,
    state: raw.state,
    website: raw.website,
    address: raw.address || `${raw.city}, ${raw.state}`,
    styles: Array.isArray(raw.styles) ? raw.styles.map(String) : [],
    blurb: raw.blurb || "",
    guestMin: Number.isFinite(raw.guestMin) ? raw.guestMin : null,
    guestMax: Number.isFinite(raw.guestMax) ? raw.guestMax : null,
    price: {
      confidence: published ? "published" : "unpublished",
      kind: raw.price.kind || (published ? "starting" : "ask"),
      amount: published && raw.price.amount != null ? Number(raw.price.amount) : null,
      low: published && raw.price.low != null ? Number(raw.price.low) : null,
      high: published && raw.price.high != null ? Number(raw.price.high) : null,
      unit: raw.price.unit || "",
      label: raw.price.label || (published ? "Published price" : "Ask for pricing"),
      note: raw.price.note || "",
      sourceUrl: raw.price.sourceUrl,
      verifiedOn: raw.price.verifiedOn || "2026-10-03",
    },
  };
}

export const vendors = (catalog.vendors || [])
  .map(acceptVendor)
  .filter((vendor) => vendor && vendorMetros.some((metro) => metro.id === vendor.metro))
  .filter((vendor, index, list) => list.findIndex((item) => item.id === vendor.id) === index);

export function vendorsFor(metroId, category) {
  return vendors.filter((vendor) => vendor.metro === metroId && (!category || vendor.category === category));
}

export function vendorById(id) {
  return vendors.find((vendor) => vendor.id === id) || null;
}

export function metroByVendorId(id) {
  return vendorMetros.find((metro) => metro.id === id) || null;
}

export function coverageReport() {
  return vendorMetros.flatMap((metro) => VENDOR_CATEGORIES.map((cat) => {
    const list = vendorsFor(metro.id, cat.id);
    const published = list.filter((vendor) => vendor.price.confidence === "published").length;
    return { metro: metro.name, category: cat.id, count: list.length, published, ask: list.length - published };
  }));
}
