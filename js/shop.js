/**
 * Amazon lists. Prices are recorded only after the product page was opened.
 * AMAZON_TAG lives in site-config.js. An empty tag produces an untagged /dp/ link.
 */

import { SITE } from "./site-config.js";

export const PRICE_CHECKED = "Oct 3, 2026";

export const DISCLOSURE = "Links to Amazon use rel=\"sponsored\". If AMAZON_TAG in the site config is filled in, a purchase can earn a commission. The tag is empty in this build, so each link is a plain amazon.com/dp/ page with no tag. A commission does not change which products are listed, the order, or any wedding total on this site. A price is shown only as “about $X, checked Oct 3, 2026” after that product page was opened. Prices change. A missing price means we did not confirm one.";

export const PRODUCTS = {
  command: {
    asin: "B073XS3CHV",
    title: "Command Medium (10 lb) Picture Hanging Strips, 16 Pairs (32 Strips)",
    price: 12.73,
    checked: PRICE_CHECKED,
    note: "White, damage-free hanging strips. 16 pairs.",
  },
  lights: {
    asin: "B09GVVGDSX",
    title: "Minetom Fairy Lights, Color Changing, 33 ft, 100 LED",
    price: 12.99,
    checked: PRICE_CHECKED,
    note: "USB lights with a remote. The checked price across 33 feet works out to about $0.39 a foot. The page also showed a $14.44 list price.",
  },
  tide: {
    asin: "B0CGL1CNZK",
    title: "Tide To Go Pen, 5 count",
    price: 14.98,
    checked: PRICE_CHECKED,
    note: "Instant stain remover. This is the one-time price on the product page.",
  },
  gibson: {
    asin: "B07CRGSLCL",
    title: "C.R. Gibson Rose Gold Sequin Zippered Bridal Mini Emergency Kit, 24 pc",
    price: 12.63,
    checked: PRICE_CHECKED,
    note: "The page listed 3 safety pins, 4 pieces of 2-inch double-sided tape, 2 hair elastics, 4 earring backs, 1 emery board, 3 bandages, 5 bobby pins, and 2 high-heel savers. It also said the kit was temporarily out of stock.",
  },
  noveread: {
    asin: "B0CP5HXYM2",
    title: "Noveread 100 Sets Wedding Favor Seed Packets, Let Love Grow",
    price: 11.99,
    checked: PRICE_CHECKED,
    count: 100,
    note: "Self-adhesive kraft envelopes, about 2.76 by 3.94 inches. Seeds are not included. The checked price works out to about $0.12 a set.",
  },
  penny: {
    asin: "B0DL54JJKP",
    title: "Penny Wildflower 25 Pack Seed Packet Wedding Favors",
    price: 39.95,
    checked: PRICE_CHECKED,
    count: 25,
    note: "Rustic kraft packets with seeds included. The checked price works out to about $1.60 a packet.",
  },
  bandaid: {
    asin: "B0014CQ7C8",
    title: "BAND-AID Flexible Fabric Adhesive Bandages, assorted sizes, 30 count",
    price: 3.86,
    checked: PRICE_CHECKED,
    count: 30,
    note: "The checked price works out to about $0.13 a bandage across 30.",
  },
};

export const LISTS = [
  {
    slug: "diy-decor",
    path: "/shop/diy-decor",
    title: "DIY decor",
    card: "Hanging strips, string lights, and seed packets with a checked price.",
    lede: "Three products for a room you decorate yourself. The wedding flower and lighting averages stay on the flowers guide. These prices are not a substitute for that study line.",
    ids: ["command", "lights", "penny"],
  },
  {
    slug: "bridal-party",
    path: "/shop/bridal-party",
    title: "Bridal party kit",
    card: "A 24-piece mini kit with the contents listed on the product page.",
    lede: "One kit whose contents were on the product page. Attire averages are on the attire guide. This kit is not a dress, and it is not priced as one.",
    ids: ["gibson"],
  },
  {
    slug: "day-of-kit",
    path: "/shop/day-of-kit",
    title: "Day-of emergency kit",
    card: "Stain pen, bandages, and a bridal mini kit.",
    lede: "Small things that fail on the day. Each price was read off the product page on the date shown.",
    ids: ["tide", "bandaid", "gibson"],
  },
  {
    slug: "favors",
    path: "/shop/favors",
    title: "Favors under $2",
    card: "Only packs whose checked price, divided by the count on the page, is under $2.",
    lede: "A favor lands here only when the checked price divided by the count on the page is under $2. The Knot's favors average is a separate study line, not a target for these packs.",
    ids: ["noveread", "penny"],
  },
  {
    slug: "reception",
    path: "/shop/reception",
    title: "Reception extras",
    card: "Lights, hanging strips, and favor envelopes.",
    lede: "Extras for the room. They are not catering, and they are not subtracted from the food line.",
    ids: ["lights", "command", "noveread"],
  },
  {
    slug: "honeymoon-packing",
    path: "/shop/honeymoon-packing",
    title: "Honeymoon packing",
    card: "A stain pen and bandages, then the trip total on VacationMath.",
    lede: "Packing is not the honeymoon budget. The Knot and Zola honeymoon averages, and a real trip total, stay on VacationMath.",
    ids: ["bandaid", "tide"],
    vacation: true,
  },
];

export function amazonUrl(asin, tag = SITE.AMAZON_TAG) {
  const id = String(asin || "").trim().toUpperCase();
  const base = `https://www.amazon.com/dp/${id}`;
  const clean = String(tag || "").trim();
  if (!clean) return base;
  return `${base}?tag=${encodeURIComponent(clean)}`;
}

export function aboutPrice(amount, checked) {
  if (amount == null || amount === "" || !checked) return "";
  const number = Number(amount);
  if (!Number.isFinite(number)) return "";
  const dollars = number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `about $${dollars}, checked ${checked}`;
}

export function unitPrice(product) {
  if (!product || !Number.isFinite(product.price) || !Number.isFinite(product.count) || product.count <= 0) return null;
  return product.price / product.count;
}

export function listProducts(list) {
  return (list.ids || []).map((id) => PRODUCTS[id]).filter(Boolean);
}
