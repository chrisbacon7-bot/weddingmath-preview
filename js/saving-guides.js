/**
 * Money-saving guides. The dollar amounts in the prose are the published
 * category averages. The card on each page is guideSnapshot(), which only
 * uses planFor, the category split, or those same published figures.
 */

import { describe } from "./describe.js";
import { formatMoney } from "./format.js";
import { escapeHtml } from "./html.js";
import { guideSnapshot } from "./saving.js";

const money = (n) => formatMoney(n, { exact: true });

const PRESETS = [
  { label: "Courthouse, 30", guests: 30, loc: "national" },
  { label: "US average, 117", guests: 117, loc: "national" },
  { label: "Chicago, 200", guests: 200, loc: "metro:16980" },
];

export function savingGuideDefs(costs) {
  const cat = (id) => costs.categories.find((row) => row.id === id);
  const zola = (id) => costs.zolaCategories.find((row) => row.id === id);
  const knot = money(costs.national.knotAverage.value);
  const guests = costs.national.knotGuests.value;
  const offLow = costs.hidden.offPeakSavingsLowPct.value;
  const offHigh = costs.hidden.offPeakSavingsHighPct.value;
  const winter = money(costs.seasons.find((season) => season.id === "winter").value);
  const spring = money(costs.seasons.find((season) => season.id === "spring").value);
  const summer = money(costs.seasons.find((season) => season.id === "summer").value);
  const fall = money(costs.seasons.find((season) => season.id === "fall").value);
  const dj = money(cat("dj").amount);
  const band = money(costs.extras.liveBandKnot.value);
  const gap = money(costs.extras.liveBandKnot.value - cat("dj").amount);

  return [
    {
      slug: "save-on-the-venue",
      path: "/guides/save-on-the-venue",
      title: "What a venue line actually is",
      crumb: "Venue",
      card: `The Knot's venue average is ${money(cat("venue").amount)}. The card scales that line to your guest count.`,
      description: `The venue line in a wedding budget, from The Knot's ${money(cat("venue").amount)} average. Compare a quote with the scaled line for your city and guest count.`,
      lede: `The Knot's venue average is ${money(cat("venue").amount)}, among couples who hired a venue. The card is that line after it is scaled into your planning total.`,
      kind: "lines",
      lineIds: ["venue"],
      cardKicker: "Venue line",
      quoteLabel: "Your venue quote",
      means: "This is the venue's share of the planning total, not a price from a venue. Zola's venue average stays off this split.",
      next: { path: "/venues", label: "Find venues at this guest count" },
      faqs: [
        { q: "How much does a wedding venue cost?", a: `The Knot's venue average is ${money(cat("venue").amount)}. Zola's national venue average is ${money(zola("venue").amount)}. The card uses the Knot-shaped line, scaled so the whole budget adds up to the local total. It is not a quote.` },
        { q: "Why doesn't the venue line match the Knot average exactly?", a: `The ${money(cat("venue").amount)} figure is the average among couples who paid a venue. The calculator scales every line so they add up to the planning total. At ${guests} guests nationally, that total is the ${knot} Knot average.` },
      ],
      body: `<p>The Knot's venue average is ${money(cat("venue").amount)}. Zola's national venue average is ${money(zola("venue").amount)}, with a published range of ${money(zola("venue").low)}–${money(zola("venue").high)}. Those two studies are not averaged. The card uses the Knot-shaped split only.</p>
<p>Type a quote to see the dollar gap against that line. A lower quote is not a promise that the rest of the wedding shrinks. The venue pages list prices from each venue's own site when one was published.</p>
<p>The <a href="/venues">venue finder</a> keeps this guest count. A city without a curated list still shows the local study figures, labeled as studies.</p>`,
    },
    {
      slug: "off-peak-wedding-dates",
      path: "/guides/off-peak-wedding-dates",
      title: "Off-peak dates",
      crumb: "Off-peak dates",
      card: `Zola's ${offLow}–${offHigh}% vendor discount, applied to your planning total as a range.`,
      description: `Off-peak wedding dates. Zola says many vendors discount weekday or winter weddings by ${offLow}–${offHigh}%. The card shows what that range would leave of your planning total.`,
      lede: `Zola says weekday or winter dates often run ${offLow}–${offHigh}% less at many vendors. The card applies that published range to your planning total and leaves the total itself unchanged.`,
      kind: "offpeak",
      lineIds: [],
      cardKicker: "Planning total",
      means: "The first number is the planning figure with no discount. The other two cards are Zola's 20–30% range, not a new average and not The Knot's season averages.",
      next: { path: "/budget", label: "Split this total" },
      faqs: [
        { q: "Do off-peak weddings cost less?", a: `Zola says many vendors discount weekday or winter weddings by about ${offLow}–${offHigh}%. That is a vendor discount range, not a new national average. The planning total on the card is not reduced until a contract says so.` },
        { q: "Is that the same as The Knot's season averages?", a: `No. The Knot's national season averages are winter ${winter}, spring ${spring}, summer ${summer}, and fall ${fall}, against ${knot} overall. Those stay separate from Zola's ${offLow}–${offHigh}% discount.` },
      ],
      body: `<p>Zola's cost guide says weekday or winter dates can run ${offLow}–${offHigh}% less at many vendors. The second card is your planning total after that range. The third card is the discount itself. Neither one replaces the planning total.</p>
<p>The Knot publishes different numbers for the season of the wedding: ${winter} for January–March, ${spring} for April–June, ${summer} for July–September, and ${fall} for October–December, against ${knot} overall. Those are national season averages. They are not the same study as Zola's vendor discount, and this page does not blend them.</p>
<p>Ask the venue and the caterer whether the date you want is in their off-peak rate. The <a href="/budget">budget calculator</a> can show the same range beside a category split.</p>`,
    },
    {
      slug: "trim-the-guest-list",
      path: "/guides/trim-the-guest-list",
      title: "Trimming the guest list",
      crumb: "Guest list",
      card: "What a shorter list saves, after the bills that do not shrink.",
      description: `See what trimming a wedding guest list saves. The Knot's national figure is ${money(costs.national.knotPerGuest.value)} a guest. Cutting guests saves less than that, because some bills stay.`,
      lede: `The Knot's national figure is ${money(costs.national.knotPerGuest.value)} a guest. Cutting names saves less than that rate, because the venue, the photographer, and similar bills stay in the model.`,
      kind: "trim",
      lineIds: [],
      cardKicker: "Saved by the shorter list",
      means: "The savings are the difference between two planning figures for the same place. Food and the other per-guest lines change. The venue and the photographer do not.",
      next: { path: "/guests", label: "Sort the guest list" },
      faqs: [
        { q: "How much do we save by cutting guests?", a: `Less than ${money(costs.national.knotPerGuest.value)} times the number of people. That Knot figure is the ${knot} average divided by ${guests} guests. The card uses the same guest-count adjustment as the cost calculator, so fixed bills stay.` },
        { q: "What does not change when the list shrinks?", a: "In this model, the venue, photographer, videographer, music, clothes, planner, and similar fixed lines stay. Food, drinks, cake, rentals, favors, and invitations move with the headcount." },
      ],
      body: `<p>The ${money(costs.national.knotPerGuest.value)} national rate is ${knot} divided by ${guests} guests. It is the whole wedding, not the cost of one plate. Food in The Knot's study averages ${money(cat("catering").amount)} per guest. Drinks average ${money(cat("alcohol").amount)} at ${guests} guests.</p>
<p>Set the shorter list on the card. The savings are the gap between the two planning figures. They are not ${money(costs.national.knotPerGuest.value)} times the number of names you cut.</p>
<p>The <a href="/guests">guest list</a> can mark who is in the first cut, and it carries that headcount into the budget and the venue finder.</p>`,
    },
    {
      slug: "catering-and-bar",
      path: "/guides/catering-and-bar",
      title: "Catering and the bar",
      crumb: "Catering and bar",
      card: `Food is ${money(cat("catering").amount)} a guest in The Knot's study. Drinks and cake are separate lines.`,
      description: `Catering and bar costs from The Knot: food ${money(cat("catering").amount)} a guest, drinks ${money(cat("alcohol").amount)} at ${guests} guests, cake ${money(cat("cake").amount)}. Compare a quote with those lines.`,
      lede: `Food averages ${money(cat("catering").amount)} a guest in The Knot's study. Drinks average ${money(cat("alcohol").amount)} at ${guests} guests, and cake averages ${money(cat("cake").amount)}. The card is those three lines, scaled to your total.`,
      kind: "lines",
      lineIds: ["catering", "alcohol", "cake"],
      cardKicker: "Food, drinks, and cake",
      quoteLabel: "Your catering and bar quote",
      means: "These three lines come from The Knot's vendor averages, scaled into the planning total. Zola's catering and bar averages are not added in.",
      next: { path: "/budget", label: "See the full split" },
      faqs: [
        { q: "How much is wedding catering per guest?", a: `The Knot's catering average is ${money(cat("catering").amount)} per guest. Drinks average ${money(cat("alcohol").amount)} at ${guests} guests, and cake averages ${money(cat("cake").amount)} at the same count. Zola's catering average is ${money(zola("catering").amount)} and the bar average is ${money(zola("bar").amount)}. Those Zola figures stay off this card.` },
        { q: "Does the quote on this page include tax and service?", a: `No. A service charge is often ${costs.hidden.serviceChargeLowPct.value}–${costs.hidden.serviceChargeHighPct.value}% on top of a menu, according to Zola. Add the percents from your contract on the cost-per-guest page. This card does not guess a tax rate.` },
      ],
      body: `<p>The Knot's food average is ${money(cat("catering").amount)} per guest. Drinks average ${money(cat("alcohol").amount)} and cake averages ${money(cat("cake").amount)}, both published at the ${guests}-guest national count and scaled with the headcount here. Zola's catering average is ${money(zola("catering").amount)} and the bar average is ${money(zola("bar").amount)}. They are printed here so you can see them. They are not added to the card.</p>
<p>A menu price is often before the service charge. Zola puts that charge at ${costs.hidden.serviceChargeLowPct.value}–${costs.hidden.serviceChargeHighPct.value}% in the common range. Type those percents on the <a href="/budget/per-guest">cost per guest</a> page. This guide does not invent a sales-tax rate.</p>`,
    },
    {
      slug: "flowers-and-decor",
      path: "/guides/flowers-and-decor",
      title: "Flowers and decor",
      crumb: "Flowers and decor",
      card: `Flowers ${money(cat("flowers").amount)} and lighting ${money(cat("lighting").amount)} in The Knot's study.`,
      description: `Flower and decor costs. The Knot's flower average is ${money(cat("flowers").amount)} and lighting and decor average ${money(cat("lighting").amount)}. Zola's combined average stays separate.`,
      lede: `The Knot's flower average is ${money(cat("flowers").amount)}. Lighting and decor average ${money(cat("lighting").amount)}. The card is those two lines in your split.`,
      kind: "lines",
      lineIds: ["flowers", "lighting"],
      cardKicker: "Flowers and decor",
      quoteLabel: "Your flowers and decor quote",
      means: "The Knot prints flowers and lighting as two averages. Zola groups flowers and decor into one average, which is not mixed into this card.",
      next: { path: "/shop/diy-decor", label: "See decor with a checked price" },
      faqs: [
        { q: "How much do wedding flowers cost?", a: `The Knot's flower average is ${money(cat("flowers").amount)}. Lighting and decor average ${money(cat("lighting").amount)}. Zola's flowers-and-decor average is ${money(zola("flowers").amount)}. The card uses the two Knot lines only.` },
        { q: "Is a DIY decor price included?", a: "No. There is no published price for doing the flowers yourself. The DIY guide on this site waits until you type a supply cost." },
      ],
      body: `<p>Flowers average ${money(cat("flowers").amount)} in The Knot's study. Lighting and decor average ${money(cat("lighting").amount)}. Zola groups flowers and decor at ${money(zola("flowers").amount)}, with a range of ${money(zola("flowers").low)}–${money(zola("flowers").high)}. That Zola figure is not added to the Knot lines.</p>
<p>A shop list can show a product whose page we opened, with the price and the date. That price is not a substitute for the ${money(cat("flowers").amount)} flower average. The <a href="/guides/diy-or-hire">DIY guide</a> compares a supply cost you type with the hired lines.</p>`,
    },
    {
      slug: "photo-and-video",
      path: "/guides/photo-and-video",
      title: "Photo and video",
      crumb: "Photo and video",
      card: `Photographer ${money(cat("photography").amount)}. Videographer ${money(cat("videography").amount)}.`,
      description: `Wedding photo and video costs. The Knot averages ${money(cat("photography").amount)} for photography and ${money(cat("videography").amount)} for video. Zola's averages stay beside them, not blended.`,
      lede: `The Knot's photographer average is ${money(cat("photography").amount)}. Video averages ${money(cat("videography").amount)}. The card is those two lines, scaled into your planning total.`,
      kind: "lines",
      lineIds: ["photography", "videography"],
      cardKicker: "Photo and video",
      quoteLabel: "Your photo and video quote",
      means: "Both lines are fixed in the model. Cutting guests does not shrink them. Zola's photo and video averages are not included in the sum.",
      next: { path: "/budget", label: "Put more of the total here" },
      faqs: [
        { q: "How much is a wedding photographer?", a: `The Knot's photography average is ${money(cat("photography").amount)}. Videography averages ${money(cat("videography").amount)}. Zola's photography average is ${money(zola("photography").amount)} and videography is ${money(zola("videography").amount)}. The card adds the two Knot lines only.` },
        { q: "Do photos cost less with fewer guests?", a: "Not in this model. Photography and video are fixed lines. The guest-list guide shows which lines actually move." },
      ],
      body: `<p>Photography averages ${money(cat("photography").amount)} and videography averages ${money(cat("videography").amount)} in The Knot's study. Zola's photography average is ${money(zola("photography").amount)} and videography is ${money(zola("videography").amount)}. Both pairs are real published averages. Only the Knot pair is in the card, because the budget split follows The Knot's categories.</p>
<p>These lines do not shrink when the guest list does. If photos are the priority, the <a href="/budget">budget calculator</a> can move money toward them without changing the total.</p>`,
    },
    {
      slug: "wedding-attire",
      path: "/guides/wedding-attire",
      title: "Attire",
      crumb: "Attire",
      card: `Dress ${money(cat("dress").amount)}, plus hair and makeup at ${money(cat("hair").amount)} each.`,
      description: `Wedding attire from the studies. The Knot's dress average is ${money(cat("dress").amount)}. Hair and makeup are ${money(cat("hair").amount)} each. Groom's attire was not clear enough to include.`,
      lede: `The Knot's dress average is ${money(cat("dress").amount)}. Hair averages ${money(cat("hair").amount)} and makeup averages ${money(cat("makeup").amount)}, each for one person. The card is those three lines.`,
      kind: "lines",
      lineIds: ["dress", "hair", "makeup"],
      cardKicker: "Dress, hair, and makeup",
      quoteLabel: "Your attire quote",
      means: "Groom's attire was not clear enough in The Knot readout to include. Zola's dress, alterations, tuxedo, and hair-and-makeup figures stay off this card.",
      next: { path: "/shop/bridal-party", label: "See the bridal party kit" },
      faqs: [
        { q: "How much is a wedding dress?", a: `The Knot's dress average is ${money(cat("dress").amount)}. Zola's dress average is ${money(zola("dress").amount)}, and Zola also publishes alterations at ${money(zola("alterations").amount)} and a tuxedo rental at ${money(zola("tux").amount)}. The card is the Knot dress plus hair and makeup.` },
        { q: "Are hair and makeup for the whole party?", a: `The Knot figures used here are ${money(cat("hair").amount)} for hair and ${money(cat("makeup").amount)} for makeup, each described as one person. They are not multiplied by a bridal-party size, because that multiplier is not in the study.` },
      ],
      body: `<p>The dress averages ${money(cat("dress").amount)} in The Knot's study. Hair averages ${money(cat("hair").amount)} and makeup averages ${money(cat("makeup").amount)}. The readout was not clear enough on groom's attire to add a line, so this card does not invent one.</p>
<p>Zola's dress average is ${money(zola("dress").amount)}. Alterations average ${money(zola("alterations").amount)}, a tuxedo rental averages ${money(zola("tux").amount)}, and hair and makeup together average ${money(zola("hair").amount)}. Those stay beside the Knot lines. They are not added in.</p>
<p>A <a href="/shop/bridal-party">bridal party kit</a> on the shop page is a checked product, not a stand-in for the dress average.</p>`,
    },
    {
      slug: "diy-or-hire",
      path: "/guides/diy-or-hire",
      title: "DIY or hire",
      crumb: "DIY or hire",
      card: "The hired lines, and a gap only after you type a supply cost.",
      description: "Compare hired flower, decor, invitation, and favor lines with a supply cost you type. There is no published DIY percentage on this site.",
      lede: "There is no published price for doing the flowers, the paper, or the favors yourself. The card shows the hired lines, and the savings appear only after you type a supply cost.",
      kind: "diy",
      lineIds: ["flowers", "lighting", "invitations", "favors"],
      cardKicker: "Hired lines",
      means: "No DIY percent is applied. The gap is the hired lines minus the supply cost you type. Leave the supply cost blank and the savings stay blank too.",
      next: { path: "/shop/diy-decor", label: "Open the decor list" },
      faqs: [
        { q: "How much do we save by doing it ourselves?", a: "This site does not publish a DIY percentage. Type what the supplies would cost. The card subtracts that number from the hired flower, lighting, invitation, and favor lines. Until you type it, there is no savings figure." },
        { q: "Which hired lines are on the card?", a: `Flowers average ${money(cat("flowers").amount)}, lighting and decor ${money(cat("lighting").amount)}, invitations ${money(cat("invitations").amount)} at ${guests} guests, and favors ${money(cat("favors").amount)} at ${guests} guests, all from The Knot. The card scales those lines into your planning total.` },
      ],
      body: `<p>The hired lines are flowers (${money(cat("flowers").amount)} in The Knot's study), lighting and decor (${money(cat("lighting").amount)}), invitations (${money(cat("invitations").amount)} at ${guests} guests), and favors (${money(cat("favors").amount)} at ${guests} guests). The card scales them into the planning total the same way the budget calculator does.</p>
<p>Nothing in either study prices a homemade version of those lines. The supply box starts empty on purpose. A number appears in the savings card only after you type one.</p>`,
    },
    {
      slug: "dj-or-live-band",
      path: "/guides/dj-or-live-band",
      title: "DJ or live band",
      crumb: "DJ or band",
      card: `DJ ${dj}. Live band ${band}. The published gap is ${gap}.`,
      description: `A wedding DJ averages ${dj} in The Knot's study. A live band averages ${band}. The gap is ${gap}. The band average is not inside the budget split.`,
      lede: `The Knot's DJ average is ${dj}. A live band averages ${band}. The difference is ${gap}. The budget split uses the DJ figure. The band figure is not mixed in.`,
      kind: "band",
      lineIds: ["dj"],
      cardKicker: "Published band minus DJ",
      means: "Both averages are national Knot figures among couples who hired that vendor. The gap is subtraction, not a percentage this site invented. Your local music line is the DJ share of the planning total.",
      next: { path: "/budget", label: "See the music line in the split" },
      faqs: [
        { q: "How much more is a live band than a DJ?", a: `The Knot's live-band average is ${band} and the DJ average is ${dj}. The difference is ${gap}. The band average is not inside the category split. The split uses the DJ average.` },
        { q: `Does the local music line equal ${dj}?`, a: `Nationally, at ${guests} guests, the music line is built from the ${dj} DJ average and then scaled with the other lines so they add up to ${knot}. In another city the dollar amount moves with the local total. The ${band} band average stays a national figure.` },
      ],
      body: `<p>The Knot's reception DJ average is ${dj}. A live band averages ${band}. The card's main number is ${gap}, which is ${band} minus ${dj}. That is the published gap. It is not a local quote, and it is not a percent off the planning total.</p>
<p>The budget split includes the DJ average and leaves the band average out, so the lines are not double-counting music. The verdict also shows the music line in your own split, labeled as that share.</p>`,
    },
  ];
}

export function savingGuidePages(costs, geo) {
  const place = describe("national", { geo, costs });
  const guests = costs.national.knotGuests.value;
  return savingGuideDefs(costs).map((guide) => {
    const snap = guideSnapshot(guide, place, guests, costs, {});
    return {
      file: `guides/${guide.slug}.html`,
      path: guide.path,
      title: guide.title,
      description: guide.description,
      schema: "article",
      sticky: true,
      wide: true,
      script: "/js/guide.js",
      crumbs: [
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
        { name: guide.crumb, path: guide.path },
      ],
      faqs: guide.faqs,
      related: [
        [guide.next.path, guide.next.label, "Uses this guest count."],
        ["/guides", "All guides", "The other money guides and the study explainers."],
        ["/", "Wedding cost calculator", "The planning total for this place."],
        ["/sources", "Sources", "Every figure, with its date."],
      ],
      og: { figure: snap.cards[0].money },
      body: renderGuide(guide, snap),
    };
  });
}

function renderGuide(guide, snap) {
  const quote = guide.kind === "lines" ? `<div>
      <label for="quote">${escapeHtml(guide.quoteLabel)}</label>
      <span class="money-field"><input id="quote" data-money type="text" inputmode="numeric" placeholder="Optional" autocomplete="off"></span>
      <p class="hint">Leave this blank and the card stays on the study line.</p>
    </div>` : "";
  const keep = guide.kind === "trim" ? `<div>
      <label for="keep">Shorter guest list</label>
      <div class="stepper" data-stepper>
        <div class="stepper-row">
          <button type="button" class="step" data-step="-10" aria-label="Ten fewer guests">−</button>
          <input id="keep" type="number" inputmode="numeric" min="10" max="400" value="107">
          <button type="button" class="step" data-step="10" aria-label="Ten more guests">+</button>
        </div>
        <input type="range" min="10" max="400" value="107" aria-label="Shorter guest list">
      </div>
    </div>` : "";
  const supplies = guide.kind === "diy" ? `<div>
      <label for="supplies">Supply cost</label>
      <span class="money-field"><input id="supplies" type="text" inputmode="decimal" placeholder="Type a supply cost" autocomplete="off"></span>
      <p class="hint">There is no published DIY price. The savings stay blank until you type one. Zero is allowed.</p>
    </div>` : "";
  const config = {
    slug: guide.slug,
    title: guide.title,
    kind: guide.kind,
    lineIds: guide.lineIds,
    cardKicker: guide.cardKicker,
    means: guide.means,
    next: guide.next,
    presets: PRESETS,
  };
  return `<h1>${escapeHtml(guide.title)}</h1>
<p class="lede">${escapeHtml(guide.lede)}</p>
<div class="calc-grid">
<form id="guide-form" class="stack calc-inputs">
  <div id="guide-presets"></div>
  <div class="loc card" data-location>
    <label for="where">Where's the wedding?</label>
    <input id="where" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="where-list" placeholder="ZIP code or city">
    <ul id="where-list" class="suggestions" role="listbox" hidden></ul>
    <button type="button" class="text-btn" data-national>Not sure yet</button>
    <p class="loc-status" data-status role="status"></p>
  </div>
  <div class="card form-grid two">
    <div>
      <label for="guests">Guests</label>
      <div class="stepper" data-stepper>
        <div class="stepper-row">
          <button type="button" class="step" data-step="-10" aria-label="Ten fewer guests">−</button>
          <input id="guests" type="number" inputmode="numeric" min="10" max="400" value="117">
          <button type="button" class="step" data-step="10" aria-label="Ten more guests">+</button>
        </div>
        <input type="range" min="10" max="400" value="117" aria-label="Guest count">
      </div>
      <p class="hint" id="guest-note"></p>
    </div>
    ${keep}
  </div>
  ${quote || supplies ? `<div class="card stack">${quote}${supplies}</div>` : ""}
  <button class="btn mobile-scroll-btn" type="submit">See the savings ↓</button>
</form>
<div>
  <div id="out" class="stack" aria-live="polite">${renderSnap(snap)}</div>
</div>
</div>
<article class="guide-copy">
${guide.body}
</article>
<script type="application/json" id="guide-config">${JSON.stringify(config).replace(/</g, "\\u003c")}</script>`;
}

function renderSnap(snap) {
  const cards = snap.cards.map((card) => `<article class="big-card ${card.role}"><p class="kicker">${escapeHtml(card.kicker)}</p><p class="money-sm"${card.role === "main" ? " data-total=\"1\"" : ""}>${escapeHtml(card.money)}</p>${card.note ? `<p class="hint">${escapeHtml(card.note)}</p>` : ""}</article>`).join("");
  const verdict = snap.verdict ? `<div class="verdict verdict-${snap.verdict.tone}"><h3>${escapeHtml(snap.verdict.word)}</h3><p>${escapeHtml(snap.verdict.text)}</p></div>` : "";
  return `<section class="result" id="result"><p><span class="tier tier-n">National figures</span></p><div class="big-result">${cards}</div>${verdict}<div class="means"><h3>What this number means</h3><p>${escapeHtml(snap.means)}</p></div><p class="source-strip"><span class="freshness">2026 studies · reviewed Oct 2026</span> Sourced: The Knot Real Weddings Study (updated July 28, 2026) · Zola (March 6, 2026) · <a href="/sources">Sources</a></p></section>`;
}
