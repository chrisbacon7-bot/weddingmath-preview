/**
 * Shop pages. Amazon links use AMAZON_TAG from site-config when it is set.
 */

import { escapeHtml } from "./html.js";
import { SITE } from "./site-config.js";
import { DISCLOSURE, LISTS, PRICE_CHECKED, PRODUCTS, aboutPrice, amazonUrl, listProducts } from "./shop.js";

export function shopPages() {
  return [hub(), ...LISTS.map(listPage)];
}

function hub() {
  const priced = Object.values(PRODUCTS).filter((product) => aboutPrice(product.price, product.checked)).length;
  const cards = LISTS.map((list) => `<li class="tool-card card"><a href="${list.path}"><h2>${escapeHtml(list.title)}</h2><p>${escapeHtml(list.card)}</p></a></li>`).join("");
  return page({
    file: "shop.html",
    path: "/shop",
    title: "Wedding shopping lists",
    description: `Curated Amazon lists for decor, a bridal kit, a day-of kit, favors under $2, reception extras, and honeymoon packing. Prices checked ${PRICE_CHECKED} only where the product page was opened.`,
    crumb: "Shop",
    body: `<h1>Wedding shopping lists</h1>
<p class="lede">Six short lists. A price is shown only when that Amazon page was opened.</p>
<section class="result" id="result">
  <div class="big-result">
    <article class="big-card main"><p class="kicker">Prices checked</p><p class="money-sm" data-total="1">${escapeHtml(PRICE_CHECKED)}</p><p class="hint">${priced} products with a confirmed price.</p></article>
    <article class="big-card plain"><p class="kicker">Lists</p><p class="money-sm">${LISTS.length}</p><p class="hint">Decor, kits, favors, reception, packing.</p></article>
    <article class="big-card gap"><p class="kicker">Associates tag</p><p class="money-sm">${SITE.AMAZON_TAG ? "On" : "Off"}</p><p class="hint">${SITE.AMAZON_TAG ? "Links include the tag in site config." : "Links are plain amazon.com/dp/ pages until AMAZON_TAG is set."}</p></article>
  </div>
  <p class="next-step"><span>Next</span> <a class="btn" href="/honeymoon">Honeymoon budget</a></p>
</section>
${disclosure()}
<ul class="cards">${cards}</ul>`,
  });
}

function listPage(list) {
  const products = listProducts(list);
  const cards = products.map((product) => productCard(product)).join("");
  const trip = list.vacation ? `<article class="shop-card card"><h2>Price the trip</h2><p>The Knot and Zola honeymoon averages, then a real trip total, are on VacationMath.</p><p><a href="${escapeHtml(vacationHref())}">Open VacationMath</a></p></article>` : "";
  return page({
    file: `shop/${list.slug}.html`,
    path: list.path,
    title: list.title,
    description: `${list.title}. ${list.card} Prices appear only as about $X, checked ${PRICE_CHECKED}, when the product page was opened.`,
    crumb: list.title,
    body: `<h1>${escapeHtml(list.title)}</h1>
<p class="lede">${escapeHtml(list.lede)}</p>
${disclosure()}
<div class="shop-grid">${cards}${trip}</div>
<p class="next-step"><span>Next</span> <a class="btn" href="/shop">All shopping lists</a></p>`,
  });
}

function page(fields) {
  return {
    ...fields,
    schema: "article",
    wide: true,
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Shop", path: "/shop" },
      ...(fields.path === "/shop" ? [] : [{ name: fields.crumb, path: fields.path }]),
    ],
    faqs: [
      { q: "Are these affiliate links?", a: "They use rel sponsored. If AMAZON_TAG in the site config is filled in, a purchase can earn a commission. The tag is empty until then, so the link is a plain amazon.com/dp/ page. A commission does not change the list or any wedding total." },
      { q: "Why is a price missing?", a: `A price is shown only as about $X, checked ${PRICE_CHECKED}, after that product page was opened. Prices change. A missing price means we did not confirm one.` },
    ],
  };
}

function productCard(product) {
  const price = aboutPrice(product.price, product.checked);
  return `<article class="shop-card card">
  <h2>${escapeHtml(product.title)}</h2>
  <p>${escapeHtml(product.note)}</p>
  ${price ? `<p class="hint" data-shop-price="1">${escapeHtml(price)}</p>` : ""}
  <p><a rel="sponsored nofollow" href="${escapeHtml(amazonUrl(product.asin))}">View on Amazon</a></p>
</article>`;
}

function disclosure() {
  return `<aside class="disclosure"><p>${escapeHtml(DISCLOSURE)}</p><p><a href="/disclosures">How this site makes money</a></p></aside>`;
}

function vacationHref() {
  const url = new URL("/", SITE.vacationMath.endsWith("/") ? SITE.vacationMath : `${SITE.vacationMath}/`);
  url.searchParams.set("utm_source", SITE.utmSource);
  url.searchParams.set("utm_medium", SITE.utmMedium);
  url.searchParams.set("utm_campaign", SITE.utmCampaign);
  return url.toString();
}
