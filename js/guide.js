import { guestCountNote, planFor } from "./estimate.js";
import { guideSnapshot } from "./saving.js";
import {
  bindGlobals, clear, el, emptyNote, loadData, mountLocation, parseMoney, readParams,
  registerSummary, setPrintSummary, setSticky, siteHref, storageGet, storageSet, writeParams,
} from "./common.js";
import { bigResult, copySummaryButton, means, nextStep, presetBar, sourceStrip, summaryText, verdictView } from "./ui.js";

const config = JSON.parse(document.querySelector("#guide-config").textContent);
const params = readParams();
const state = { place: null, guests: Number(params.get("g") || storageGet("guests", 117)) };
bindGlobals();

const form = document.querySelector("#guide-form");
const guestsInput = document.querySelector("#guests");
const quoteInput = document.querySelector("#quote");
const keepInput = document.querySelector("#keep");
const suppliesInput = document.querySelector("#supplies");
const out = document.querySelector("#out");
guestsInput.value = String(state.guests);
if (keepInput) {
  const start = Math.max(10, state.guests - 10);
  keepInput.value = String(start);
  const range = keepInput.closest("[data-stepper]")?.querySelector('input[type="range"]');
  if (range) range.value = String(start);
}

let locationApi = null;

loadData().then((data) => {
  locationApi = mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render(data);
    },
  });
  document.querySelector("#guide-presets")?.append(presetBar(config.presets || [], (preset) => {
    guestsInput.value = String(preset.guests);
    locationApi.choose(preset.loc, preset.loc === "national" ? "Not sure yet" : preset.label);
    render(data);
  }));
  form.addEventListener("input", () => render(data));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await locationApi.commit({ go: false });
    render(data);
    document.querySelector("#result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  render(data);
}).catch(() => {
  clear(out);
  out.append(emptyNote("The cost tables didn't load. Refresh the page to try again."));
});

function render(data) {
  const typed = Number(guestsInput.value);
  state.guests = Number.isFinite(typed) ? typed : 117;
  const planGuests = planFor(state.place || { id: "national", tier: "N" }, state.guests, data.costs).guests;
  storageSet("guests", planGuests);
  if (state.place) storageSet("loc", state.place.id);
  writeParams({
    loc: state.place ? state.place.id : null,
    g: state.guests,
  });
  const note = document.querySelector("#guest-note");
  if (note) note.textContent = guestsInput.dataset.clampedNote || guestCountNote(typed, planGuests);
  clear(out);
  if (!state.place) {
    out.append(emptyNote("Add a ZIP, a city, or choose Not sure yet."));
    setSticky("");
    return;
  }
  const input = {
    quote: quoteInput ? parseMoney(quoteInput.value) : "",
    keep: keepInput ? keepInput.value : "",
    supplies: suppliesInput ? suppliesInput.value.replace(/[$,\s]/g, "") : "",
  };
  const snap = guideSnapshot(config, state.place, state.guests, data.costs, input);
  const search = new URLSearchParams();
  search.set("g", String(planGuests));
  if (state.place.id) search.set("loc", state.place.id);
  const nextHref = config.next.path === "/venues" && locationApi
    ? locationApi.venuePath(state.place, planGuests, "")
    : siteHref(`${config.next.path}?${search}`);
  const result = el("section", { class: "result", id: "result" }, [
    el("p", {}, [el("span", { class: `tier tier-${state.place.tier.toLowerCase()}`, text: state.place.tierLabel })]),
    bigResult(snap.cards),
    verdictView(snap.verdict, ""),
    means(snap.means),
    sourceStrip(),
    el("div", { class: "inline-actions no-print" }, [
      copySummaryButton(() => summaryText(config.title, snap.summaryLines)),
      el("button", { class: "btn-ghost", type: "button", "data-share": "1", text: "Copy link" }),
    ]),
    el("p", { class: "hint", "data-copy-status": "1", "aria-live": "polite" }),
    nextStep(nextHref, config.next.label),
  ]);
  const main = result.querySelector(".big-card.main .money-sm");
  if (main) main.dataset.total = "1";
  out.append(result);
  setPrintSummary(snap.summaryLines.join(" · "));
  registerSummary(() => summaryText(config.title, snap.summaryLines));
  setSticky(snap.sticky, { kicker: snap.cards[0].kicker, label: "See the savings" });
}
