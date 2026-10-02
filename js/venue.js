import { formatMoney } from "./format.js";
import { quoteVenue } from "./venue-quote.js";
import { bindGlobals, readShortlist, siteHref, toggleShortlist } from "./common.js";

bindGlobals();
const venue = JSON.parse(document.querySelector("#venue-record").textContent);
const guestsInput = document.querySelector("#guests");
const totalEl = document.querySelector("[data-quote-total]");
const labelEl = document.querySelector("[data-quote-label]");
const detailEl = document.querySelector("[data-quote-detail]");
const budgetLink = document.querySelector("[data-budget]");
const saturdayQuote = quoteVenue(venue, 100, "sat");
let day = saturdayQuote.status === "priced" || saturdayQuote.status === "range" ? "sat" : "off";
document.querySelectorAll("[data-day]").forEach((button) => {
  button.setAttribute("aria-pressed", button.dataset.day === day ? "true" : "false");
});

document.querySelectorAll("[data-day]").forEach((button) => {
  button.addEventListener("click", () => {
    day = button.dataset.day;
    document.querySelectorAll("[data-day]").forEach((other) => {
      other.setAttribute("aria-pressed", other === button ? "true" : "false");
    });
    render();
  });
});
guestsInput.addEventListener("input", render);
paintHeart();
render();

function render() {
  const guests = Number(guestsInput.value) || 100;
  const quote = quoteVenue(venue, guests, day);
  labelEl.textContent = quote.label;
  totalEl.textContent = quote.status === "priced"
    ? formatMoney(quote.total, { exact: true })
    : quote.status === "range"
      ? `${formatMoney(quote.low, { exact: true })}–${formatMoney(quote.high, { exact: true })}`
      : "Pricing not published, ask the venue";
  const bits = [`${guests} guests`, day === "sat" ? "Saturday" : "Off day"];
  if (quote.tax) bits.push(`includes ${formatMoney(quote.tax, { exact: true })} tax`);
  if (quote.food) bits.push(`food from ${formatMoney(quote.food, { exact: true })}`);
  if (!quote.includesFood && quote.status === "priced" && quote.label !== "Published event minimum") bits.push("food is extra");
  detailEl.textContent = `${bits.join(" · ")}. ${quote.note}`;
  const params = new URLSearchParams({ loc: `metro:${venue.metro}`, g: String(guests), venueName: venue.name });
  if (quote.total != null) params.set("venueTotal", String(quote.total));
  budgetLink.href = siteHref(`/budget?${params.toString()}`);
}

function paintHeart() {
  const button = document.querySelector("[data-heart]");
  const on = readShortlist().includes(venue.id);
  button.setAttribute("aria-pressed", on ? "true" : "false");
  button.textContent = on ? "Saved" : "Save";
}

document.querySelector("[data-heart]").addEventListener("click", () => {
  toggleShortlist(venue.id);
  paintHeart();
});
