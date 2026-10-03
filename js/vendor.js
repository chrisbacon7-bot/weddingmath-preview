import { localCategoryRange } from "./vendor-math.js";
import { describe } from "./describe.js";
import { formatMoney } from "./format.js";
import { bindGlobals, loadData, readShortlist, toggleShortlist } from "./common.js";

bindGlobals();
const record = JSON.parse(document.querySelector("#vendor-record").textContent);
const button = document.querySelector("[data-heart]");

function paintHeart() {
  if (!button) return;
  const on = readShortlist().includes(button.dataset.heart);
  button.setAttribute("aria-pressed", on ? "true" : "false");
  button.textContent = on ? "Saved" : "Save";
}
button?.addEventListener("click", () => {
  toggleShortlist(button.dataset.heart);
  paintHeart();
});
paintHeart();

loadData().then((data) => {
  const place = describe(`metro:${record.metro}`, data.ctx);
  const range = localCategoryRange(place, 117, data.costs, record.category);
  const node = document.querySelector("#local-range");
  if (node) node.textContent = `Local typical at 117 guests: ${formatMoney(range.amount, { exact: true })}. ${range.note}`;
}).catch(() => {});
