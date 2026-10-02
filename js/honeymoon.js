import {
  bindGlobals, clear, el, formatMoney, loadData, storageGet, track, vacationUrl,
} from "./common.js";

bindGlobals();
track("cta_click", { tool: "honeymoon" });

const trips = [
  ["Maui", "/plan", { dest: "maui" }, "Island days, a rental car, and what they cost."],
  ["Oahu", "/plan", { dest: "oahu" }, "Honolulu and the North Shore, priced as a trip."],
  ["Cancún", "/plan", { dest: "cancun" }, "A beach week with the resort math included."],
  ["Paris", "/plan", { dest: "paris" }, "Flights, a hotel, and daily spending."],
  ["Rome", "/plan", { dest: "rome" }, "The same kind of trip total, for Rome."],
  ["Key West", "/plan", { dest: "key_west" }, "A shorter hop, still with a real total."],
];

loadData().then((data) => {
  const knot = data.costs.honeymoon.knot.value;
  const zola = data.costs.honeymoon.zola.value;
  const share = Math.round(data.costs.honeymoon.knotShare.value * 100);
  const plan = storageGet("plan", null);
  const box = document.querySelector("#honeymoon-figures");
  clear(box);
  box.append(
    el("div", { class: "pair" }, [
      figure("The Knot", formatMoney(knot, { exact: true }), "Average honeymoon in the 2026 study."),
      figure("Zola", formatMoney(zola, { exact: true }), "Average honeymoon in the 2026 cost index."),
    ]),
    el("p", { text: `${share}% of couples in The Knot's study took a honeymoon. These averages sit on top of the wedding. They are not inside the ceremony-and-reception total.` }),
    el("p", { text: `The two studies land ${formatMoney(Math.min(knot, zola), { exact: true })} and ${formatMoney(Math.max(knot, zola), { exact: true })}. We show both. We don't pick a midpoint and call it the cost.` }),
  );
  if (plan && plan.total) {
    box.append(el("p", { text: `Your saved wedding figure is ${formatMoney(plan.total, { exact: true })}${plan.label ? ` for ${plan.label}` : ""}. A honeymoon at these averages would be extra.` }));
  }
  const list = document.querySelector("#trip-links");
  for (const [label, pathname, params, note] of trips) {
    list.append(link(label, vacationUrl(pathname, params), note, params.dest));
  }
  list.append(link("All-inclusive resorts", vacationUrl("/allinclusive"), "One price that already folds in a lot of meals.", "allinclusive"));
  list.append(link("Cruises", vacationUrl("/cruise"), "Fare, drinks, and the extras people forget.", "cruise"));
  list.append(link("How to pay for the trip", vacationUrl("/funding"), "Saving, points, and what a trip fund needs to cover.", "funding"));
}).catch(() => {
  document.querySelector("#honeymoon-figures").textContent = "The honeymoon figures didn't load. Refresh to try again.";
});

function figure(study, money, note) {
  return el("article", {}, [
    el("p", { class: "study", text: study }),
    el("p", { class: "figure", text: money }),
    el("p", { class: "hint", text: note }),
  ]);
}

function link(label, href, note, id) {
  return el("a", { href, target: "_blank", rel: "noopener", "data-handoff": id || label }, [
    el("span", {}, [el("strong", { text: label }), el("br"), el("small", { text: note })]),
    el("span", { text: "Open" }),
  ]);
}
