import { planFor } from "./estimate.js";
import { formatMoney, formatPlan } from "./format.js";
import { partySize, SAMPLE_GUESTS, blankGuest, guestCsv, parseGuestPaste, whoMakesTheCut } from "./guest-list.js";
import {
  bindGlobals, clear, el, loadData, mountLocation, readParams, registerSummary, setPrintSummary, setSticky,
  siteHref, storageGet, storageSet, writeParams,
} from "./common.js";
import { bigResult, copySummaryButton, means, nextStep, presetBar, sourceStrip, summaryText } from "./ui.js";

const params = readParams();
const saved = storageGet("guestList", null);
const state = {
  place: null,
  people: Array.isArray(saved?.people) ? saved.people.map((guest) => blankGuest(guest)) : [],
  cap: saved && Number.isFinite(Number(saved.cap)) ? Number(saved.cap) : null,
};
bindGlobals();

const form = document.querySelector("#guest-form");
const capInput = document.querySelector("#cap");
const lists = document.querySelector("#guest-lists");
const out = document.querySelector("#out");
let locationApi = null;
let costs = null;
let seq = state.people.length;

loadData().then((data) => {
  costs = data.costs;
  locationApi = mountLocation(document.querySelector("[data-location]"), {
    data,
    initialId: params.get("loc") || storageGet("loc", ""),
    onChange(place) {
      state.place = place;
      render();
    },
  });
  document.querySelector("#guest-presets")?.append(presetBar([
    { label: "Sample list", id: "sample" },
    { label: "A list only", id: "a" },
    { label: "Clear", id: "clear" },
  ], (preset) => {
    if (preset.id === "clear") {
      if (state.people.length && !window.confirm("Clear every name on this list?")) return;
      state.people = [];
      state.cap = null;
    } else if (preset.id === "a") {
      state.people = SAMPLE_GUESTS.filter((guest) => guest.list === "A").map(copyGuest);
      state.cap = null;
    } else {
      if (state.people.length && !window.confirm("Replace the names with the sample list?")) return;
      state.people = SAMPLE_GUESTS.map(copyGuest);
      state.cap = null;
    }
    render();
  }));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#add-name").value.trim();
    if (!name) return;
    state.people.push(blankGuest({
      id: nextId(),
      name,
      side: document.querySelector("#add-side").value,
      group: document.querySelector("#add-group").value,
      list: document.querySelector("#add-list").value,
      plus: document.querySelector("#add-plus").value,
    }));
    document.querySelector("#add-name").value = "";
    render();
  });
  capInput.addEventListener("input", () => {
    state.cap = Number(capInput.value);
    render();
  });
  document.querySelector("#paste-add").addEventListener("click", () => {
    const added = parseGuestPaste(document.querySelector("#paste").value).map((guest) => ({ ...guest, id: nextId() }));
    state.people.push(...added);
    document.querySelector("#paste").value = "";
    render();
  });
  document.querySelector("#csv-file").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.people.push(...parseGuestPaste(String(reader.result || "")).map((guest) => ({ ...guest, id: nextId() })));
      event.target.value = "";
      render();
    };
    reader.readAsText(file);
  });
  document.querySelector("#export-csv").addEventListener("click", () => {
    const blob = new Blob([`\uFEFF${guestCsv(state.people)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wedding-guests.csv";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
  render();
}).catch(() => {
  clear(out);
  out.append(el("p", { text: "The cost tables didn't load. Refresh the page to try again." }));
});

function render() {
  const seats = state.people.reduce((sum, guest) => sum + partySize(guest), 0);
  const maxCap = Math.max(seats, 1);
  capInput.max = String(maxCap);
  const cap = state.cap == null ? maxCap : Math.min(state.cap, maxCap);
  capInput.value = String(cap);
  const cut = whoMakesTheCut(state.people, state.people.length ? cap : Infinity);
  const note = document.querySelector("#cap-note");
  if (note) {
    note.textContent = state.people.length
      ? `${cut.headcount} seats make the cut. ${cut.waiting.length} ${cut.waiting.length === 1 ? "name is" : "names are"} past it. A is kept before B, then C.`
      : "Everyone on the list fits until you lower the cap.";
  }
  storageSet("guestList", { people: state.people, cap: state.cap });
  const head = state.people.length ? cut.headcount : 0;
  if (head >= 10 && head <= 400) storageSet("guests", head);
  if (state.place) storageSet("loc", state.place.id);
  writeParams({
    loc: state.place && state.place.id !== "national" ? state.place.id : null,
    g: head >= 10 ? head : null,
  });
  paintSummary(cut, head);
  paintPeople(cut);
}

function paintSummary(cut, head) {
  clear(out);
  const place = state.place;
  let perMoney = "$292";
  let perNote = "The Knot's national figure, until this list has names.";
  let verdict = null;
  if (place && costs && head >= 10) {
    const plan = planFor(place, head, costs);
    const total = plan.kind === "range" ? plan.planningTotal : plan.value;
    perMoney = formatMoney(total / plan.guests);
    perNote = `${formatPlan(plan)} divided by ${plan.guests} guests in ${place.shortLabel}.`;
    verdict = { tone: "fits", word: "List", text: `${cut.headcount} seats make the cut in ${place.shortLabel}.` };
  } else if (head > 0 && head < 10) {
    perNote = "The list is under 10 guests, so this stays The Knot's national per-guest figure.";
  }
  const coming = cut.invited.filter((guest) => guest.rsvp !== "no").reduce((sum, guest) => sum + partySize(guest), 0);
  const cards = bigResult([
    { role: "main", kicker: "Per guest", money: perMoney, note: perNote },
    { role: "plain", kicker: "Headcount", money: String(head), note: "Seats who make the cut, including extra seats." },
    { role: "gap", kicker: "Yes or waiting", money: String(state.people.length ? coming : 0), note: "Declined RSVPs stay on the list and still count in the headcount." },
  ]);
  const main = cards.querySelector(".big-card.main .money-sm");
  if (main) main.dataset.total = "1";
  const guestsForLinks = head >= 10 ? head : (Number(storageGet("guests", 117)) || 117);
  const search = new URLSearchParams();
  search.set("g", String(guestsForLinks));
  if (place && place.id) search.set("loc", place.id);
  const venueHref = locationApi
    ? locationApi.venuePath(place, guestsForLinks, storageGet("budget", "") || "")
    : siteHref(`/venues?${search}`);
  const lines = [
    `${head} seats make the cut`,
    `${perMoney} per guest`,
    verdict ? verdict.text : "No place yet.",
  ];
  out.append(el("section", { class: "result", id: "result" }, [
    place ? el("p", {}, [el("span", { class: `tier tier-${place.tier.toLowerCase()}`, text: place.tierLabel })]) : null,
    cards,
    verdict ? el("div", { class: `verdict verdict-${verdict.tone}` }, [el("h3", { text: verdict.word }), el("p", { text: verdict.text })]) : null,
    means(head ? "Per guest is the planning figure divided by the headcount who make the cut. A meal on a row is only a label." : "Add a name and this switches from The Knot's $292 national figure to your place and your list."),
    sourceStrip(),
    el("div", { class: "inline-actions no-print" }, [
      copySummaryButton(() => summaryText("Guest list", lines)),
    ]),
    el("p", { class: "hint", "data-copy-status": "1", "aria-live": "polite" }),
    nextStep(siteHref(`/budget?${search}`), "Split the budget for this headcount"),
    nextStep(venueHref, "Find venues for this headcount"),
  ]));
  setPrintSummary(lines.join(" · "));
  registerSummary(() => summaryText("Guest list", lines));
  setSticky(perMoney, { kicker: "Per guest", label: "Guest list" });
}

function paintPeople(cut) {
  clear(lists);
  if (!state.people.length) {
    lists.append(el("p", { class: "empty-note card", text: "No names yet. Add someone, paste a list, or load the sample." }));
    return;
  }
  const invited = new Set(cut.invited);
  for (const letter of ["A", "B", "C"]) {
    const group = state.people.filter((guest) => guest.list === letter);
    const section = el("section", { class: "card stack" }, [
      el("h2", { text: `${letter} list` }),
    ]);
    if (!group.length) section.append(el("p", { class: "hint", text: "Nobody on this list yet." }));
    for (const guest of group) section.append(row(guest, !invited.has(guest)));
    lists.append(section);
  }
}

function row(guest, past) {
  const card = el("article", { class: `guest-row${past ? " cut-out" : ""}` });
  card.append(field("Name", "text", guest.name, (value) => { guest.name = value; render(); }));
  card.append(selectField("Side", [["a", "Partner A"], ["b", "Partner B"], ["both", "Both"]], guest.side, (value) => { guest.side = value; render(); }));
  card.append(selectField("Group", [["family", "Family"], ["friends", "Friends"], ["work", "Work"], ["party", "Wedding party"]], guest.group, (value) => { guest.group = value; render(); }));
  card.append(selectField("List", [["A", "A"], ["B", "B"], ["C", "C"]], guest.list, (value) => { guest.list = value; render(); }));
  card.append(selectField("RSVP", [["waiting", "Waiting"], ["yes", "Yes"], ["no", "No"]], guest.rsvp, (value) => { guest.rsvp = value; render(); }));
  card.append(field("Meal", "text", guest.meal, (value) => { guest.meal = value; }, "Label only"));
  card.append(field("Extra seats", "number", String(guest.plus || 0), (value) => { guest.plus = value; render(); }));
  const remove = el("button", { type: "button", class: "text-btn", text: "Remove" });
  remove.addEventListener("click", () => {
    state.people = state.people.filter((item) => item !== guest);
    render();
  });
  card.append(remove);
  if (past) card.append(el("p", { class: "hint", text: "Past the cap" }));
  return card;
}

function field(label, type, value, onInput, placeholder = "") {
  const input = el("input", { type, value });
  if (type === "number") input.min = "0";
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener("change", () => onInput(input.value));
  return el("label", { class: "guest-field" }, [el("span", { text: label }), input]);
}

function selectField(label, options, value, onInput) {
  const select = el("select");
  for (const [id, text] of options) {
    const option = el("option", { value: id, text });
    if (id === value) option.selected = true;
    select.append(option);
  }
  select.addEventListener("change", () => onInput(select.value));
  return el("label", { class: "guest-field" }, [el("span", { text: label }), select]);
}

function copyGuest(guest) {
  return { ...guest, id: nextId() };
}

function nextId() {
  seq += 1;
  return `g${seq}`;
}
